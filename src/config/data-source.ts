import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { ProviderCategory } from '../entities/provider-category.entity';
import { Verification } from '../entities/verification.entity';
import { Photo } from '../entities/photo.entity';
import { Product } from '../entities/product.entity';
import { Review } from '../entities/review.entity';
import { ReviewPhoto } from '../entities/review-photo.entity';
import { ReviewReport } from '../entities/review-report.entity';
import { Provider } from '../entities/provider.entity';
import { SavedLocation } from '../entities/saved-location.entity';
import { PromoBanner } from '../entities/promo-banner.entity';
import { Booking } from '../entities/booking.entity';
import { SavedItem } from '../entities/saved-item.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { Message } from '../entities/message.entity';
import { SearchLog } from '../entities/search-log.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { ProviderBadge } from '../entities/provider-badge.entity';
import { ProviderOffer } from '../entities/provider-offer.entity';
import { AdEvent } from '../entities/ad-event.entity';
import { AppInvite } from '../entities/app-invite.entity';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { ProviderLead } from '../entities/provider-lead.entity';
import { Report } from '../entities/report.entity';
import { ProviderWarning } from '../entities/provider-warning.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { DeviceToken } from '../entities/device-token.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationBatch } from '../entities/notification-batch.entity';

export const ALL_ENTITIES = [
  User,
  Category,
  ProviderCategory,
  Verification,
  Photo,
  Product,
  Review,
  ReviewPhoto,
  ReviewReport,
  Provider,
  SavedLocation,
  PromoBanner,
  Booking,
  SavedItem,
  Conversation,
  ConversationParticipant,
  Message,
  SearchLog,
  SponsoredListing,
  ProviderBadge,
  ProviderOffer,
  AdEvent,
  AppInvite,
  ProviderAnalyticsEvent,
  ProviderLead,
  Report,
  ProviderWarning,
  AuditLog,
  SystemSetting,
  DeviceToken,
  Notification,
  NotificationPreference,
  NotificationBatch,
];

export function buildTypeOrmOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ALL_ENTITIES,
    synchronize: process.env.NODE_ENV === 'development',
    // Small pool for Supabase free tier — max 3 concurrent DB connections.
    // PgBouncer transaction mode manages server-side connections itself,
    // so keepAlive is not useful here. Short idle timeout releases connections
    // quickly so PgBouncer can reuse its server-side slots.
    extra: {
      max: 3,
      idleTimeoutMillis: 5000,
    },
  };
}

/** Used by TypeORM CLI for migrations */
export const AppDataSource = new DataSource(
  buildTypeOrmOptions(process.env.DATABASE_URL ?? ''),
);
