/**
 * How long deals may run and what extending one costs. Every number is an
 * admin setting (Monetization group), read through the caller's own lookup.
 */
export type DealTier = 'free' | 'paid' | 'plan';

export interface DealRules {
  freeMaxDays: number;
  paidMaxDays: number;
  extensionDays: number;
  extensionPrice: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadDealRules(
  getSetting: (key: string, fallback: string) => Promise<string>,
): Promise<DealRules> {
  const num = async (key: string, fallback: number) => {
    const n = parseFloat(await getSetting(key, String(fallback)));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const [freeMaxDays, paidMaxDays, extensionDays, extensionPrice] =
    await Promise.all([
      num('deal_free_max_days', 5),
      num('deal_paid_max_days', 15),
      num('deal_extension_days', 15),
      num('deal_extension_price', 74),
    ]);
  return { freeMaxDays, paidMaxDays, extensionDays, extensionPrice };
}

export const maxDaysFor = (tier: DealTier, rules: DealRules) =>
  tier === 'free' ? rules.freeMaxDays : rules.paidMaxDays;

/** The end date, pulled in to at most `days` after the start. */
export function capEnd(startsAt: Date, endsAt: Date, days: number): Date {
  const latest = new Date(startsAt.getTime() + days * DAY_MS);
  return endsAt > latest ? latest : endsAt;
}

/** Whole days a deal runs, start to end (rounded up). */
export const daysBetween = (startsAt: Date, endsAt: Date) =>
  Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / DAY_MS));

/** Rank of a deal's tier where search orders deals: bought placement first. */
export const tierRank = (tier: string | null | undefined) =>
  tier === 'paid' || tier === 'plan' ? 2 : tier ? 1 : 0;
