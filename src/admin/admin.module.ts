import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BugReport } from '../bug-reports/bug-report.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, BugReport]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
