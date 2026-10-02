import {
  WhatsAppTemplateCategory,
  WhatsAppVariableSource,
} from '../entities/whatsapp-template.entity';
import { WhatsAppConsent } from '../entities/whatsapp-contact.entity';
import { WhatsAppSkipReason } from '../entities/whatsapp-message.entity';

export type ProviderStatusFilter =
  | 'unverified'
  | 'active'
  | 'suspended'
  | 'disabled';
export type TrustLevelFilter = 'unverified' | 'basic' | 'verified' | 'trusted';
export type VerificationFilter =
  | 'none'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected';
export type ConsentFilter = 'any' | 'opted_in' | 'not_opted_out';

/** Saved / snapshotted audience definition (README §3). */
export interface AudienceFilters {
  cities?: string[];
  categoryIds?: string[];
  statuses?: ProviderStatusFilter[];
  trustLevels?: TrustLevelFilter[];
  verification?: VerificationFilter;
  womenLed?: boolean;
  isFeatured?: boolean;
  createdWithinDays?: number;
  createdBeforeDays?: number;
  inactiveDays?: number;
  missingLogo?: boolean;
  missingProducts?: boolean;
  /** 'approximate' = pinned at a city centre or not at all; 'exact' = a real pin. */
  locationPrecision?: 'approximate' | 'exact';
  notContactedDays?: number;
  consent?: ConsentFilter;
  reachableOnly?: boolean;
  providerIds?: string[];
  phones?: string[];
  mode?: 'filters' | 'manual';
}

/** A provider (or pasted phone) resolved from the audience. */
export interface AudienceRecipient {
  providerId: string | null;
  userId: string | null;
  /** Normalised E.164 or null when no candidate normalises. */
  phone: string | null;
  /** True when at least one raw candidate existed (so null phone = invalid). */
  hadRawPhone: boolean;
  brandName: string | null;
  city: string | null;
  ownerName: string | null;
}

export type SkipClassification = Exclude<WhatsAppSkipReason, 'cancelled'>;

export interface ClassifiedRecipient extends AudienceRecipient {
  skipReason: SkipClassification | null;
  consent: WhatsAppConsent;
}

export interface SkipBreakdown {
  noPhone: number;
  invalidPhone: number;
  optedOut: number;
  unreachable: number;
  marketingCap: number;
  duplicate: number;
}

export function emptySkipBreakdown(): SkipBreakdown {
  return {
    noPhone: 0,
    invalidPhone: 0,
    optedOut: 0,
    unreachable: 0,
    marketingCap: 0,
    duplicate: 0,
  };
}

export const SKIP_REASON_TO_KEY: Record<
  SkipClassification,
  keyof SkipBreakdown
> = {
  no_phone: 'noPhone',
  invalid_phone: 'invalidPhone',
  opted_out: 'optedOut',
  unreachable: 'unreachable',
  marketing_cap: 'marketingCap',
  duplicate: 'duplicate',
  daily_cap: 'marketingCap',
};

export interface RenderedTemplate {
  header?: string | { type: 'IMAGE'; url: string | null };
  body: string;
  footer?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

/** Values resolved for one provider, keyed by VariableSource. */
export type ResolvedProviderVariables = Partial<
  Record<Exclude<WhatsAppVariableSource, 'custom'>, string>
>;

export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export type TemplateCategoryForCost = Exclude<
  WhatsAppTemplateCategory,
  'authentication'
>;

/** Shape of req.user once JwtAuthGuard has run (the User entity). */
export interface AdminRequest {
  user: { id: string; name?: string; role?: string };
}
