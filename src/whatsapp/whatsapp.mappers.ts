import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { WHATSAPP_WINDOW_MS } from './whatsapp.constants';
import { SkipBreakdown } from './whatsapp.types';

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
};

export function windowExpiresAt(
  lastInboundAt: Date | string | null | undefined,
): string | null {
  if (!lastInboundAt) return null;
  const at = new Date(lastInboundAt).getTime() + WHATSAPP_WINDOW_MS;
  return at > Date.now() ? new Date(at).toISOString() : null;
}

export function toTemplateJson(t: WhatsAppTemplate, usageCount = 0) {
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    metaTemplateId: t.metaTemplateId,
    components: t.components ?? [],
    variables: t.variables ?? [],
    description: t.description,
    rejectedReason: t.rejectedReason,
    qualityScore: t.qualityScore,
    isSeed: t.isSeed,
    lastSyncedAt: iso(t.lastSyncedAt),
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
    usageCount,
  };
}
export type TemplateJson = ReturnType<typeof toTemplateJson>;

export interface ProviderBrief {
  id: string;
  brandName: string;
  city: string | null;
}

export function toCampaignSummary(
  c: WhatsAppCampaign,
  creator?: { id: string; name: string } | null,
) {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    template: c.template
      ? {
          id: c.template.id,
          name: c.template.name,
          category: c.template.category,
          language: c.template.language,
        }
      : { id: c.templateId, name: '', category: 'utility', language: 'en' },
    scheduledAt: iso(c.scheduledAt),
    startedAt: iso(c.startedAt),
    completedAt: iso(c.completedAt),
    totalRecipients: c.totalRecipients,
    queuedCount: c.queuedCount,
    sentCount: c.sentCount,
    deliveredCount: c.deliveredCount,
    readCount: c.readCount,
    failedCount: c.failedCount,
    skippedCount: c.skippedCount,
    repliedCount: c.repliedCount,
    estimatedCostInr: Number(c.estimatedCostInr ?? 0),
    actualCostInr: Number(c.actualCostInr ?? 0),
    createdAt: iso(c.createdAt),
    createdBy:
      creator ??
      (c.creator ? { id: c.creator.id, name: c.creator.name } : null),
  };
}
export type CampaignSummary = ReturnType<typeof toCampaignSummary>;

export function toCampaignDetail(
  c: WhatsAppCampaign,
  skipBreakdown: SkipBreakdown,
  failureBreakdown: Array<{
    code: number | null;
    message: string;
    count: number;
  }>,
) {
  return {
    ...toCampaignSummary(c),
    audience: c.audience ?? {},
    variableMapping: c.variableMapping ?? {},
    headerMediaUrl: c.headerMediaUrl,
    buttonUrlParams: c.buttonUrlParams,
    ratePerMinute: c.ratePerMinute,
    failureReason: c.failureReason,
    skipBreakdown,
    failureBreakdown,
  };
}

export interface ContactExtras {
  provider?: {
    id: string;
    brandName: string;
    city: string | null;
    status: string;
    trustLevel: string;
  } | null;
  messagesSent?: number;
  lastCampaignName?: string | null;
}

export function toContactJson(c: WhatsAppContact, extras: ContactExtras = {}) {
  const provider =
    extras.provider !== undefined
      ? extras.provider
      : c.provider
        ? {
            id: c.provider.id,
            brandName: c.provider.brandName,
            city: c.provider.city,
            status: c.provider.status,
            trustLevel: c.provider.trustLevel,
          }
        : null;
  return {
    id: c.id,
    phone: c.phone,
    displayName: c.displayName,
    consent: c.consent,
    reachable: c.reachable,
    lastInboundAt: iso(c.lastInboundAt),
    lastOutboundAt: iso(c.lastOutboundAt),
    unreadCount: c.unreadCount,
    tags: c.tags ?? [],
    notes: c.notes,
    providerId: c.providerId,
    provider,
    messagesSent: extras.messagesSent ?? 0,
    lastCampaignName: extras.lastCampaignName ?? null,
    windowExpiresAt: windowExpiresAt(c.lastInboundAt),
  };
}
export type ContactJson = ReturnType<typeof toContactJson>;

/** Inbox / provider-page message shape. */
export function toMessageJson(
  m: WhatsAppMessage,
  campaign?: { id: string; name: string } | null,
) {
  return {
    id: m.id,
    direction: m.direction,
    kind: m.kind,
    status: m.status,
    body: m.renderedBody,
    templateName: m.templateName,
    errorMessage: m.errorMessage,
    errorCode: m.errorCode,
    createdAt: iso(m.createdAt),
    sentAt: iso(m.sentAt),
    deliveredAt: iso(m.deliveredAt),
    readAt: iso(m.readAt),
    campaign:
      campaign ??
      (m.campaign ? { id: m.campaign.id, name: m.campaign.name } : null),
  };
}
export type MessageJson = ReturnType<typeof toMessageJson>;

/** Campaign recipient row. */
export function toMessageRow(
  m: WhatsAppMessage,
  phone: string,
  provider: ProviderBrief | null,
) {
  return {
    id: m.id,
    contactId: m.contactId,
    phone,
    provider,
    status: m.status,
    errorCode: m.errorCode,
    errorMessage: m.errorMessage,
    skipReason: m.skipReason,
    attempts: m.attempts,
    sentAt: iso(m.sentAt),
    deliveredAt: iso(m.deliveredAt),
    readAt: iso(m.readAt),
    failedAt: iso(m.failedAt),
    costInr: Number(m.costInr ?? 0),
    renderedBody: m.renderedBody,
    sendAfter: iso(m.sendAfter),
  };
}
export type MessageRow = ReturnType<typeof toMessageRow>;

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s =
    typeof v === 'object'
      ? JSON.stringify(v)
      : String(v as string | number | boolean);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
