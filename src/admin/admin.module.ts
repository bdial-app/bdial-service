import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, Photo, ReviewPhoto } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BugReport } from '../bug-reports/bug-report.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Provider, User, Verification, Review, ReviewPhoto, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, BugReport, Photo]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
