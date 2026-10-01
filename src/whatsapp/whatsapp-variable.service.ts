import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  WhatsAppTemplate,
  WhatsAppVariableSource,
} from '../entities/whatsapp-template.entity';
import { WhatsAppVariableMapping } from '../entities/whatsapp-campaign.entity';
import { ResolvedProviderVariables } from './whatsapp.types';
import { WhatsAppTemplateService } from './whatsapp-template.service';

interface ProviderBase {
  id: string;
  brand_name: string;
  city: string | null;
  owner_name: string | null;
}

/**
 * Resolves VariableSource values per provider in batches
 * (one query per source family for the whole campaign).
 */
@Injectable()
export class WhatsAppVariableService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly templates: WhatsAppTemplateService,
  ) {}

  profileUrl(providerId: string): string {
    const base = (this.config.get<string>('APP_URL') ?? 'http://localhost:3001')
      .trim()
      .replace(/\/+$/, '');
    return `${base}/provider-details?id=${providerId}`;
  }

  appDownloadUrl(): string {
    return (
      this.config.get<string>('PLAY_STORE_URL') ??
      'https://play.google.com/store/apps/details?id=com.tijarah.app'
    );
  }

  /** Which sources a campaign needs, so we only run the heavy queries when used. */
  sourcesNeeded(
    mapping: WhatsAppVariableMapping | null | undefined,
    buttonParams: WhatsAppVariableMapping | null | undefined,
  ): Set<WhatsAppVariableSource> {
    const set = new Set<WhatsAppVariableSource>();
    for (const m of [mapping, buttonParams]) {
      if (!m) continue;
      for (const entry of Object.values(m)) {
        if (entry?.source && entry.source !== 'custom') set.add(entry.source);
      }
    }
    return set;
  }

  async resolveForProviders(
    providerIds: string[],
    sources: Set<WhatsAppVariableSource>,
  ): Promise<Map<string, ResolvedProviderVariables>> {
    const out = new Map<string, ResolvedProviderVariables>();
    const ids = [...new Set(providerIds.filter(Boolean))];
    if (!ids.length) return out;

    const base = await this.dataSource.query<ProviderBase[]>(
      `SELECT p.id, p.brand_name, p.city, u.name AS owner_name
         FROM providers p
         LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ANY($1::uuid[])`,
      [ids],
    );
    for (const row of base) {
      out.set(row.id, {
        brand_name: row.brand_name,
        city: row.city ?? '',
        owner_name: row.owner_name ?? row.brand_name,
        profile_url: this.profileUrl(row.id),
        app_download_url: this.appDownloadUrl(),
      });
    }

    if (sources.has('category')) {
      const rows = await this.dataSource.query<
        Array<{ provider_id: string; name: string }>
      >(
        `SELECT DISTINCT ON (pc.provider_id) pc.provider_id, c.name
           FROM provider_categories pc
           JOIN categories c ON c.id = pc.category_id
          WHERE pc.provider_id = ANY($1::uuid[])
          ORDER BY pc.provider_id, c.display_order, c.name`,
        [ids],
      );
      for (const r of rows) {
        const v = out.get(r.provider_id);
        if (v) v.category = r.name;
      }
    }

    if (sources.has('products_count')) {
      const rows = await this.dataSource.query<
        Array<{ provider_id: string; count: string }>
      >(
        `SELECT provider_id, COUNT(*)::text AS count
           FROM products
          WHERE provider_id = ANY($1::uuid[]) AND is_active = true
          GROUP BY provider_id`,
        [ids],
      );
      for (const id of ids) {
        const v = out.get(id);
        if (v) v.products_count = '0';
      }
      for (const r of rows) {
        const v = out.get(r.provider_id);
        if (v) v.products_count = r.count;
      }
    }

    if (sources.has('visits_7d')) {
      const rows = await this.dataSource.query<
        Array<{ provider_id: string; count: string }>
      >(
        `SELECT provider_id, COUNT(*)::text AS count
           FROM provider_analytics_events
          WHERE provider_id = ANY($1::uuid[])
            AND event_type = 'profile_view'
            AND created_at > now() - interval '7 days'
          GROUP BY provider_id`,
        [ids],
      );
      for (const id of ids) {
        const v = out.get(id);
        if (v) v.visits_7d = '0';
      }
      for (const r of rows) {
        const v = out.get(r.provider_id);
        if (v) v.visits_7d = r.count;
      }
    }

    if (sources.has('enquiries_7d')) {
      // Enquiry messages land in conversations where the owner's user is the
      // 'provider' participant.
      const rows = await this.dataSource.query<
        Array<{ provider_id: string; count: string }>
      >(
        `SELECT p.id AS provider_id, COUNT(m.id)::text AS count
           FROM providers p
           JOIN conversation_participants cp ON cp.user_id = p.user_id AND cp.role = 'provider'
           JOIN messages m ON m.conversation_id = cp.conversation_id
          WHERE p.id = ANY($1::uuid[])
            AND m.message_type = 'enquiry'
            AND m.deleted_at IS NULL
            AND m.created_at > now() - interval '7 days'
          GROUP BY p.id`,
        [ids],
      );
      for (const id of ids) {
        const v = out.get(id);
        if (v) v.enquiries_7d = '0';
      }
      for (const r of rows) {
        const v = out.get(r.provider_id);
        if (v) v.enquiries_7d = r.count;
      }
    }

    return out;
  }

  /**
   * Turn a campaign mapping into `{ "1": "Pronttera" }` for one recipient.
   * Falls back to the template's sample when a value cannot be resolved
   * (e.g. a pasted phone with no provider).
   */
  applyMapping(
    mapping: WhatsAppVariableMapping | null | undefined,
    vars: ResolvedProviderVariables | undefined,
    template: WhatsAppTemplate,
  ): Record<string, string> {
    const samples = this.templates.sampleVariables(template);
    const out: Record<string, string> = {};
    const indexes = new Set<string>([
      ...Object.keys(samples),
      ...Object.keys(mapping ?? {}),
    ]);
    for (const key of indexes) {
      const entry = mapping?.[key];
      let value: string | undefined;
      if (entry) {
        value =
          entry.source === 'custom'
            ? entry.value
            : (vars?.[entry.source] ?? undefined);
        if (value === undefined && entry.source !== 'custom') {
          value = this.staticSource(entry.source);
        }
      } else {
        // No mapping: use the template's declared source if it resolves.
        const declared = template.variables?.find(
          (v) => String(v.index) === key && v.location !== 'button',
        );
        if (declared && declared.source !== 'custom') {
          value = vars?.[declared.source] ?? this.staticSource(declared.source);
        }
      }
      out[key] = (value ?? samples[key] ?? '').toString();
    }
    return out;
  }

  /**
   * URL button suffixes keyed by button index. `profile_url` here yields the
   * provider id because the button URL already carries the base path
   * (`…/provider-details?id={{1}}`).
   */
  buttonValues(
    buttonParams: WhatsAppVariableMapping | null | undefined,
    providerId: string | null,
    vars: ResolvedProviderVariables | undefined,
    template: WhatsAppTemplate,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const { index } of this.templates.urlButtonsWithParam(
      template.components,
    )) {
      const entry = buttonParams?.[String(index)];
      let value: string | undefined;
      if (!entry || entry.source === 'profile_url') {
        value = providerId ?? undefined;
      } else if (entry.source === 'custom') {
        value = entry.value;
      } else {
        value = vars?.[entry.source] ?? this.staticSource(entry.source);
      }
      if (value === undefined || value === '') {
        const declared = template.variables?.find(
          (v) => v.location === 'button',
        );
        value = declared?.sample ?? '';
      }
      out[String(index)] = value;
    }
    return out;
  }

  private staticSource(source: WhatsAppVariableSource): string | undefined {
    if (source === 'app_download_url') return this.appDownloadUrl();
    return undefined;
  }
}
