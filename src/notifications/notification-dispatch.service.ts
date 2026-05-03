import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FirebaseService, PushPayload } from './firebase.service';
import { NotificationsService } from './notifications.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

/** Maps notification type → preference field name */
const TYPE_TO_PREFERENCE: Record<NotificationType, keyof NotificationPreference | null> = {
  chat_message: 'chatMessages',
  review_received: 'reviewsReceived',
  provider_status: 'providerStatusUpdates',
  verification_update: 'verificationUpdates',
  booking_update: 'bookingUpdates',
  promotional: 'promotional',
  system_announcement: 'systemAnnouncements',
  report_update: null, // Always sent
  new_enquiry: 'chatMessages', // Uses chat preference
  payment_update: 'systemAnnouncements', // Transactional — uses system pref
  voucher_update: 'promotional', // Marketing — uses promotional pref
  subscription_update: 'systemAnnouncements', // Transactional
  invite_update: 'promotional', // Engagement
};

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationsService: NotificationsService,
    private readonly templateService: NotificationTemplateService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Send a templated notification to a user.
   * Checks admin control (template.isActive) before sending.
   * This is the preferred method for all automated notifications.
   */
  async sendTemplated(
    userId: string,
    slug: string,
    variables: Record<string, string> = {},
    data?: Record<string, any>,
  ): Promise<boolean> {
    // 1. Resolve template — returns null if admin disabled it
    const resolved = await this.templateService.resolve(slug, variables);
    if (!resolved) {
      this.logger.debug(`Notification "${slug}" is disabled by admin — skipping`);
      return false;
    }

    // 2. Get template to determine type
    const template = await this.templateService.getBySlug(slug);
    if (!template) return false;

    // Merge route into data payload
    const payload = { ...data };
    if (resolved.route) payload.route = resolved.route;

    return this.sendToUser(
      userId,
      template.type as NotificationType,
      resolved.title,
      resolved.body,
      payload,
      resolved.imageUrl,
    );
  }

  /**
   * Send a push notification to a specific user.
   * Checks preferences, quiet hours, and dispatches via FCM.
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    imageUrl?: string,
    batchId?: string,
  ): Promise<boolean> {
    try {
      // 1. Check user preferences
      const prefs = await this.notificationsService.getPreferences(userId);

      if (!prefs.pushEnabled) {
        this.logger.debug(`Push disabled for user ${userId} — saving to inbox only`);
        await this.saveNotification(userId, type, title, body, data, imageUrl, batchId);
        return false;
      }

      // Check type-specific preference
      const prefField = TYPE_TO_PREFERENCE[type];
      if (prefField && !prefs[prefField]) {
        this.logger.debug(`${type} notifications disabled for user ${userId} — saving to inbox only`);
        await this.saveNotification(userId, type, title, body, data, imageUrl, batchId);
        return false;
      }

      // Check quiet hours
      if (this.isQuietHours(prefs)) {
        this.logger.debug(`Quiet hours active for user ${userId} — saving to inbox only`);
        await this.saveNotification(userId, type, title, body, data, imageUrl, batchId);
        return false;
      }

      // 2. Save notification to inbox
      await this.saveNotification(userId, type, title, body, data, imageUrl, batchId);

      // 3. Get device tokens and send push
      const tokens = await this.notificationsService.getActiveTokens(userId);
      if (tokens.length === 0) {
        this.logger.debug(`No active device tokens for user ${userId}`);
        return false;
      }

      const payload: PushPayload = {
        title,
        body,
        imageUrl,
        data: this.serializeData(type, data),
      };

      const tokenStrings = tokens.map((t) => t.token);

      if (tokenStrings.length === 1) {
        const result = await this.firebaseService.sendToDevice(tokenStrings[0], payload);
        await this.cleanupStaleTokens(result.staleTokens);
        return result.successCount > 0;
      }

      const result = await this.firebaseService.sendToDevices(tokenStrings, payload);
      await this.cleanupStaleTokens(result.staleTokens);
      return result.successCount > 0;
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a broadcast notification from admin.
   * Handles targeting: all users, segment, or individual users.
   */
  async sendBroadcast(
    adminId: string,
    title: string,
    body: string,
    targetType: 'all' | 'segment' | 'individual',
    type: NotificationType = 'promotional',
    targetCriteria?: Record<string, any>,
    data?: Record<string, any>,
    imageUrl?: string,
  ): Promise<{ batchId: string; totalRecipients: number }> {
    // 1. Create batch record
    const batch = await this.notificationsService.createBatch({
      title,
      body,
      imageUrl: imageUrl || null,
      data: data || null,
      targetType,
      targetCriteria: targetCriteria || null,
      sentBy: adminId,
      status: 'sending',
    });

    try {
      // 2. Resolve target users
      const userIds = await this.resolveTargetUsers(targetType, targetCriteria);

      await this.notificationsService.updateBatch(batch.id, {
        totalRecipients: userIds.length,
      });

      if (userIds.length === 0) {
        await this.notificationsService.updateBatch(batch.id, {
          status: 'sent',
          sentAt: new Date(),
        });
        return { batchId: batch.id, totalRecipients: 0 };
      }

      // 3. Send to each user (in chunks for large audiences)
      let deliveredCount = 0;
      let failedCount = 0;
      const chunkSize = 100;

      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);

        const results = await Promise.allSettled(
          chunk.map((userId) =>
            this.sendToUser(userId, type, title, body, data, imageUrl, batch.id),
          ),
        );

        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) deliveredCount++;
          else failedCount++;
        });
      }

      // 4. Update batch stats
      await this.notificationsService.updateBatch(batch.id, {
        deliveredCount,
        failedCount,
        status: 'sent',
        sentAt: new Date(),
      });

      return { batchId: batch.id, totalRecipients: userIds.length };
    } catch (error) {
      this.logger.error(`Broadcast failed: ${error.message}`);
      await this.notificationsService.updateBatch(batch.id, {
        status: 'failed',
      });
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  private async saveNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    imageUrl?: string,
    batchId?: string,
  ) {
    return this.notificationsService.createNotification({
      userId,
      type,
      title,
      body,
      imageUrl: imageUrl || null,
      data: data || null,
      batchId: batchId || null,
      source: batchId ? 'admin' : 'system',
    });
  }

  private async resolveTargetUsers(
    targetType: 'all' | 'segment' | 'individual',
    criteria?: Record<string, any>,
  ): Promise<string[]> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select('u.id')
      .where('u.status = :status', { status: 'active' });

    if (targetType === 'individual' && criteria?.userIds?.length) {
      qb.andWhere('u.id IN (:...userIds)', { userIds: criteria.userIds });
    } else if (targetType === 'segment') {
      if (criteria?.city) {
        qb.andWhere('u.city = :city', { city: criteria.city });
      }
      if (criteria?.role) {
        qb.andWhere('u.role = :role', { role: criteria.role });
      }
    }
    // targetType === 'all' — no extra filters

    const users = await qb.getMany();
    return users.map((u) => u.id);
  }

  private isQuietHours(prefs: NotificationPreference): boolean {
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 → 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Convert data to string values for FCM data payload.
   */
  private serializeData(
    type: NotificationType,
    data?: Record<string, any>,
  ): Record<string, string> {
    const serialized: Record<string, string> = { type };

    if (data) {
      if (data.route) serialized.route = String(data.route);
      if (data.params) serialized.params = JSON.stringify(data.params);
    }

    return serialized;
  }

  private async cleanupStaleTokens(staleTokens: string[]): Promise<void> {
    if (staleTokens.length > 0) {
      this.logger.log(`Cleaning up ${staleTokens.length} stale device token(s)`);
      await this.notificationsService.deactivateTokens(staleTokens);
    }
  }
}
