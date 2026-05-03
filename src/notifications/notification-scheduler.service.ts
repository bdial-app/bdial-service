import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { NotificationBatch } from '../entities/notification-batch.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationType } from '../entities/notification.entity';

/**
 * Runs every minute to pick up scheduled notification batches
 * that have scheduledAt <= now() and status = 'draft', then dispatches them.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(NotificationBatch)
    private readonly batchRepo: Repository<NotificationBatch>,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledBatches(): Promise<void> {
    if (this.isProcessing) return; // prevent overlap
    this.isProcessing = true;

    try {
      const pendingBatches = await this.batchRepo.find({
        where: {
          status: 'draft',
          scheduledAt: LessThanOrEqual(new Date()),
        },
        order: { scheduledAt: 'ASC' },
        take: 5, // process max 5 per cycle to avoid blocking
      });

      if (pendingBatches.length === 0) return;

      this.logger.log(`Processing ${pendingBatches.length} scheduled batch(es)`);

      for (const batch of pendingBatches) {
        try {
          await this.executeBatch(batch);
        } catch (error) {
          this.logger.error(`Failed to execute batch ${batch.id}: ${error.message}`);
          await this.batchRepo.update(batch.id, { status: 'failed' });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeBatch(batch: NotificationBatch): Promise<void> {
    this.logger.log(`Executing scheduled batch ${batch.id}: "${batch.title}"`);

    // Use the dispatch service's broadcast method
    const type = (batch.data?.type as NotificationType) || 'promotional';

    await this.dispatchService.sendBroadcast(
      batch.sentBy,
      batch.title,
      batch.body,
      batch.targetType,
      type,
      batch.targetCriteria || undefined,
      batch.data || undefined,
      batch.imageUrl || undefined,
    );

    // The sendBroadcast method creates its own batch record,
    // so we mark the scheduled one as sent
    await this.batchRepo.update(batch.id, {
      status: 'sent',
      sentAt: new Date(),
    });
  }
}
