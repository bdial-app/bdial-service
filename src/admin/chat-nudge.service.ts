import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AutomationsService,
  ChatReminderKey,
  ChatReminderOpts,
} from '../automations/automations.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminService } from './admin.service';
import type { ChatNudgeChannel } from './dto/chat-nudge.dto';

const PUSH_TEMPLATE = 'chat_reply_nudge';
const AUDIT_ACTION = 'chat_nudge';
const COOLDOWN_MS = 24 * 3_600_000;
/** One owner can have many chats waiting; don't flood their WhatsApp. */
const MAX_WHATSAPP_PER_PERSON_PER_DAY = 3;
const REDACTED_EXCERPT = 'Open the chat to read their message';

const WHATSAPP_PROBLEMS: Record<string, string> = {
  no_phone: 'No phone number on file.',
  whatsapp_not_configured: 'WhatsApp isn’t set up on this server.',
  not_on_whatsapp: 'This number isn’t reachable on WhatsApp.',
  opted_out: 'They replied STOP, so we can’t message them on WhatsApp.',
  not_agreed:
    'This customer hasn’t turned on WhatsApp messages in Settings. Use push instead.',
  template_not_approved: 'The WhatsApp template isn’t approved by Meta.',
  template_differs: 'The approved WhatsApp template has different blanks.',
  budget_reached: 'This WhatsApp message’s monthly budget has been reached.',
  already_replied: 'They have already replied.',
  chat_closed: 'This chat is closed.',
  chat_blocked: 'One of them has blocked the other.',
  chat_muted: 'They have muted this chat.',
};
const whatsappProblem = (code: string) =>
  WHATSAPP_PROBLEMS[code] ??
  (code.startsWith('template_is_')
    ? `Meta re-filed the template as ${code.slice(12)}, so it isn’t being used.`
    : code.startsWith('missing_')
      ? 'Something the message needs is missing from this chat.'
      : code);

type Participant = {
  role: 'customer' | 'provider';
  user_id: string | null;
  is_active: boolean;
  is_muted: boolean;
  blocked_at: Date | null;
  unread_count: number;
  name: string | null;
};

type HistoryRow = {
  id: string;
  channel: ChatNudgeChannel;
  outcome: string;
  at: Date;
  admin_name: string | null;
  job_status: string | null;
  skip_reason: string | null;
  message_status: string | null;
};

/** "12 minutes", "3 hours", "2 days". */
const ago = (since: Date) => {
  const minutes = Math.max(1, Math.round((Date.now() - +since) / 60_000));
  const [n, unit] =
    minutes < 60
      ? [minutes, 'minute']
      : minutes < 48 * 60
        ? [Math.round(minutes / 60), 'hour']
        : [Math.round(minutes / 1440), 'day'];
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
};

/** Did this reminder actually go, or get stopped later? */
const didGo = (h: HistoryRow) =>
  h.outcome !== 'failed' &&
  !['failed', 'skipped', 'cancelled'].includes(h.job_status ?? '');

/**
 * An admin reminding one side of a chat that the other is waiting for a reply.
 * Only the person who owes the reply can be reminded, and each attempt is kept
 * in the audit log, which is also where the reminder history comes from.
 */
