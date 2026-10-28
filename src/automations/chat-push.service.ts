import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';

const IST = { timeZone: 'Asia/Kolkata' } as const;

/**
 * A customer has been waiting 2+ hours for a reply: remind the owner once
 * (per chat, per day), unless they muted it. Daytime only.
 */
@Injectable()
export class ChatPushService {
  private readonly logger = new Logger(ChatPushService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateService,
  ) {}

  @Cron('15,45 9-21 * * *', IST)
  async unanswered(): Promise<void> {
    if (!(await this.templates.isEnabled('chat_unanswered'))) return;
    const rows: {
      id: string;
      owner_id: string;
      customer_name: string;
      preview: string | null;
      last_at: Date;
    }[] = await this.dataSource.query(
      `SELECT c.id, o.user_id AS owner_id, u.name AS customer_name,
                c.last_message_preview AS preview, c.last_message_at AS last_at
           FROM conversations c
           JOIN conversation_participants o
             ON o.conversation_id = c.id AND o.role = 'provider'
            AND o.is_active = true AND o.is_muted = false AND o.blocked_at IS NULL
           JOIN conversation_participants cu
             ON cu.conversation_id = c.id AND cu.role = 'customer' AND cu.user_id = c.last_message_sender_id
           JOIN users u ON u.id = cu.user_id
          WHERE c.status = 'active'
            AND c.last_message_at < now() - interval '2 hours'
            AND c.last_message_at > now() - interval '24 hours'
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
               WHERE n.user_id = o.user_id AND n.data->>'slug' = 'chat_unanswered'
                 AND n.data->>'conversationId' = c.id::text AND n.created_at > now() - interval '20 hours'
            )
          LIMIT 300`,
    );
    for (const r of rows) {
      const hours = Math.max(
        2,
        Math.round((Date.now() - new Date(r.last_at).getTime()) / 3_600_000),
      );
      await this.dispatch
        .sendTemplated(
          r.owner_id,
          'chat_unanswered',
          {
            name: r.customer_name?.split(' ')[0] || 'A customer',
            excerpt: (r.preview || '').slice(0, 80),
            ago: `${hours} hours`,
          },
          {
            slug: 'chat_unanswered',
            conversationId: r.id,
            params: { conversationId: r.id },
          },
          'provider',
        )
        .catch(() => false);
    }
    if (rows.length)
      this.logger.log(`Unanswered chat reminders: ${rows.length}`);
  }
}
