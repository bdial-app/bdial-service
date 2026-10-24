/**
 * Every badge a business can have. Automatic badges are worked out from the
 * business's own numbers every night (and when an admin asks), and taken
 * away again when it no longer qualifies. Curated badges are given by the
 * Tijarah team, with a reason and an optional end date.
 *
 * The rules here are the source of truth; the admin app shows them, and the
 * customer app explains them in its own words. Change both if a rule changes.
 *
 * "Keep" thresholds are a little lower than "earn" ones, so a business on the
 * line doesn't gain and lose a badge every other night.
 */

export type BadgeKey =
  | 'tijarah_pick'
  | 'top_rated'
  | 'community_favourite'
  | 'quick_responder'
  | 'rising_star'
  | 'full_catalogue';

export interface BadgeDef {
  key: BadgeKey;
  label: string;
  kind: 'automatic' | 'curated';
  /** What it says about the business, in a sentence. */
  meaning: string;
  /** How it's earned (or given), for the admin and for owners. */
  rule: string;
}

/** Highest first: where only a few fit (cards), these win. */
export const BADGES: BadgeDef[] = [
  {
    key: 'tijarah_pick',
    label: 'Tijarah Pick',
    kind: 'curated',
    meaning: 'Chosen by the Tijarah team as a standout community business.',
    rule: 'Given by the Tijarah team, with a reason and an optional end date.',
  },
  {
    key: 'top_rated',
    label: 'Top Rated',
    kind: 'automatic',
    meaning: 'Consistently rated highly by its customers.',
    rule: 'Rated 4.5★ or more from at least 10 reviews (Tijarah and Google together). Kept while it stays at 4.3★ or more.',
  },
  {
    key: 'community_favourite',
    label: 'Community Favourite',
    kind: 'automatic',
    meaning: 'One of the businesses people in its city contact and save most.',
    rule: 'In the top 10% of its city for people who called, chatted, saved, shared or asked for directions in the last 30 days, with at least 10 such people.',
  },
  {
    key: 'quick_responder',
    label: 'Quick Responder',
    kind: 'automatic',
    meaning: 'Usually replies to enquiries within two hours.',
    rule: 'Replied within 2 hours to at least 80% of enquiries in the last 30 days (5 or more enquiries). Kept while it stays at 70%.',
  },
  {
    key: 'rising_star',
    label: 'Rising Star',
    kind: 'automatic',
    meaning: 'New on Tijarah and already loved by its customers.',
    rule: 'Joined in the last 90 days and rated 4.0★ or more from at least 3 reviews. Ends 90 days after joining.',
  },
  {
    key: 'full_catalogue',
    label: 'Full Catalogue',
    kind: 'automatic',
    meaning: 'Shows its products and services with prices and photos.',
    rule: 'At least 10 visible items, each with a price and a photo. Kept while it has 8 or more.',
  },
];

export const BADGE_KEYS = BADGES.map((b) => b.key);
export const AUTOMATIC_BADGE_KEYS = BADGES.filter(
  (b) => b.kind === 'automatic',
).map((b) => b.key);
export const CURATED_BADGE_KEYS = BADGES.filter(
  (b) => b.kind === 'curated',
).map((b) => b.key);
export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));
export const badgeRank = (key: string) => {
  const i = BADGE_KEYS.indexOf(key as BadgeKey);
  return i < 0 ? 99 : i;
};

/** The thresholds the rules above describe, in one place. */
export const RULES = {
  topRated: { minReviews: 10, earn: 4.5, keep: 4.3 },
  risingStar: { days: 90, minReviews: 3, minRating: 4.0 },
  quickResponder: {
    days: 30,
    minEnquiries: 5,
    withinHours: 2,
    earn: 0.8,
    keep: 0.7,
  },
  communityFavourite: {
    days: 30,
    earnPeople: 10,
    keepPeople: 8,
    earnRank: 0.9,
    keepRank: 0.8,
  },
  fullCatalogue: { earn: 10, keep: 8 },
} as const;
