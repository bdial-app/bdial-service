import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

export interface LeadPack {
  id: string;
  price: number;
  bonusPct: number;
  popular?: boolean;
  appleProductId?: string;
}

type Tier = 'hot' | 'warm' | 'soft' | 'cold';
const TIER_ORDER: Record<Tier, number> = { hot: 0, warm: 1, soft: 2, cold: 3 };
const DEFAULT_PRICES: Record<string, number> = {
  hot: 99,
  warm: 69,
  soft: 49,
  cold: 29,
  hot_discounted: 49,
  warm_discounted: 35,
  soft_discounted: 25,
  cold_discounted: 15,
};
const DEFAULT_PACKS: LeadPack[] = [
  { id: 'starter', price: 499, bonusPct: 10 },
  { id: 'popular', price: 999, bonusPct: 20, popular: true },
  { id: 'best', price: 2499, bonusPct: 30 },
];

interface LeadRow {
  id: string;
  tier: Tier | null;
  user_id: string | null;
  is_unlocked: boolean;
}

/** How a set of leads gets unlocked: free credits first (on the best leads), the rest from the wallet. */
interface Plan {
  free: {
    lead: LeadRow;
    method: 'free' | 'subscription_credit' | 'free_quota';
  }[];
  paid: { lead: LeadRow; price: number }[];
  total: number;
  /** Free-quota and plan credits the plan uses. */
  freeQuotaUsed: number;
  planCreditsUsed: number;
}

/**
 * Lead Wallet: a business tops up with a bonus and spends the balance on lead
 * contacts, one or many at a time. Balance never expires. Every change is a
 * row in lead_wallet_transactions.
 */
@Injectable()
export class LeadWalletService {
  private readonly logger = new Logger(LeadWalletService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationDispatch: NotificationDispatchService,
  ) {}

  // ─── Settings ─────────────────────────────────────────────────────

