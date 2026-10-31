import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type PushAudienceKind =
  | 'everyone'
  | 'businesses'
  | 'customers'
  | 'people';
export type PushPlatform = 'android' | 'ios' | 'web';

/** Who a push campaign goes to. Stored on the batch, so a scheduled send resolves it fresh. */
export interface PushAudience {
  kind: PushAudienceKind;
  cities?: string[];
  /** Businesses in these categories; customers who said they're interested in them. */
  categoryIds?: string[];
  platforms?: PushPlatform[];
  joinedWithinDays?: number;
  activeWithinDays?: number;
  inactiveDays?: number;
  /** Businesses only. */
  womenLed?: boolean;
  paidPlan?: 'yes' | 'no';
  noProducts?: boolean;
  /** kind 'people': these accounts, and the owners of these businesses. */
  userIds?: string[];
  providerIds?: string[];
}

export interface PushRecipient {
  userId: string;
  kind: 'business' | 'customer';
  name: string | null;
  city: string | null;
  providerId: string | null;
  businessName: string | null;
}

export interface PushAudiencePreview {
  total: number;
  businesses: number;
  customers: number;
  /** Turned pushes (or this kind of push) off: they get it in the app's inbox only. */
  pushOff: number;
  /** Matched, but no phone with the app signed in: inbox only. Only for picked people. */
  noDevice: number;
  platforms: Record<PushPlatform, number>;
  sample: PushRecipient[];
}

interface Row {
  user_id: string;
  name: string | null;
  city: string | null;
  provider_id: string | null;
  brand_name: string | null;
}

/**
 * Push audiences: people who have Tijarah on a phone and are signed in (an
 * active device token), narrowed by who they are and what they do. Picked
 * people are included whether or not they have a phone signed in; they still
 * get the message in the app's inbox.
 */
@Injectable()
export class PushAudienceService {
  constructor(private readonly dataSource: DataSource) {}

  async resolve(a: PushAudience): Promise<PushRecipient[]> {
    const params: unknown[] = [];
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const where: string[] = [`u.status = 'active'`];
    const people = a.kind === 'people';

    if (people) {
      const userIds = a.userIds ?? [];
      const providerIds = a.providerIds ?? [];
      if (!userIds.length && !providerIds.length) return [];
      where.push(
        `(u.id = ANY(${p(userIds)}::uuid[]) OR u.id IN (SELECT pp.user_id FROM providers pp WHERE pp.id = ANY(${p(providerIds)}::uuid[]) AND pp.deleted_at IS NULL))`,
      );
    } else {
      const platformCheck = a.platforms?.length
        ? ` AND dt.platform::text = ANY(${p(a.platforms)}::text[])`
        : '';
      where.push(
        `EXISTS (SELECT 1 FROM device_tokens dt WHERE dt.user_id = u.id AND dt.is_active = true${platformCheck})`,
      );
      if (a.kind === 'businesses') where.push('b.id IS NOT NULL');
      if (a.kind === 'customers') where.push('b.id IS NULL');
      if (a.cities?.length) {
        where.push(
          `LOWER(TRIM(COALESCE(b.city, u.city))) = ANY(${p(a.cities.map((c) => c.trim().toLowerCase()))}::text[])`,
        );
      }
      if (a.categoryIds?.length) {
        const cats = p(a.categoryIds);
        where.push(
          `((b.id IS NOT NULL AND EXISTS (SELECT 1 FROM provider_categories pc WHERE pc.provider_id = b.id AND pc.category_id = ANY(${cats}::uuid[])))` +
            ` OR (b.id IS NULL AND u.preferred_category_ids && ${cats}::uuid[]))`,
        );
      }
      if (a.joinedWithinDays)
        where.push(
          `u.created_at >= now() - make_interval(days => ${p(a.joinedWithinDays)}::int)`,
        );
      if (a.activeWithinDays)
        where.push(
          `u.last_seen_at >= now() - make_interval(days => ${p(a.activeWithinDays)}::int)`,
        );
      if (a.inactiveDays) {
        where.push(
          `(u.last_seen_at IS NULL OR u.last_seen_at < now() - make_interval(days => ${p(a.inactiveDays)}::int))`,
        );
      }
      if (a.kind === 'businesses') {
        if (a.womenLed) where.push('b.is_women_led = true');
        const paid = `EXISTS (SELECT 1 FROM subscriptions s WHERE s.provider_id = b.id AND s.status::text IN ('active','trialing'))`;
        if (a.paidPlan === 'yes') where.push(paid);
        if (a.paidPlan === 'no') where.push(`NOT ${paid}`);
        if (a.noProducts)
          where.push(
            'NOT EXISTS (SELECT 1 FROM products pr WHERE pr.provider_id = b.id)',
          );
      }
    }

    const rows: Row[] = await this.dataSource.query(
      `SELECT u.id AS user_id, u.name, COALESCE(b.city, u.city) AS city, b.id AS provider_id, b.brand_name
         FROM users u
         LEFT JOIN LATERAL (
           SELECT pr.id, pr.brand_name, pr.city, pr.is_women_led
             FROM providers pr
            WHERE pr.user_id = u.id AND pr.deleted_at IS NULL
            ORDER BY pr.created_at ASC
            LIMIT 1
         ) b ON true
        WHERE ${where.join(' AND ')}
        ORDER BY u.created_at ASC`,
      params,
    );
    return rows.map((r) => ({
      userId: r.user_id,
      kind: r.provider_id ? 'business' : 'customer',
      name: r.name,
      city: r.city,
      providerId: r.provider_id,
      businessName: r.brand_name,
    }));
  }

