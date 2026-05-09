import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationBatch } from '../entities/notification-batch.entity';
import {
  RegisterDeviceDto,
  UpdatePreferencesDto,
  GetNotificationsQueryDto,
  GetBatchesQueryDto,
  SendNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    @InjectRepository(NotificationBatch)
    private readonly batchRepo: Repository<NotificationBatch>,
  ) {}

  // ──────────────────────────────────────────────
  // Device Tokens
  // ──────────────────────────────────────────────

  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<DeviceToken> {
    // Upsert: if this token exists for another user, reassign it
    const existing = await this.deviceTokenRepo.findOneBy({ token: dto.token });

    if (existing) {
      existing.userId = userId;
      existing.platform = dto.platform;
      existing.deviceInfo = dto.deviceInfo || existing.deviceInfo;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      return this.deviceTokenRepo.save(existing);
    }

    const deviceToken = this.deviceTokenRepo.create({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceInfo: dto.deviceInfo || null,
      isActive: true,
      lastUsedAt: new Date(),
    });
    return this.deviceTokenRepo.save(deviceToken);
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.deviceTokenRepo.update(
      { userId, token },
      { isActive: false },
    );
  }

  async unregisterAllDevices(userId: string): Promise<void> {
    await this.deviceTokenRepo.update(
      { userId },
      { isActive: false },
    );
  }

  async getActiveTokens(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokenRepo.find({
      where: { userId, isActive: true },
    });
  }

  async getActiveTokensForUsers(userIds: string[]): Promise<DeviceToken[]> {
    if (userIds.length === 0) return [];
    return this.deviceTokenRepo
      .createQueryBuilder('dt')
      .where('dt.user_id IN (:...userIds)', { userIds })
      .andWhere('dt.is_active = true')
      .getMany();
  }

  async deactivateTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.deviceTokenRepo
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('token IN (:...tokens)', { tokens })
      .execute();
  }

  // ──────────────────────────────────────────────
  // Notifications (CRUD)
  // ──────────────────────────────────────────────

  async getNotifications(userId: string, query: GetNotificationsQueryDto) {
    const { page = 1, limit = 20, type, status = 'all', targetMode } = query;
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC');

    if (type) {
      qb.andWhere('n.type = :type', { type });
    }
    if (status === 'read') {
      qb.andWhere('n.is_read = true');
    } else if (status === 'unread') {
      qb.andWhere('n.is_read = false');
    }
    if (targetMode) {
      qb.andWhere('n.target_mode = :targetMode', { targetMode });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string, targetMode?: 'customer' | 'provider'): Promise<{ count: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.is_read = false');

    if (targetMode) {
      qb.andWhere('n.target_mode = :targetMode', { targetMode });
    }

    const count = await qb.getCount();
    return { count };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOneBy({
      id: notificationId,
      userId,
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepo.save(notification);

    // Update batch read count if part of a batch
    if (notification.batchId) {
      await this.batchRepo
        .createQueryBuilder()
        .update()
        .set({ readCount: () => 'read_count + 1' })
        .where('id = :id', { id: notification.batchId })
        .execute();
    }
  }

  async markAllAsRead(userId: string, targetMode?: 'customer' | 'provider'): Promise<{ updated: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId AND is_read = false', { userId });

    if (targetMode) {
      qb.andWhere('target_mode = :targetMode', { targetMode });
    }

    const result = await qb.execute();
    return { updated: result.affected || 0 };
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationRepo.delete({
      id: notificationId,
      userId,
    });
    if (result.affected === 0) throw new NotFoundException('Notification not found');
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationRepo.create({
      ...data,
      sentAt: new Date(),
    });
    return this.notificationRepo.save(notification);
  }

  // ──────────────────────────────────────────────
  // Notification Preferences
  // ──────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOneBy({ userId });
    if (!prefs) {
      // Auto-create default preferences
      prefs = this.preferenceRepo.create({ userId });
      prefs = await this.preferenceRepo.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreference> {
    let prefs = await this.getPreferences(userId);
    Object.assign(prefs, dto);
    return this.preferenceRepo.save(prefs);
  }

  // ──────────────────────────────────────────────
  // Notification Batches (Admin)
  // ──────────────────────────────────────────────

  async createBatch(data: Partial<NotificationBatch>): Promise<NotificationBatch> {
    const batch = this.batchRepo.create(data);
    return this.batchRepo.save(batch);
  }

  async updateBatch(id: string, data: Partial<NotificationBatch>): Promise<void> {
    await this.batchRepo.update(id, data);
  }

  async getBatches(query: GetBatchesQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const qb = this.batchRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.sender', 'sender')
      .orderBy('b.createdAt', 'DESC');

    if (status) {
      qb.andWhere('b.status = :status', { status });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBatchById(id: string): Promise<NotificationBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id },
      relations: ['sender'],
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async getStats() {
    const totalSent = await this.notificationRepo.count();
    const totalDelivered = await this.notificationRepo.count({ where: { sentAt: Not(null) as any } });
    const totalRead = await this.notificationRepo.count({ where: { isRead: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await this.notificationRepo
      .createQueryBuilder('n')
      .where('n.created_at >= :today', { today })
      .getCount();

    const batchesSent = await this.batchRepo.count({ where: { status: 'sent' as any } });

    return {
      totalSent,
      totalRead,
      readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
      sentToday,
      batchesSent,
    };
  }
}
