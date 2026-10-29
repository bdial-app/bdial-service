import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminLeadsService } from './admin-leads.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProviderEnrichmentService } from './provider-enrichment.service';
import { ProviderLocationService } from './provider-location.service';
import { ProductBulkService } from './product-bulk.service';
import { GeocodeModule } from '../geocode/geocode.module';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, UserArchive, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, Photo, ReviewPhoto, Payment, ServiceableCity, GeocodeCache } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BugReport } from '../bug-reports/bug-report.entity';
import { StorageModule } from '../storage/storage.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServiceableCitiesModule } from '../serviceable-cities/serviceable-cities.module';
import { GoogleReviewsModule } from '../google-reviews/google-reviews.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    TypeOrmModule.forFeature([Provider, User, UserArchive, Verification, Review, ReviewPhoto, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, BugReport, Photo, Payment, ServiceableCity, GeocodeCache]),
    NotificationsModule,
    ServiceableCitiesModule,
    GoogleReviewsModule,
    GeocodeModule,
    ProvidersModule,
    WhatsAppModule,
    AnalyticsModule,
  ],
  controllers: [AdminController, AdminLeadsController],
  providers: [ProductBulkService, AdminService, AdminLeadsService, ProviderEnrichmentService, ProviderLocationService],
})
export class AdminModule {}
