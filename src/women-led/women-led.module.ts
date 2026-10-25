import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { Verification } from '../entities/verification.entity';
import { WomenLedRequest } from '../entities/women-led-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  AdminWomenLedController,
  WomenLedController,
} from './women-led.controller';
import { WomenLedService } from './women-led.service';

/** Global so onboarding, admin and imports go through the same rules. */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WomenLedRequest,
      Provider,
      User,
      Verification,
      AuditLog,
    ]),
    NotificationsModule,
  ],
  controllers: [WomenLedController, AdminWomenLedController],
  providers: [WomenLedService],
  exports: [WomenLedService],
})
export class WomenLedModule {}
