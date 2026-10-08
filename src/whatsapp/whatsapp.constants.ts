import { WhatsAppRates } from '../entities/whatsapp-settings.entity';

export const WHATSAPP_NOT_CONFIGURED_MESSAGE =
  'WhatsApp is not configured. Set WHATSAPP_* env vars.';

export const WHATSAPP_DEFAULT_API_VERSION = 'v21.0';

export const WHATSAPP_DEFAULT_RATES: WhatsAppRates = {
  marketing: 0.8631,
  utility: 0.115,
  authentication: 0.115,
  service: 0,
};

/** Worker tuning */
export const WHATSAPP_MAX_ATTEMPTS = 3;
export const WHATSAPP_CLAIM_CAP_PER_TICK = 50;
export const WHATSAPP_SEND_CONCURRENCY = 5;
export const WHATSAPP_STALE_LOCK_MINUTES = 5;
export const WHATSAPP_TICK_MS = 10_000;
export const WHATSAPP_INSERT_CHUNK = 500;
/** Never faster than this, whatever the campaign rate (Meta's default is 80/s). */
export const WHATSAPP_MAX_PER_SECOND = 10;
/** Meta said "too many messages" (130429): hold that campaign this long. */
export const WHATSAPP_THROTTLE_PAUSE_MS = 60_000;
/** How long one backend keeps the right to send without renewing it. */
export const WHATSAPP_LEASE_MS = 45_000;

/** IST is UTC+5:30 with no DST. */
export const IST_OFFSET_MINUTES = 330;

/** 24-hour customer-service window after an inbound message. */
export const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const OPT_OUT_AUTO_REPLY =
  "You won't receive further marketing messages from Tijarah Connect. Reply START to resume.";
export const OPT_IN_AUTO_REPLY =
  "You're subscribed to Tijarah Connect updates.";

export interface MetaErrorDescriptor {
  message: string;
  retryable: boolean;
  /** Pause the owning campaign and record failure_reason. */
  pauseCampaign?: boolean;
  /** Mark the contact as not reachable on WhatsApp. */
  markUnreachable?: boolean;
  /** Per-user marketing frequency cap hit. */
  capHit?: boolean;
}

export const META_ERROR_MAP: Record<number, MetaErrorDescriptor> = {
  130429: { message: 'Rate limit hit (too many requests)', retryable: true },
  131056: {
    message: 'Too many messages to this number in a short time',
    retryable: true,
  },
  131000: { message: 'Something went wrong at Meta', retryable: true },
  131016: {
    message: 'WhatsApp service temporarily unavailable',
    retryable: true,
  },
  131049: {
    message:
      'Recipient reached their marketing message limit for 24h (not delivered, not billed)',
    retryable: false,
    capHit: true,
  },
  131026: {
    message: 'Number is not on WhatsApp or cannot receive messages',
    retryable: false,
    markUnreachable: true,
  },
  131047: {
    message:
      'Free-form message outside the 24h window; send a template instead',
    retryable: false,
  },
  132000: {
    message: 'Template parameter count does not match the template',
    retryable: false,
    pauseCampaign: true,
  },
  132001: {
    message: 'Template does not exist or is not approved for this language',
    retryable: false,
    pauseCampaign: true,
  },
  132012: {
    message: 'Template parameter format mismatch',
    retryable: false,
    pauseCampaign: true,
  },
  132015: {
    message: 'Template is paused by Meta',
    retryable: false,
    pauseCampaign: true,
  },
  132016: {
    message: 'Template is disabled by Meta',
    retryable: false,
    pauseCampaign: true,
  },
  131031: {
    message: 'WhatsApp business account is locked',
    retryable: false,
    pauseCampaign: true,
  },
  131042: {
    message: 'Payment method issue on the WhatsApp business account',
    retryable: false,
    pauseCampaign: true,
  },
  190: {
    message: 'Access token expired or invalid',
    retryable: false,
    pauseCampaign: true,
  },
  131051: { message: 'Unsupported message type', retryable: false },
  131021: { message: 'Recipient is the sender number', retryable: false },
  131008: { message: 'Required parameter missing', retryable: false },
  131009: { message: 'Parameter value is not valid', retryable: false },
  131005: {
    message: 'Access denied for this phone number or token',
    retryable: false,
  },
  133010: {
    message: 'Sender phone number is not registered',
    retryable: false,
    pauseCampaign: true,
  },
  100: { message: 'Invalid parameter', retryable: false },
};

export function describeMetaError(
  code: number | null | undefined,
  httpStatus?: number,
  fallbackMessage?: string,
): MetaErrorDescriptor {
  if (code != null && META_ERROR_MAP[code]) return META_ERROR_MAP[code];
  if (httpStatus != null && httpStatus >= 500) {
    return {
      message: fallbackMessage || `Meta server error (${httpStatus})`,
      retryable: true,
    };
  }
  return { message: fallbackMessage || 'Message failed', retryable: false };
}

/** 30s · 2^attempt */
export function backoffMs(attempt: number): number {
  return 30_000 * Math.pow(2, Math.max(0, attempt));
}

export const MESSAGE_STATUS_RANK: Record<string, number> = {
  queued: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

export const META_TEMPLATE_STATUS_MAP: Record<string, string> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  IN_APPEAL: 'pending',
  REJECTED: 'rejected',
  LIMIT_EXCEEDED: 'rejected',
  PAUSED: 'paused',
  DISABLED: 'disabled',
  PENDING_DELETION: 'disabled',
  DELETED: 'disabled',
  FLAGGED: 'paused',
};