  async preview(
    a: PushAudience,
    promotional: boolean,
  ): Promise<PushAudiencePreview> {
    const list = await this.resolve(a);
    const ids = list.map((r) => r.userId);
    const platforms: Record<PushPlatform, number> = {
      android: 0,
      ios: 0,
      web: 0,
    };
    let pushOff = 0;
    let withDevice = ids.length;
    if (ids.length) {
      const perPlatform: { platform: PushPlatform; n: string }[] =
        await this.dataSource.query(
          `SELECT platform::text AS platform, COUNT(DISTINCT user_id) AS n
           FROM device_tokens WHERE is_active = true AND user_id = ANY($1::uuid[])
          GROUP BY 1`,
          [ids],
        );
      for (const r of perPlatform)
        if (r.platform in platforms) platforms[r.platform] = Number(r.n);
      const [off] = await this.dataSource.query(
        `SELECT COUNT(*) AS n FROM notification_preferences
          WHERE user_id = ANY($1::uuid[]) AND (push_enabled = false${promotional ? ' OR promotional = false' : ' OR system_announcements = false'})`,
        [ids],
      );
      pushOff = Number(off?.n ?? 0);
      if (a.kind === 'people') {
        const [dev] = await this.dataSource.query(
          `SELECT COUNT(DISTINCT user_id) AS n FROM device_tokens WHERE is_active = true AND user_id = ANY($1::uuid[])`,
          [ids],
        );
        withDevice = Number(dev?.n ?? 0);
      }
    }
    return {
      total: list.length,
      businesses: list.filter((r) => r.kind === 'business').length,
      customers: list.filter((r) => r.kind === 'customer').length,
      pushOff,
      noDevice: list.length - withDevice,
      platforms,
      sample: list.slice(0, 6),
    };
  }

  /** Cities people with the app live in, busiest first, and the top-level categories. */
  async options(): Promise<{
    cities: { name: string; count: number }[];
    categories: { id: string; name: string }[];
  }> {
    const cities: { name: string; count: string }[] =
      await this.dataSource.query(
        `SELECT INITCAP(LOWER(TRIM(COALESCE(b.city, u.city)))) AS name, COUNT(DISTINCT u.id) AS count
         FROM users u
         JOIN device_tokens dt ON dt.user_id = u.id AND dt.is_active = true
         LEFT JOIN providers b ON b.user_id = u.id AND b.deleted_at IS NULL
        WHERE u.status = 'active' AND COALESCE(b.city, u.city) IS NOT NULL AND TRIM(COALESCE(b.city, u.city)) <> ''
        GROUP BY 1 ORDER BY 2 DESC LIMIT 100`,
      );
    const categories: { id: string; name: string }[] =
      await this.dataSource.query(
        `SELECT id, name FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY name`,
      );
    return {
      cities: cities.map((c) => ({ name: c.name, count: Number(c.count) })),
      categories,
    };
  }
}