@Injectable()
export class ChatNudgeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: AdminService,
    private readonly automations: AutomationsService,
    private readonly dispatch: NotificationDispatchService,
    private readonly notifications: NotificationsService,
    private readonly templates: NotificationTemplateService,
  ) {}

  /** Everything the admin's reminder dialog shows. Sends nothing. */
  async inspect(conversationId: string) {
    const chat = await this.load(conversationId);
    const history = await this.history(conversationId);
    const base = {
      waitingOn: chat.recipient?.role ?? null,
      recipient: chat.recipient
        ? {
            userId: chat.recipient.user_id,
            name: chat.recipientName,
            role: chat.recipient.role,
          }
        : null,
      waitingFor: chat.senderName,
      waitingSince: chat.lastMessageAt,
      unreadCount: chat.recipient?.unread_count ?? 0,
      history: history.map((h) => ({
        id: h.id,
        channel: h.channel,
        outcome: h.outcome,
        status: h.message_status ?? h.job_status,
        reason: h.skip_reason ? whatsappProblem(h.skip_reason) : null,
        at: h.at,
        adminName: h.admin_name,
      })),
    };
    if (chat.problem) {
      const closed = { available: false, reason: chat.problem };
      return {
        ...base,
        problem: chat.problem,
        channels: { push: closed, whatsapp: closed },
      };
    }
    const [push, whatsapp] = await Promise.all([
      this.pushChannel(chat, history),
      this.whatsappChannel(chat, history),
    ]);
    return { ...base, problem: null, channels: { push, whatsapp } };
  }

  async send(
    admin: { id: string },
    conversationId: string,
    channel: ChatNudgeChannel,
  ) {
    // The same checks the dialog showed: the chat may have moved on since.
    const chat = await this.load(conversationId);
    if (chat.problem) throw new UnprocessableEntityException(chat.problem);
    const history = await this.history(conversationId);
    const state =
      channel === 'push'
        ? await this.pushChannel(chat, history)
        : await this.whatsappChannel(chat, history);
    if (!state.available) throw new UnprocessableEntityException(state.reason);

    return channel === 'push'
      ? this.sendPush(admin, chat)
      : this.sendWhatsApp(admin, chat);
  }

  private async sendPush(admin: { id: string }, chat: LoadedChat) {
    const recipient = chat.recipient!;
    const result = await this.dispatch.deliverTemplated(
      recipient.user_id!,
      PUSH_TEMPLATE,
      this.pushVariables(chat),
      {
        // Same marker as the automatic reminder, so that one holds off for a day.
        slug: 'chat_unanswered',
        conversationId: chat.id,
        params: { conversationId: chat.id },
      },
      recipient.role,
    );
    if (result === 'disabled')
      throw new UnprocessableEntityException(
        'This reminder is switched off under Notification templates.',
      );
    await this.record(admin, chat, 'push', result);
    if (result === 'failed')
      throw new UnprocessableEntityException(
        'The push couldn’t be delivered. It’s in their app inbox; try WhatsApp.',
      );
    return {
      channel: 'push' as const,
      outcome: result,
      message:
        result === 'pushed'
          ? `Push sent to ${chat.recipientName}.`
          : `${chat.recipientName}’s phone didn’t get a push (notifications off, quiet hours or not signed in). It’s in their app inbox.`,
    };
  }

  private async sendWhatsApp(admin: { id: string }, chat: LoadedChat) {
    const { jobId, outcome } = await this.automations.sendChatReminder(
      this.reminderKey(chat),
      this.reminderOpts(chat),
    );
    if (outcome.status === 'sent') {
      await this.record(admin, chat, 'whatsapp', 'sent', jobId);
      return {
        channel: 'whatsapp' as const,
        outcome: 'sent',
        message: `WhatsApp sent to ${chat.recipientName}.`,
      };
    }
    if (outcome.status === 'pending') {
      await this.record(admin, chat, 'whatsapp', 'scheduled', jobId);
      return {
        channel: 'whatsapp' as const,
        outcome: 'scheduled',
        sendsAt: outcome.dueAt,
        message: `It’s outside sending hours, so the WhatsApp goes out at the next window, unless ${chat.recipientName} replies first.`,
      };
    }
    await this.record(admin, chat, 'whatsapp', 'failed', jobId);
    throw new UnprocessableEntityException(whatsappProblem(outcome.reason));
  }

  // ── Channels ─────────────────────────────────────────────────────────────

  private async pushChannel(chat: LoadedChat, history: HistoryRow[]) {
    const recipient = chat.recipient!;
    const resolved = await this.templates.resolve(
      PUSH_TEMPLATE,
      this.pushVariables(chat),
    );
    const [tokens, prefs] = await Promise.all([
      this.notifications.getActiveTokens(recipient.user_id!),
      this.notifications.getPreferences(recipient.user_id!),
    ]);
    const devices = tokens.length;
    const preview = {
      title: resolved?.title ?? null,
      body: resolved?.body ?? null,
      devices,
      // It would only reach their in-app inbox, which is worth knowing first.
      inboxOnly: devices === 0 || !prefs.pushEnabled || !prefs.chatMessages,
    };
    if (!resolved)
      return {
        ...preview,
        available: false,
        reason: 'This reminder is switched off under Notification templates.',
      };
    const recent = this.recentlySent(history, 'push');
    return recent
      ? { ...preview, available: false, reason: recent }
      : { ...preview, available: true, reason: null };
  }

  private async whatsappChannel(chat: LoadedChat, history: HistoryRow[]) {
    const preview = await this.automations.previewChatReminder(
      this.reminderKey(chat),
      this.reminderOpts(chat),
    );
    const base = {
      phone: preview.phone,
      text: preview.text,
      sendsAt: preview.sendsAt,
    };
    if (preview.problem)
      return {
        ...base,
        available: false,
        reason: whatsappProblem(preview.problem),
      };
    const recent = this.recentlySent(history, 'whatsapp');
    if (recent) return { ...base, available: false, reason: recent };
    if (
      (await this.whatsappSentToday(chat.recipient!.user_id!)) >=
      MAX_WHATSAPP_PER_PERSON_PER_DAY
    ) {
      return {
        ...base,
        available: false,
        reason: `They’ve had ${MAX_WHATSAPP_PER_PERSON_PER_DAY} WhatsApp reminders today across their chats. Try tomorrow.`,
      };
    }
    return { ...base, available: true, reason: null };
  }

  /** One reminder per chat, per channel, per day. */
  private recentlySent(history: HistoryRow[], channel: ChatNudgeChannel) {
    const last = history.find(
      (h) =>
        h.channel === channel &&
        didGo(h) &&
        Date.now() - +new Date(h.at) < COOLDOWN_MS,
    );
    return last
      ? `Already reminded ${ago(new Date(last.at))} ago. You can send another 24 hours after that.`
      : null;
  }

  private pushVariables(chat: LoadedChat) {
    return {
      // A customer goes by first name; a business by its whole name.
      name:
        chat.recipient!.role === 'provider'
          ? chat.senderName.split(/\s+/)[0]
          : chat.senderName,
      excerpt: chat.excerpt.slice(0, 80),
      ago: ago(chat.lastMessageAt),
    };
  }

  /** The owner hears about the customer's message; the customer about the reply. */
  private reminderKey(chat: LoadedChat): ChatReminderKey {
    return chat.recipient!.role === 'provider'
      ? 'enquiry_alert'
      : 'business_replied';
  }

  private reminderOpts(chat: LoadedChat): ChatReminderOpts {
    const toOwner = chat.recipient!.role === 'provider';
    return {
      userId: toOwner ? null : chat.recipient!.user_id,
      providerId: chat.providerId,
      context: {
        conversationId: chat.id,
        excerpt: chat.excerpt,
        ...(toOwner
          ? { customerName: chat.senderName }
          : { brandName: chat.senderName }),
      },
    };
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  private async load(conversationId: string): Promise<LoadedChat> {
    const [c] = await this.dataSource.query<
      {
        status: string;
        last_sender: string | null;
        last_at: Date | null;
        preview: string | null;
        last_removed: boolean | null;
      }[]
    >(
      `SELECT c.status, c.last_message_sender_id AS last_sender, c.last_message_at AS last_at,
              c.last_message_preview AS preview,
              (SELECT m.deleted_at IS NOT NULL FROM messages m
                WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_removed
         FROM conversations c WHERE c.id = $1`,
      [conversationId],
    );
    if (!c) throw new NotFoundException('Conversation not found');

    const people = await this.dataSource.query<Participant[]>(
      `SELECT cp.role, cp.user_id, cp.is_active, cp.is_muted, cp.blocked_at, cp.unread_count, u.name
         FROM conversation_participants cp
         LEFT JOIN users u ON u.id = cp.user_id
        WHERE cp.conversation_id = $1`,
      [conversationId],
    );
    const owner = people.find((p) => p.role === 'provider');
    const [provider] = owner?.user_id
      ? await this.dataSource.query<{ id: string; brand_name: string }[]>(
          `SELECT id, brand_name FROM providers WHERE user_id = $1 AND deleted_at IS NULL`,
          [owner.user_id],
        )
      : [];

    const label = (p: Participant | undefined) =>
      p?.role === 'provider'
        ? (provider?.brand_name ?? p.name ?? 'The business')
        : (p?.name ?? 'The customer');
    const sender = people.find((p) => p.user_id && p.user_id === c.last_sender);
    const recipient = sender
      ? (people.find((p) => p.role !== sender.role) ?? null)
      : null;

    let problem: string | null = null;
    if (c.status !== 'active') problem = 'This chat is closed.';
    else if (!sender)
      problem = 'Nobody is waiting for a reply in this chat yet.';
    else if (!recipient?.user_id)
      problem = 'The other person’s account no longer exists.';
    else if (recipient.role === 'provider' && !provider)
      problem = 'This business is no longer listed.';
    else if (people.some((p) => p.blocked_at))
      problem = 'One of them has blocked the other.';
    else if (recipient.is_muted)
      problem = `${label(recipient)} has muted this chat.`;
    else if (!recipient.is_active)
      problem = `${label(recipient)} has removed this chat.`;

    return {
      id: conversationId,
      recipient: recipient ?? null,
      recipientName: label(recipient ?? undefined),
      senderName: label(sender),
      providerId: provider?.id ?? null,
      lastMessageAt: c.last_at ? new Date(c.last_at) : new Date(),
      // The preview column keeps a message's text after an admin removes it.
      excerpt:
        c.last_removed || !c.preview?.trim() ? REDACTED_EXCERPT : c.preview,
      problem,
    };
  }

  private history(conversationId: string) {
    // audit_logs.created_at has no time zone, so it's read back in the session's.
    return this.dataSource.query<HistoryRow[]>(
      `SELECT a.id, a.new_state->>'channel' AS channel, a.new_state->>'outcome' AS outcome,
              a.created_at AT TIME ZONE current_setting('TimeZone') AS at,
              u.name AS admin_name, j.status AS job_status, j.skip_reason,
              m.status AS message_status
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.admin_id
         LEFT JOIN automation_jobs j ON j.id = (a.new_state->>'jobId')::uuid
         LEFT JOIN whatsapp_messages m ON m.id = j.message_id
        WHERE a.action = $1 AND a.entity_type = 'conversation' AND a.entity_id = $2
        ORDER BY a.created_at DESC LIMIT 20`,
      [AUDIT_ACTION, conversationId],
    );
  }

  private async whatsappSentToday(recipientUserId: string) {
    const [row] = await this.dataSource.query<{ count: number }[]>(
      `SELECT count(*)::int AS count
         FROM audit_logs a
         LEFT JOIN automation_jobs j ON j.id = (a.new_state->>'jobId')::uuid
        WHERE a.action = $1
          AND a.new_state->>'channel' = 'whatsapp'
          AND a.new_state->>'recipientUserId' = $2
          AND a.new_state->>'outcome' <> 'failed'
          AND COALESCE(j.status, '') NOT IN ('failed', 'skipped', 'cancelled')
          AND a.created_at > now() - interval '24 hours'`,
      [AUDIT_ACTION, recipientUserId],
    );
    return row?.count ?? 0;
  }

  private record(
    admin: { id: string },
    chat: LoadedChat,
    channel: ChatNudgeChannel,
    outcome: string,
    jobId?: string,
  ) {
    return this.admin.createAuditLog(
      admin.id,
      AUDIT_ACTION,
      'conversation',
      chat.id,
      null,
      {
        channel,
        outcome,
        recipientUserId: chat.recipient!.user_id,
        recipientRole: chat.recipient!.role,
        ...(jobId ? { jobId } : {}),
      },
      `Reply reminder by ${channel} to ${chat.recipientName}`,
    );
  }
}

type LoadedChat = {
  id: string;
  /** The person who owes the reply; null when nobody does. */
  recipient: Participant | null;
  recipientName: string;
  senderName: string;
  providerId: string | null;
  lastMessageAt: Date;
  excerpt: string;
  /** Why no reminder can go at all. */
  problem: string | null;
};
