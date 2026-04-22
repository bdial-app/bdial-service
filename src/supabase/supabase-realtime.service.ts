import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Handles Supabase Realtime Broadcast for chat events.
 * The backend broadcasts after every DB write; clients subscribe to channels.
 */
@Injectable()
export class SupabaseRealtimeService {
  private supabase?: SupabaseClient;
  private readonly logger = new Logger(SupabaseRealtimeService.name);

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL', '');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');

    if (!url || !serviceKey) {
      this.logger.warn('Supabase credentials missing — realtime broadcasts disabled.');
      return;
    }

    this.supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private getChannel(conversationId: string) {
    return this.supabase?.channel(`chat:${conversationId}`);
  }

  /** Broadcast a new message to all participants listening on this conversation */
  async broadcastMessage(
    conversationId: string,
    payload: {
      id: string;
      conversationId: string;
      senderId: string;
      senderName: string;
      content: string | null;
      messageType: string;
      metadata: Record<string, any> | null;
      status: string;
      createdAt: string;
    },
  ) {
    try {
      const channel = this.getChannel(conversationId);
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload,
      });

      // Unsubscribe server-side channel after send (stateless)
      this.supabase?.removeChannel(channel);
    } catch (err) {
      this.logger.error(`broadcastMessage failed for ${conversationId}`, err);
    }
  }

  /** Broadcast typing indicator */
  async broadcastTyping(
    conversationId: string,
    payload: { userId: string; userName: string; isTyping: boolean },
  ) {
    try {
      const channel = this.getChannel(conversationId);
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload,
      });

      this.supabase?.removeChannel(channel);
    } catch (err) {
      this.logger.error(`broadcastTyping failed for ${conversationId}`, err);
    }
  }

  /** Broadcast read receipt so sender sees blue ticks */
  async broadcastReadReceipt(
    conversationId: string,
    payload: { userId: string; lastReadAt: string; messageIds: string[] },
  ) {
    try {
      const channel = this.getChannel(conversationId);
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload,
      });

      this.supabase?.removeChannel(channel);
    } catch (err) {
      this.logger.error(`broadcastReadReceipt failed for ${conversationId}`, err);
    }
  }

  /** Broadcast conversation list update (new convo, unread count change) */
  async broadcastConversationUpdate(
    userId: string,
    payload: { conversationId: string; lastMessagePreview: string; lastMessageAt: string; unreadCount: number },
  ) {
    try {
      const channel = this.supabase?.channel(`user:${userId}:conversations`);
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'conversation_update',
        payload,
      });

      this.supabase?.removeChannel(channel);
    } catch (err) {
      this.logger.error(`broadcastConversationUpdate failed for user ${userId}`, err);
    }
  }
}
