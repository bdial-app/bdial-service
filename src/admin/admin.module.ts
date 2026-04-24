import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting } from '../entities';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
