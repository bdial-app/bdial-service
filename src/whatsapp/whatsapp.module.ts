import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { WhatsAppSettings } from '../entities/whatsapp-settings.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { WhatsAppSegment } from '../entities/whatsapp-segment.entity';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppVariableService } from './whatsapp-variable.service';
import { WhatsAppAudienceService } from './whatsapp-audience.service';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { WhatsAppCampaignService } from './whatsapp-campaign.service';
import { WhatsAppSendWorkerService } from './whatsapp-send-worker.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { WhatsAppOverviewService } from './whatsapp-overview.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { AdminWhatsAppController } from './admin-whatsapp.controller';

/**
 * Admin-driven WhatsApp marketing through Meta's Cloud API.
 * Loads without WHATSAPP_* env (endpoints answer configured=false).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsAppSettings,
      WhatsAppContact,
      WhatsAppTemplate,
      WhatsAppSegment,
      WhatsAppCampaign,
      WhatsAppMessage,
      Provider,
      Category,
      User,
    ]),
  ],
  controllers: [WhatsAppWebhookController, AdminWhatsAppController],
  providers: [
    MetaCloudApiService,
    WhatsAppSettingsService,
    WhatsAppTemplateService,
    WhatsAppVariableService,
    WhatsAppAudienceService,
    WhatsAppInboxService,
    WhatsAppCampaignService,
    WhatsAppSendWorkerService,
    WhatsAppWebhookService,
    WhatsAppOverviewService,
  ],
  exports: [WhatsAppInboxService, WhatsAppTemplateService, MetaCloudApiService],
})
export class WhatsAppModule {}
