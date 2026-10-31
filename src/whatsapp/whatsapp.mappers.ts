import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { WHATSAPP_WINDOW_MS } from './whatsapp.constants';
import { toE164 } from './whatsapp-phone.util';
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
  nextSendAt: Date | null = null,
) {
  return {
    ...toCampaignSummary(c),
    nextSendAt: nextSendAt ? new Date(nextSendAt).toISOString() : null,
    audience: c.audience ?? {},
    variableMapping: c.variableMapping ?? {},
    headerMediaUrl: c.headerMediaUrl,
    headerMediaSource: c.headerMediaSource ?? 'fixed',
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
    consentSource: c.consentSource,
    consentMethod: c.consentMethod,
    consentChangedAt: iso(c.consentChangedAt),
    ownerConfirmedAt: iso(c.ownerConfirmedAt),
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

const MEDIA_KINDS = ['image', 'video', 'audio', 'document', 'sticker'] as const;
type MediaKind = (typeof MEDIA_KINDS)[number];

/**
 * The attachment on an inbound message, read from the webhook payload Meta
 * sent (stored as-is), or null for text and outbound messages.
 */
export function inboundMedia(
  kind: string,
  payload: Record<string, unknown> | null,
): {
  type: MediaKind;
  mediaId: string | null;
  mimeType: string | null;
  fileName: string | null;
  caption: string | null;
  voiceNote: boolean;
} | null {
  if (!payload || !(MEDIA_KINDS as readonly string[]).includes(kind))
    return null;
  const node = payload[kind] as
    | {
        id?: string;
        mime_type?: string;
        filename?: string;
        caption?: string;
        voice?: boolean;
      }
    | undefined;
  if (!node) return null;
  return {
    type: kind as MediaKind,
    mediaId: node.id ?? null,
    mimeType: node.mime_type ?? null,
    fileName: node.filename ?? null,
    caption: node.caption ?? null,
    voiceNote: node.voice === true,
  };
}

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
    media: mediaJson(m),
    contacts: sharedContacts(m),
    reaction: reactionOf(m),
    /** Emoji reactions on this message, attached by the inbox. */
    reactions: [] as { emoji: string }[],
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

/** An inbound reaction: the emoji (null when they took it back) and the message it's on. */
export function reactionOf(m: WhatsAppMessage): { emoji: string | null; targetWaId: string | null } | null {
  if (m.direction !== 'inbound' || m.kind !== 'reaction') return null;
  const r = (m.payload as { reaction?: { emoji?: string; message_id?: string } } | null)?.reaction;
  return { emoji: r?.emoji || null, targetWaId: r?.message_id ?? null };
}

/**
 * Puts each reaction on the message it reacts to (latest one wins, an empty
 * one clears it) and drops the reaction's own row. A reaction whose message
 * isn't in this page stays, so it can say "reacted to an earlier message".
 */
export function foldReactions(rows: WhatsAppMessage[], items: MessageJson[]): MessageJson[] {
  const byWaId = new Map<string, MessageJson>();
  rows.forEach((r, i) => {
    if (r.waMessageId) byWaId.set(r.waMessageId, items[i]);
  });
  const folded = new Set<MessageJson>();
  for (const item of items) {
    const target = item.reaction?.targetWaId ? byWaId.get(item.reaction.targetWaId) : undefined;
    if (!item.reaction || !target) continue;
    target.reactions = item.reaction.emoji ? [{ emoji: item.reaction.emoji }] : [];
    folded.add(item);
  }
  return items.filter((i) => !folded.has(i));
}

/** A contact card someone shared with us; `match` is filled in by the inbox. */
export interface SharedContact {
  name: string;
  company: string | null;
  phones: { phone: string; e164: string | null; label: string | null }[];
  match: {
    business: { id: string; brandName: string; city: string | null } | null;
    customer: { id: string; name: string | null } | null;
  } | null;
}

interface CardPayload {
  type?: string;
  contacts?: Array<{
    name?: { formatted_name?: string; first_name?: string; last_name?: string };
    org?: { company?: string };
    phones?: Array<{ phone?: string; wa_id?: string; type?: string }>;
  }>;
}

/** The contact cards in an inbound "contacts" message (WhatsApp's Share contact). */
export function sharedContacts(m: WhatsAppMessage): SharedContact[] | null {
  const p = m.payload as CardPayload | null;
  if (m.direction !== 'inbound' || p?.type !== 'contacts' || !p.contacts?.length) return null;
  return p.contacts.map((c) => ({
    name:
      c.name?.formatted_name?.trim() ||
      [c.name?.first_name, c.name?.last_name].filter(Boolean).join(' ').trim() ||
      'Unnamed contact',
    company: c.org?.company?.trim() || null,
    phones: (c.phones ?? [])
      .filter((ph) => ph.phone || ph.wa_id)
      .map((ph) => ({
        phone: ph.phone ?? `+${ph.wa_id}`,
        e164: toE164(ph.wa_id ? `+${ph.wa_id}` : ph.phone) ?? toE164(ph.phone),
        label: ph.type ? ph.type.charAt(0) + ph.type.slice(1).toLowerCase() : null,
      })),
    match: null,
  }));
}

/** What the inbox needs to show an attachment; the bytes come from /media. */
function mediaJson(m: WhatsAppMessage) {
  if (m.direction !== 'inbound') return null;
  const media = inboundMedia(m.kind, m.payload);
  if (!media) return null;
  return {
    type: media.type,
    mimeType: m.mediaMime ?? media.mimeType,
    fileName: media.fileName,
    caption: media.caption,
    voiceNote: media.voiceNote,
    size: m.mediaSize,
  };
}

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
