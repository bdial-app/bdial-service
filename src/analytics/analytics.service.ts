import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { ProviderLead, LeadTier } from '../entities/provider-lead.entity';
import { Provider } from '../entities/provider.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';

// ─── Score Weights ──────────────────────────────────────────────────

const SCORE_WEIGHTS: Record<string, number> = {
  chat_initiated: 40,
  call_clicked: 35,
  direction_clicked: 20,
  saved: 15,
  product_view: 8,
  offer_viewed: 5,
  profile_view: 5,
  tab_switched: 3,
  share_clicked: 3,
  review_read: 2,
  photo_viewed: 1,
  search_appearance: 2,
  search_click: 5,
  unsaved: 0,
};

const DURATION_POINTS_PER_15S = 1;
const DURATION_CAP = 15;

function tierFromScore(score: number): LeadTier {
  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 20) return 'soft';
  return 'cold';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(ProviderAnalyticsEvent) private eventRepo: Repository<ProviderAnalyticsEvent>,
    @InjectRepository(ProviderLead) private leadRepo: Repository<ProviderLead>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  // ─── Event Ingestion (bulk, single round-trip) ────────────────────

  async trackEvents(userId: string | null, sessionId: string, events: any[]) {
    const rows = events.map((e) => ({
      providerId: e.providerId,
      userId: userId || null,
      sessionId,
      eventType: e.eventType,
      entityId: e.entityId || null,
      metadata: e.metadata ? (e.metadata as any) : null,
      duration: e.duration ?? null,
      source: e.source || null,
      createdAt: new Date(e.timestamp),
    }));

    await this.eventRepo
      .createQueryBuilder()
      .insert()
      .into(ProviderAnalyticsEvent)
      .values(rows)
      .execute();
  }

  // ─── Search Appearance Tracking (fire-and-forget) ─────────────────

  async trackSearchAppearances(providerIds: string[], userId: string | null, query: string) {
    if (providerIds.length === 0) return;
    const sessionId = 'search-server';
    const now = new Date();
    const rows = providerIds.map((pid) => ({
      providerId: pid,
      userId: userId || null,
      sessionId: 'search-server',
      eventType: 'search_appearance' as const,
      entityId: null,
      metadata: { query } as any,
      duration: null,
      source: 'search' as const,
      createdAt: now,
    }));

    await this.eventRepo
      .createQueryBuilder()
      .insert()
      .into(ProviderAnalyticsEvent)
      .values(rows)
      .execute();
  }

  // ─── Analytics Summary ────────────────────────────────────────────

  async getAnalyticsSummary(userId: string, period: '7d' | '30d' | '90d' = '7d') {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    // Aggregate event counts by type
    const currentCounts = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.event_type', 'eventType')
      .addSelect('COUNT(*)::int', 'count')
      .where('e.provider_id = :pid AND e.created_at >= :since', { pid: provider.id, since })
      .groupBy('e.event_type')
      .getRawMany();

    const prevCounts = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.event_type', 'eventType')
      .addSelect('COUNT(*)::int', 'count')
      .where('e.provider_id = :pid AND e.created_at >= :prevSince AND e.created_at < :since', {
        pid: provider.id,
        prevSince,
        since,
      })
      .groupBy('e.event_type')
      .getRawMany();

    const toMap = (rows: any[]) => {
      const m: Record<string, number> = {};
      rows.forEach((r) => (m[r.eventType] = parseInt(r.count, 10)));
      return m;
    };
    const cur = toMap(currentCounts);
    const prev = toMap(prevCounts);

    const stat = (key: string) => {
      const c = cur[key] || 0;
      const p = prev[key] || 0;
      const trend = p > 0 ? Math.round(((c - p) / p) * 100) : c > 0 ? 100 : 0;
      return { count: c, trend };
    };

    // Daily breakdown for sparkline (current period)
    const dailyRaw = await this.eventRepo
      .createQueryBuilder('e')
      .select("DATE(e.created_at)", 'day')
      .addSelect('e.event_type', 'eventType')
      .addSelect('COUNT(*)::int', 'count')
      .where('e.provider_id = :pid AND e.created_at >= :since', { pid: provider.id, since })
      .groupBy("DATE(e.created_at)")
      .addGroupBy('e.event_type')
      .orderBy('day', 'ASC')
      .getRawMany();

    // Build daily map
    const dailyMap: Record<string, Record<string, number>> = {};
    for (let d = 0; d < days; d++) {
      const dt = new Date(since);
      dt.setDate(dt.getDate() + d);
      dailyMap[dt.toISOString().slice(0, 10)] = {};
    }
    dailyRaw.forEach((r) => {
      const dayKey = new Date(r.day).toISOString().slice(0, 10);
      if (dailyMap[dayKey]) dailyMap[dayKey][r.eventType] = parseInt(r.count, 10);
    });

    const sparkline = (eventType: string) =>
      Object.keys(dailyMap).sort().map((d) => dailyMap[d][eventType] || 0);

    // Lead counts
    const leadCounts = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.tier', 'tier')
      .addSelect('COUNT(*)::int', 'count')
      .where('l.provider_id = :pid AND l.last_seen_at >= :since', { pid: provider.id, since })
      .groupBy('l.tier')
      .getRawMany();

    const leads: Record<string, number> = { hot: 0, warm: 0, soft: 0, cold: 0 };
    leadCounts.forEach((r) => (leads[r.tier] = parseInt(r.count, 10)));

    // Peak hours
    const peakRaw = await this.eventRepo
      .createQueryBuilder('e')
      .select("EXTRACT(HOUR FROM e.created_at)::int", 'hour')
      .addSelect('COUNT(*)::int', 'count')
      .where("e.provider_id = :pid AND e.created_at >= :since AND e.event_type = 'profile_view'", {
        pid: provider.id,
        since,
      })
      .groupBy("EXTRACT(HOUR FROM e.created_at)")
      .getRawMany();

    const peakHours = Array(24).fill(0);
    peakRaw.forEach((r) => (peakHours[r.hour] = parseInt(r.count, 10)));

    // Top products
    const topProducts = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.entity_id', 'productId')
      .addSelect('COUNT(*)::int', 'views')
      .where("e.provider_id = :pid AND e.created_at >= :since AND e.event_type = 'product_view' AND e.entity_id IS NOT NULL", {
        pid: provider.id,
        since,
      })
      .groupBy('e.entity_id')
      .orderBy('views', 'DESC')
      .limit(5)
      .getRawMany();

    // Enrich with product names
    const productIds = topProducts.map((p) => p.productId);
    let productNames: Record<string, string> = {};
    if (productIds.length > 0) {
      const products = await this.productRepo
        .createQueryBuilder('p')
        .select(['p.id', 'p.name'])
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      products.forEach((p) => (productNames[p.id] = p.name));
    }

    const profileViews = stat('profile_view');
    const enquiries = stat('chat_initiated');
    const totalViews = profileViews.count + (cur['product_view'] || 0);
    const conversionRate = totalViews > 0
      ? Math.round(((enquiries.count + (cur['call_clicked'] || 0)) / totalViews) * 100)
      : 0;

    return {
      period,
      profileViews: { ...profileViews, sparkline: sparkline('profile_view') },
      searchAppearances: { ...stat('search_appearance'), sparkline: sparkline('search_appearance') },
      enquiries: { ...enquiries, sparkline: sparkline('chat_initiated') },
      calls: { ...stat('call_clicked'), sparkline: sparkline('call_clicked') },
      directions: stat('direction_clicked'),
      saves: stat('saved'),
      shares: stat('share_clicked'),
      leads,
      conversionRate,
      peakHours,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: productNames[p.productId] || 'Unknown',
        views: parseInt(p.views, 10),
      })),
    };
  }

  // ─── Lead Scoring ─────────────────────────────────────────────────

  async computeLeads(providerId: string, sinceDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    // Get all events for this provider grouped by visitor
    const events = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.provider_id = :pid AND e.created_at >= :since', { pid: providerId, since })
      .orderBy('e.created_at', 'ASC')
      .getMany();

    // Group by visitor key (userId or 'anon:sessionId')
    const visitors = new Map<string, ProviderAnalyticsEvent[]>();
    events.forEach((e) => {
      const key = e.userId || `anon:${e.sessionId}`;
      if (!visitors.has(key)) visitors.set(key, []);
      visitors.get(key)!.push(e);
    });

    for (const [visitorKey, evts] of visitors) {
      const userId = evts[0].userId;
      const sessionId = evts[0].sessionId;
      const source = evts[0].source;

      // Calculate score
      let score = 0;
      const actionsSet = new Set<string>();
      const productsSet = new Set<string>();
      let totalDuration = 0;
      let searchQuery: string | null = null;

      for (const e of evts) {
        const weight = SCORE_WEIGHTS[e.eventType] || 0;
        score += weight;
        actionsSet.add(e.eventType);

        if (e.eventType === 'product_view' && e.entityId) {
          productsSet.add(e.entityId);
        }
        if (e.duration) totalDuration += e.duration;
        if (e.eventType === 'search_appearance' && e.metadata?.query) {
          searchQuery = e.metadata.query;
        }
      }

      // Duration bonus
      score += Math.min(Math.floor(totalDuration / 15) * DURATION_POINTS_PER_15S, DURATION_CAP);
      score = Math.min(score, 100);

      const tier = tierFromScore(score);
      const firstSeenAt = evts[0].createdAt;
      const lastSeenAt = evts[evts.length - 1].createdAt;

      // Upsert lead
      await this.leadRepo
        .createQueryBuilder()
        .insert()
        .into(ProviderLead)
        .values({
          providerId,
          userId,
          sessionId,
          visitorKey,
          tier,
          score,
          source,
          searchQuery,
          productsViewed: Array.from(productsSet),
          actionsPerformed: Array.from(actionsSet),
          totalDuration,
          firstSeenAt,
          lastSeenAt,
        })
        .orUpdate(
          ['tier', 'score', 'source', 'search_query', 'products_viewed', 'actions_performed', 'total_duration', 'last_seen_at'],
          ['provider_id', 'visitor_key'],
        )
        .execute();
    }
  }

  // ─── Leads List ───────────────────────────────────────────────────

  async getLeads(userId: string, tier?: string, page = 1, limit = 20) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Recompute leads for freshness (fire-and-forget on next tick for perf)
    this.computeLeads(provider.id, 30).catch((e) => this.logger.warn('Lead compute failed', e));

    const qb = this.leadRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.user', 'u')
      .where('l.providerId = :pid', { pid: provider.id })
      .orderBy('l.score', 'DESC')
      .addOrderBy('l.lastSeenAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tier) qb.andWhere('l.tier = :tier', { tier });

    const [leads, total] = await qb.getManyAndCount();

    return {
      data: leads.map((l) => this.formatLead(l)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLeadDetail(userId: string, leadId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const lead = await this.leadRepo.findOne({
      where: { id: leadId, providerId: provider.id },
      relations: ['user'],
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Get event timeline for this lead
    const events = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.providerId = :pid', { pid: provider.id })
      .andWhere(lead.userId
        ? 'e.userId = :uid'
        : "e.sessionId = :sid AND e.userId IS NULL",
        lead.userId ? { uid: lead.userId } : { sid: lead.sessionId },
      )
      .orderBy('e.createdAt', 'DESC')
      .limit(50)
      .getMany();

    // Enrich product names
    const productIds = lead.productsViewed.filter(Boolean);
    let productNames: Record<string, string> = {};
    if (productIds.length > 0) {
      const products = await this.productRepo
        .createQueryBuilder('p')
        .select(['p.id', 'p.name'])
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      products.forEach((p) => (productNames[p.id] = p.name));
    }

    return {
      ...this.formatLead(lead),
      timeline: events.map((e) => ({
        eventType: e.eventType,
        entityId: e.entityId,
        metadata: e.metadata,
        duration: e.duration,
        source: e.source,
        createdAt: e.createdAt,
      })),
      products: productIds.map((id) => ({ id, name: productNames[id] || 'Unknown' })),
    };
  }

  async unlockLead(userId: string, leadId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const lead = await this.leadRepo.findOneBy({ id: leadId, providerId: provider.id });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.isUnlocked) throw new BadRequestException('Lead already unlocked');

    // Payment is now handled by PaymentModule via POST /api/payments/lead-unlock/checkout
    // This endpoint is kept for backward compatibility but requires payment flow
    return {
      unlocked: false,
      message: 'Use POST /api/payments/lead-unlock/checkout to unlock leads with payment',
    };
  }

  // ─── Top Products ─────────────────────────────────────────────────

  async getTopProducts(userId: string, period: '7d' | '30d' | '90d' = '7d') {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const raw = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.entity_id', 'productId')
      .addSelect('COUNT(*)::int', 'views')
      .addSelect("COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))", 'uniqueVisitors')
      .where("e.provider_id = :pid AND e.created_at >= :since AND e.event_type = 'product_view' AND e.entity_id IS NOT NULL", {
        pid: provider.id,
        since,
      })
      .groupBy('e.entity_id')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();

    const productIds = raw.map((r) => r.productId);
    let products: Record<string, { name: string; photoUrl: string | null; price: number | null }> = {};
    if (productIds.length > 0) {
      const prods = await this.productRepo
        .createQueryBuilder('p')
        .select(['p.id', 'p.name', 'p.photoUrl', 'p.price'])
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      prods.forEach((p) => (products[p.id] = { name: p.name, photoUrl: p.photoUrl, price: p.price }));
    }

    return raw.map((r) => ({
      productId: r.productId,
      name: products[r.productId]?.name || 'Unknown',
      photoUrl: products[r.productId]?.photoUrl || null,
      price: products[r.productId]?.price || null,
      views: parseInt(r.views, 10),
      uniqueVisitors: parseInt(r.uniqueVisitors, 10),
    }));
  }

  // ─── Peak Hours ───────────────────────────────────────────────────

  async getPeakHours(userId: string, period: '7d' | '30d' | '90d' = '7d') {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const raw = await this.eventRepo
      .createQueryBuilder('e')
      .select("EXTRACT(HOUR FROM e.created_at)::int", 'hour')
      .addSelect('COUNT(*)::int', 'count')
      .where("e.provider_id = :pid AND e.created_at >= :since AND e.event_type IN ('profile_view', 'product_view')", {
        pid: provider.id,
        since,
      })
      .groupBy("EXTRACT(HOUR FROM e.created_at)")
      .getRawMany();

    const hours = Array(24).fill(0);
    raw.forEach((r) => (hours[r.hour] = parseInt(r.count, 10)));
    return hours;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private formatLead(lead: ProviderLead) {
    const isLocked = !lead.isUnlocked;
    const user = lead.user;

    return {
      id: lead.id,
      tier: lead.tier,
      score: lead.score,
      source: lead.source,
      searchQuery: lead.searchQuery,
      productsViewed: lead.productsViewed,
      actionsPerformed: lead.actionsPerformed,
      totalDuration: lead.totalDuration,
      firstSeenAt: lead.firstSeenAt,
      lastSeenAt: lead.lastSeenAt,
      isUnlocked: lead.isUnlocked,
      // Masked data for locked leads
      visitor: isLocked
        ? {
            name: user ? this.maskName(user.name || 'Anonymous') : 'Anonymous Visitor',
            avatar: null,
            userId: null,
          }
        : {
            name: user?.name || 'Anonymous Visitor',
            avatar: null,
            userId: lead.userId,
          },
    };
  }

  private maskName(name: string): string {
    const parts = name.split(' ');
    return parts
      .map((p) => (p.length <= 1 ? p : p[0] + '***' + (p.length > 2 ? p[p.length - 1] : '')))
      .join(' ');
  }
}
