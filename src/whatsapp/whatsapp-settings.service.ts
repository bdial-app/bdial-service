import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  WhatsAppPhoneMeta,
  WhatsAppRates,
  WhatsAppSettings,
} from '../entities/whatsapp-settings.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { MetaCloudApiService } from './meta-cloud-api.service';
import {
  IST_OFFSET_MINUTES,
  WHATSAPP_DEFAULT_RATES,
} from './whatsapp.constants';
import { UpdateSettingsDto } from './dto/settings.dto';

export interface SettingsJson {
  configured: boolean;
  isTestNumber: boolean;
  apiVersion: string;
  phone: {
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    qualityRating: string | null;
    messagingLimitTier: string | null;
    nameStatus: string | null;
    fetchedAt: string | null;
  } | null;
  dailyCap: number;
  sentLast24h: number;
  uniqueRecipientsLast24h: number;
  ratePerMinute: number;
  sendWindowStart: number;
  sendWindowEnd: number;
  optOutKeywords: string[];
  optInKeywords: string[];
  requireOptInForMarketing: boolean;
  rates: WhatsAppRates;
  webhook: {
    url: string;
    lastEventAt: string | null;
    verifyTokenSet: boolean;
    appSecretSet: boolean;
  };
  env: Record<string, boolean>;
}

@Injectable()
export class WhatsAppSettingsService {
  private readonly logger = new Logger(WhatsAppSettingsService.name);

  constructor(
    @InjectRepository(WhatsAppSettings)
    private readonly settingsRepo: Repository<WhatsAppSettings>,
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    private readonly meta: MetaCloudApiService,
    private readonly config: ConfigService,
  ) {}