  private async setting(key: string, fallback: string): Promise<string> {
    const [r] = await this.dataSource.query(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    return (r?.value as string | undefined) ?? fallback;
  }

  private async num(key: string, fallback: number): Promise<number> {
    const n = parseFloat(await this.setting(key, String(fallback)));
    return Number.isFinite(n) ? n : fallback;
  }

  async packs(): Promise<LeadPack[]> {
    try {
      const parsed = JSON.parse(await this.setting('lead_packs', ''));
      if (Array.isArray(parsed) && parsed.length) return parsed as LeadPack[];
    } catch {
      /* fall back to the defaults */
    }
    return DEFAULT_PACKS;
  }

  async enabled(): Promise<boolean> {
    const [wallet, leads] = await Promise.all([
      this.setting('lead_wallet_enabled', 'true'),
      this.setting('leads_monetization_enabled', 'false'),
    ]);
    return wallet === 'true' && leads === 'true';
  }

  private async context(userId: string) {
    const [p] = await this.dataSource.query(
      `SELECT p.id, p.user_id, p.brand_name, p.women_led_status, p.free_leads_used_this_month, p.free_leads_reset_at,
              s.id AS sub_id, s.lead_unlocks_used, pl.slug AS plan_slug, pl.monthly_lead_unlocks
         FROM providers p
         LEFT JOIN subscriptions s ON s.provider_id = p.id AND s.status = 'active'
         LEFT JOIN subscription_plans pl ON pl.id = s.plan_id
        WHERE p.user_id = $1
        LIMIT 1`,
      [userId],
    );
    if (!p) throw new NotFoundException('Business not found');
    return p as {
      id: string;
      user_id: string;
      brand_name: string;
      women_led_status: string;
      free_leads_used_this_month: number;
      free_leads_reset_at: Date | null;
      sub_id: string | null;
      lead_unlocks_used: number | null;
      plan_slug: string | null;
      monthly_lead_unlocks: number | null;
    };
  }

  /** What one lead costs this business (Growth pays the discounted price). */
  async leadPrice(tier: Tier | null, growth: boolean): Promise<number> {
    const t = tier || 'cold';
    const key = growth ? `${t}_discounted` : t;
    return this.num(`lead_price_${key}`, DEFAULT_PRICES[key] ?? 49);
  }

  /** What a pack puts in the wallet for this business. */
  private async packCredit(
    pack: LeadPack,
    growth: boolean,
    firstTopup: boolean,
  ) {
    const extraPct = growth
      ? await this.num('lead_growth_extra_bonus_pct', 10)
      : 0;
    const bonus = Math.round((pack.price * (pack.bonusPct + extraPct)) / 100);
    const firstBonus = firstTopup
      ? await this.num('lead_first_topup_bonus', 100)
      : 0;
    return {
      bonus,
      firstBonus,
      credit: pack.price + bonus + firstBonus,
      bonusPct: pack.bonusPct + extraPct,
    };
  }

  private async balanceOf(
    providerId: string,
    m: EntityManager | DataSource = this.dataSource,
  ) {
    const [w] = await m.query(
      `SELECT balance, lifetime_topped_up FROM lead_wallets WHERE provider_id = $1`,
      [providerId],
    );
    return {
      balance: Number(w?.balance ?? 0),
      toppedUp: Number(w?.lifetime_topped_up ?? 0),
    };
  }

  // ─── Summary ──────────────────────────────────────────────────────

  async getWallet(userId: string) {
    const ctx = await this.context(userId);
    const growth = ctx.plan_slug === 'growth';
    const [{ balance, toppedUp }, packs, hotPrice, tx] = await Promise.all([
      this.balanceOf(ctx.id),
      this.packs(),
      this.leadPrice('hot', growth),
      this.dataSource.query(
        `SELECT t.id, t.kind, t.amount, t.balance_after, t.note, t.created_at, t.lead_id,
                l.tier, u.name AS customer_name
           FROM lead_wallet_transactions t
           LEFT JOIN provider_leads l ON l.id = t.lead_id
           LEFT JOIN users u ON u.id = l.user_id
          WHERE t.provider_id = $1
          ORDER BY t.created_at DESC
          LIMIT 30`,
        [ctx.id],
      ),
    ]);
    const first = toppedUp <= 0;
    return {
      enabled: await this.enabled(),
      balance,
      hotPrice,
      /** How many hot contacts the balance covers. */
      hotLeadsCovered: hotPrice > 0 ? Math.floor(balance / hotPrice) : 0,
      firstTopup: first,
      packs: await Promise.all(
        packs.map(async (p) => {
          const c = await this.packCredit(p, growth, first);
          return {
            id: p.id,
            price: p.price,
            credit: c.credit,
            bonus: c.bonus,
            firstBonus: c.firstBonus,
            bonusPct: c.bonusPct,
            popular: !!p.popular,
            hotLeads: hotPrice > 0 ? Math.floor(c.credit / hotPrice) : 0,
            onApple: !!p.appleProductId,
          };
        }),
      ),
      transactions: tx.map((t: any) => ({
        id: t.id as string,
        kind: t.kind as string,
        amount: Number(t.amount),
        balanceAfter: Number(t.balance_after),
        note: t.note as string | null,
        createdAt: t.created_at,
        leadId: t.lead_id as string | null,
        tier: t.tier as Tier | null,
        customerName: t.customer_name
          ? this.firstAndInitial(t.customer_name)
          : null,
      })),
    };
  }

  private firstAndInitial(name: string) {
    const [a, b] = name.trim().split(/\s+/);
    return b ? `${a} ${b[0]}.` : a;
  }

  /** Price check for a purchase: pack must exist; returns what it costs and credits. */
  async packForCheckout(userId: string, packId: string) {
    if (!(await this.enabled()))
      throw new BadRequestException('Lead packs are not available right now.');
    const ctx = await this.context(userId);
    const pack = (await this.packs()).find((p) => p.id === packId);
    if (!pack) throw new NotFoundException('Pack not found');
    const growth = ctx.plan_slug === 'growth';
    const { toppedUp } = await this.balanceOf(ctx.id);
    return {
      ctx,
      pack,
      ...(await this.packCredit(pack, growth, toppedUp <= 0)),
    };
  }

  // ─── Top-up (called once a pack payment succeeds) ─────────────────

  async creditPack(payment: {
    id: string;
    providerId: string;
    amount: number | string;
    metadata: any;
  }) {
    const packId = payment.metadata?.packId as string | undefined;
    const pack = (await this.packs()).find((p) => p.id === packId);
    const price = Number(payment.amount);
    const credited = await this.dataSource.transaction(async (m) => {
      // Once per payment, whichever of verify/webhook lands first.
      const [done] = await m.query(
        `SELECT 1 FROM lead_wallet_transactions WHERE payment_id = $1 AND kind = 'topup' LIMIT 1`,
        [payment.id],
      );
      if (done) return false;
      await m.query(
        `INSERT INTO lead_wallets (provider_id) VALUES ($1) ON CONFLICT (provider_id) DO NOTHING`,
        [payment.providerId],
      );
      const [w] = await m.query(
        `SELECT balance, lifetime_topped_up FROM lead_wallets WHERE provider_id = $1 FOR UPDATE`,
        [payment.providerId],
      );
      const first = Number(w.lifetime_topped_up) <= 0;
      const growth = !!payment.metadata?.growth;
      const c = pack
        ? await this.packCredit({ ...pack, price }, growth, first)
        : { bonus: 0, firstBonus: 0, credit: price, bonusPct: 0 };

      let balance = Number(w.balance);
      const add = async (kind: string, amount: number, note: string) => {
        if (amount <= 0) return;
        balance += amount;
        await m.query(
          `INSERT INTO lead_wallet_transactions (provider_id, kind, amount, balance_after, payment_id, note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [payment.providerId, kind, amount, balance, payment.id, note],
        );
      };
      await add('topup', price, `Top-up ₹${price}`);
      await add('bonus', c.bonus, `${c.bonusPct}% bonus`);
      await add('bonus', c.firstBonus, 'First top-up gift');
      await m.query(
        `UPDATE lead_wallets SET balance = $2, lifetime_topped_up = lifetime_topped_up + $3, updated_at = now()
          WHERE provider_id = $1`,
        [payment.providerId, balance, price],
      );
      return true;
    });
    if (credited) this.logger.log(`Lead wallet top-up: payment ${payment.id}`);
  }

  // ─── Unlocking ────────────────────────────────────────────────────

  private async plan(
    ctx: Awaited<ReturnType<LeadWalletService['context']>>,
    leads: LeadRow[],
  ): Promise<Plan> {
    const growth = ctx.plan_slug === 'growth';
    const monetized =
      (await this.setting('leads_monetization_enabled', 'false')) === 'true';
    const unlimitedPlan = ctx.monthly_lead_unlocks === -1;
    let planLeft =
      ctx.sub_id && !unlimitedPlan
        ? Math.max(
            0,
            (ctx.monthly_lead_unlocks ?? 0) - (ctx.lead_unlocks_used ?? 0),
          )
        : 0;

    // Free monthly quota, reset at the turn of the month.
    const quota = await this.num(
      ctx.women_led_status === 'approved'
        ? 'women_led_free_leads_per_month'
        : 'free_lead_quota_monthly',
      ctx.women_led_status === 'approved' ? 8 : 5,
    );
    const reset = ctx.free_leads_reset_at
      ? new Date(ctx.free_leads_reset_at)
      : null;
    const now = new Date();
    const sameMonth =
      reset &&
      reset.getMonth() === now.getMonth() &&
      reset.getFullYear() === now.getFullYear();
    let quotaLeft = Math.max(
      0,
      quota - (sameMonth ? Number(ctx.free_leads_used_this_month) : 0),
    );

    const result: Plan = {
      free: [],
      paid: [],
      total: 0,
      freeQuotaUsed: 0,
      planCreditsUsed: 0,
    };
    // Free credits go to the most valuable leads first.
    const sorted = [...leads].sort(
      (a, b) => TIER_ORDER[a.tier || 'cold'] - TIER_ORDER[b.tier || 'cold'],
    );
    for (const lead of sorted) {
      if (!lead.user_id || !monetized)
        result.free.push({ lead, method: 'free' });
      else if (unlimitedPlan)
        result.free.push({ lead, method: 'subscription_credit' });
      else if (planLeft > 0) {
        planLeft--;
        result.planCreditsUsed++;
        result.free.push({ lead, method: 'subscription_credit' });
      } else if (quotaLeft > 0) {
        quotaLeft--;
        result.freeQuotaUsed++;
        result.free.push({ lead, method: 'free_quota' });
      } else {
        const price = await this.leadPrice(lead.tier, growth);
        result.paid.push({ lead, price });
        result.total += price;
      }
    }
    return result;
  }

  private async lockedLeads(
    providerId: string,
    leadIds: string[],
    m: EntityManager | DataSource = this.dataSource,
  ) {
    if (!leadIds.length)
      throw new BadRequestException('Pick at least one lead');
    if (leadIds.length > 100)
      throw new BadRequestException('Up to 100 leads at a time');
    const rows: LeadRow[] = await m.query(
      `SELECT id, tier, user_id, is_unlocked FROM provider_leads
        WHERE provider_id = $1 AND id = ANY($2::uuid[]) AND is_unlocked = false`,
      [providerId, leadIds],
    );
    return rows;
  }

  /** What unlocking these leads would cost, before paying. */
  async quote(userId: string, leadIds: string[]) {
    const ctx = await this.context(userId);
    const leads = await this.lockedLeads(ctx.id, leadIds);
    const plan = await this.plan(ctx, leads);
    const { balance } = await this.balanceOf(ctx.id);
    const shortfall = Math.max(0, plan.total - balance);
    let suggestedPack: string | null = null;
    if (shortfall > 0) {
      const growth = ctx.plan_slug === 'growth';
      const { toppedUp } = await this.balanceOf(ctx.id);
      for (const p of [...(await this.packs())].sort(
        (a, b) => a.price - b.price,
      )) {
        if (
          (await this.packCredit(p, growth, toppedUp <= 0)).credit >= shortfall
        ) {
          suggestedPack = p.id;
          break;
        }
      }
    }
    return {
      count: leads.length,
      freeCount: plan.free.length,
      paidCount: plan.paid.length,
      total: plan.total,
      balance,
      shortfall,
      suggestedPack,
    };
  }

  /** Unlock leads: free credits first, the rest from the wallet — all or nothing. */
  async unlock(userId: string, leadIds: string[]) {
    const ctx = await this.context(userId);
    const result = await this.dataSource.transaction(async (m) => {
      await m.query(
        `INSERT INTO lead_wallets (provider_id) VALUES ($1) ON CONFLICT (provider_id) DO NOTHING`,
        [ctx.id],
      );
      const [w] = await m.query(
        `SELECT balance FROM lead_wallets WHERE provider_id = $1 FOR UPDATE`,
        [ctx.id],
      );
      const leads = await this.lockedLeads(ctx.id, leadIds, m);
      const plan = await this.plan(ctx, leads);
      let balance = Number(w.balance);
      if (plan.total > balance) {
        throw new ForbiddenException({
          message: `₹${plan.total - balance} more needed in your Lead Wallet`,
          code: 'WALLET_SHORT',
          shortfall: plan.total - balance,
        });
      }
      for (const { lead, price } of plan.paid) {
        balance -= price;
        await m.query(
          `INSERT INTO lead_wallet_transactions (provider_id, kind, amount, balance_after, lead_id, note)
           VALUES ($1, 'unlock', $2, $3, $4, $5)`,
          [ctx.id, -price, balance, lead.id, `${lead.tier || 'cold'} lead`],
        );
      }
      const ids = leads.map((l) => l.id);
      if (ids.length) {
        await m.query(
          `UPDATE provider_leads SET is_unlocked = true, updated_at = now() WHERE id = ANY($1::uuid[])`,
          [ids],
        );
      }
      if (plan.total > 0) {
        await m.query(
          `UPDATE lead_wallets SET balance = $2, updated_at = now() WHERE provider_id = $1`,
          [ctx.id, balance],
        );
      }
      if (plan.planCreditsUsed && ctx.sub_id) {
        await m.query(
          `UPDATE subscriptions SET lead_unlocks_used = lead_unlocks_used + $2 WHERE id = $1`,
          [ctx.sub_id, plan.planCreditsUsed],
        );
      }
      if (plan.freeQuotaUsed) {
        await m.query(
          `UPDATE providers
              SET free_leads_used_this_month = CASE
                    WHEN free_leads_reset_at IS NULL OR date_trunc('month', free_leads_reset_at) <> date_trunc('month', now())
                    THEN $2 ELSE free_leads_used_this_month + $2 END,
                  free_leads_reset_at = CASE
                    WHEN free_leads_reset_at IS NULL OR date_trunc('month', free_leads_reset_at) <> date_trunc('month', now())
                    THEN now() ELSE free_leads_reset_at END
            WHERE id = $1`,
          [ctx.id, plan.freeQuotaUsed],
        );
      }
      return {
        unlocked: ids,
        spent: plan.total,
        freeUsed: plan.free.length,
        balance,
      };
    });

    if (result.unlocked.length) {
      this.notificationDispatch
        .sendTemplated(ctx.user_id, 'lead_unlocked', {
          customerName:
            result.unlocked.length === 1
              ? 'a customer'
              : `${result.unlocked.length} customers`,
        })
        .catch(() => {});
    }
    void this.maybeLowBalance(ctx, result.balance);
    return result;
  }

  /** Low balance after spending: a nudge to top up, at most once a week. */
  private async maybeLowBalance(
    ctx: Awaited<ReturnType<LeadWalletService['context']>>,
    balance: number,
  ) {
    try {
      const hot = await this.leadPrice('hot', ctx.plan_slug === 'growth');
      if (balance >= hot) return;
      const [recent] = await this.dataSource.query(
        `SELECT 1 FROM notifications WHERE user_id = $1 AND data->>'slug' = 'lead_wallet_low'
            AND created_at > now() - interval '7 days' LIMIT 1`,
        [ctx.user_id],
      );
      if (recent) return;
      const packs = await this.packs();
      const pick = packs.find((p) => p.popular) ?? packs[0];
      const c = await this.packCredit(pick, ctx.plan_slug === 'growth', false);
      await this.notificationDispatch.sendTemplated(
        ctx.user_id,
        'lead_wallet_low',
        {
          balance: String(Math.round(balance)),
          price: String(pick.price),
          credit: c.credit.toLocaleString('en-IN'),
        },
        { slug: 'lead_wallet_low' },
        'provider',
      );
    } catch (err) {
      this.logger.warn(
        `low-balance nudge failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
