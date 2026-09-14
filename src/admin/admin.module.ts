import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, UserArchive, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, Photo, ReviewPhoto, Payment } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BugReport } from '../bug-reports/bug-report.entity';
import { StorageModule } from '../storage/storage.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServiceableCitiesModule } from '../serviceable-cities/serviceable-cities.module';
import { GoogleReviewsModule } from '../google-reviews/google-reviews.module';

@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    TypeOrmModule.forFeature([Provider, User, UserArchive, Verification, Review, ReviewPhoto, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, BugReport, Photo, Payment]),
    NotificationsModule,
    ServiceableCitiesModule,
    GoogleReviewsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