  /** The single settings row, created on first access if the migration insert is missing. */
  async getRow(): Promise<WhatsAppSettings> {
    let row = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.settingsRepo.create({
        id: 1,
        rates: { ...WHATSAPP_DEFAULT_RATES },
      });
      row = await this.settingsRepo.save(row);
    }
    if (!row.rates) row.rates = { ...WHATSAPP_DEFAULT_RATES };
    return row;
  }

  async get(): Promise<SettingsJson> {
    return this.toJson(await this.getRow());
  }

  async update(dto: UpdateSettingsDto): Promise<SettingsJson> {
    const row = await this.getRow();
    if (dto.dailyCap !== undefined) row.dailyCap = dto.dailyCap;
    if (dto.ratePerMinute !== undefined) row.ratePerMinute = dto.ratePerMinute;
    if (dto.sendWindowStart !== undefined)
      row.sendWindowStart = dto.sendWindowStart;
    if (dto.sendWindowEnd !== undefined) row.sendWindowEnd = dto.sendWindowEnd;
    if (dto.optOutKeywords)
      row.optOutKeywords = normaliseKeywords(dto.optOutKeywords);
    if (dto.optInKeywords)
      row.optInKeywords = normaliseKeywords(dto.optInKeywords);
    if (dto.requireOptInForMarketing !== undefined)
      row.requireOptInForMarketing = dto.requireOptInForMarketing;
    if (dto.rates) row.rates = { ...row.rates, ...dto.rates };
    await this.settingsRepo.save(row);
    return this.toJson(row);
  }

  async refreshPhoneMeta(): Promise<SettingsJson> {
    this.meta.assertConfigured();
    const row = await this.getRow();
    const meta = await this.meta.getPhoneMeta();
    row.phoneMeta = {
      display_phone_number: meta.display_phone_number ?? null,
      verified_name: meta.verified_name ?? null,
      quality_rating: meta.quality_rating ?? null,
      messaging_limit_tier: meta.messaging_limit_tier ?? null,
      name_status: meta.name_status ?? null,
      code_verification_status: meta.code_verification_status ?? null,
      fetched_at: new Date().toISOString(),
    };
    await this.settingsRepo.save(row);
    return this.toJson(row);
  }

  /** Best-effort refresh used by the hourly cron and quality webhooks. */
  async refreshPhoneMetaQuietly(): Promise<void> {
    if (!this.meta.isConfigured()) return;
    try {
      await this.refreshPhoneMeta();
    } catch (err) {
      this.logger.warn(
        `Phone meta refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async patchPhoneMeta(patch: Partial<WhatsAppPhoneMeta>): Promise<void> {
    const row = await this.getRow();
    row.phoneMeta = { ...(row.phoneMeta ?? {}), ...patch };
    await this.settingsRepo.save(row);
  }

  async touchWebhook(): Promise<void> {
    await this.settingsRepo.update(
      { id: 1 },
      { webhookLastEventAt: new Date() },
    );
  }

  /** `category` is a template category or Meta's pricing category string. */
  rateFor(category: string, rates: WhatsAppRates): number {
    const value = rates[category as keyof WhatsAppRates];
    return typeof value === 'number' ? value : 0;
  }

  webhookUrl(): string {
    const base = (this.config.get<string>('APP_URL') ?? 'http://localhost:3001')
      .trim()
      .replace(/\/+$/, '');
    return `${base}/api/whatsapp/webhook`;
  }

  isTestNumber(meta: WhatsAppPhoneMeta | null): boolean {
    if (!meta) return false;
    const name = (meta.verified_name ?? '').trim();
    const display = (meta.display_phone_number ?? '').replace(/\s+/g, '');
    return (
      !name ||
      name.toLowerCase() === 'test number' ||
      display.startsWith('+1555')
    );
  }

  // ── Send window (IST) ────────────────────────────────────────────────────

  /** Current hour (0-23) in Asia/Kolkata. */
  istHour(now: Date = new Date()): number {
    const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
    return shifted.getUTCHours();
  }

  isWithinSendWindow(row: WhatsAppSettings, now: Date = new Date()): boolean {
    const hour = this.istHour(now);
    const start = row.sendWindowStart;
    const end = row.sendWindowEnd;
    if (start === end) return true; // 24h window
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end; // wraps midnight
  }

  /** Next instant the window opens (IST), as a UTC Date. */
  nextWindowStart(row: WhatsAppSettings, now: Date = new Date()): Date {
    const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
    const candidate = new Date(
      Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
        row.sendWindowStart,
        0,
        0,
        0,
      ),
    );
    if (candidate.getTime() <= shifted.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return new Date(candidate.getTime() - IST_OFFSET_MINUTES * 60_000);
  }

  // ── JSON ─────────────────────────────────────────────────────────────────

  async toJson(row: WhatsAppSettings): Promise<SettingsJson> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await this.messageRepo
      .createQueryBuilder('m')
      .select('COUNT(*)', 'sent')
      .addSelect('COUNT(DISTINCT m.contact_id)', 'unique')
      .where('m.direction = :dir', { dir: 'outbound' })
      .andWhere('m.sent_at > :since', { since })
      .getRawOne<{ sent: string; unique: string }>();

    const meta = row.phoneMeta;
    return {
      configured: this.meta.isConfigured(),
      isTestNumber: this.isTestNumber(meta),
      apiVersion: this.meta.apiVersion,
      phone: meta
        ? {
            displayPhoneNumber: meta.display_phone_number ?? null,
            verifiedName: meta.verified_name ?? null,
            qualityRating: meta.quality_rating ?? null,
            messagingLimitTier: meta.messaging_limit_tier ?? null,
            nameStatus: meta.name_status ?? null,
            fetchedAt: meta.fetched_at ?? null,
          }
        : null,
      dailyCap: row.dailyCap,
      sentLast24h: Number(stats?.sent ?? 0),
      uniqueRecipientsLast24h: Number(stats?.unique ?? 0),
      ratePerMinute: row.ratePerMinute,
      sendWindowStart: row.sendWindowStart,
      sendWindowEnd: row.sendWindowEnd,
      optOutKeywords: row.optOutKeywords ?? [],
      optInKeywords: row.optInKeywords ?? [],
      requireOptInForMarketing: row.requireOptInForMarketing,
      rates: row.rates ?? { ...WHATSAPP_DEFAULT_RATES },
      webhook: {
        url: this.webhookUrl(),
        lastEventAt: row.webhookLastEventAt
          ? row.webhookLastEventAt.toISOString()
          : null,
        verifyTokenSet: this.meta.hasVerifyToken,
        appSecretSet: this.meta.hasAppSecret,
      },
      env: this.meta.envStatus(),
    };
  }
}

function normaliseKeywords(list: string[]): string[] {
  const out = new Set<string>();
  for (const k of list) {
    const v = String(k).trim().toUpperCase();
    if (v) out.add(v);
  }
  return [...out];
}
