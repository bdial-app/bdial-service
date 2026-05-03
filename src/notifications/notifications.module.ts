import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationBatch } from '../entities/notification-batch.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import { Voucher } from '../entities/voucher.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { FirebaseService } from './firebase.service';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationCronService } from './notification-cron.service';
import { DeviceTokenController } from './device-token.controller';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      Notification,
      NotificationPreference,
      NotificationBatch,
      NotificationTemplate,
      User,
      Subscription,
      Voucher,
      SponsoredListing,
    ]),
  ],
  controllers: [
    DeviceTokenController,
    NotificationsController,
    AdminNotificationsController,
  ],
  providers: [
    FirebaseService,
    NotificationsService,
    NotificationDispatchService,
    NotificationTemplateService,
    NotificationSchedulerService,
    NotificationCronService,
  ],
  exports: [
    NotificationsService,
    NotificationDispatchService,
    NotificationTemplateService,
    FirebaseService,
  ],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private readonly templateService: NotificationTemplateService) {}

  async onModuleInit() {
    // Seed default notification templates on first run
    await this.templateService.seedDefaults();
  }
}
