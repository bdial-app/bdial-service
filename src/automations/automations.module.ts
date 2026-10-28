import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationJob } from '../entities/automation-job.entity';
import { MessagingAutomation } from '../entities/messaging-automation.entity';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AutomationCronService } from './automation-cron.service';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { EngagementPushService } from './engagement-push.service';
import { DealPushService } from './deal-push.service';
import { ChatPushService } from './chat-push.service';
import { NotificationsModule } from '../notifications/notifications.module';

/** Global so chat, reviews, admin and payments can schedule messages. */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessagingAutomation,
      AutomationJob,
      WhatsAppContact,
      WhatsAppTemplate,
      Provider,
      User,
    ]),
    WhatsAppModule,
    NotificationsModule,
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationCronService,
    EngagementPushService,
    DealPushService,
    ChatPushService,
  ],
  exports: [AutomationsService],
})
export class AutomationsModule {}
