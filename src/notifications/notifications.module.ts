import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationBatch } from '../entities/notification-batch.entity';
import { User } from '../entities/user.entity';
import { FirebaseService } from './firebase.service';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
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
      User,
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
  ],
  exports: [
    NotificationsService,
    NotificationDispatchService,
    FirebaseService,
  ],
})
export class NotificationsModule {}
