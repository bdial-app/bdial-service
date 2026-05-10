import 'dotenv/config'; // load .env for TypeORM CLI (NestJS uses ConfigModule instead)
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { User } from '../entities/user.entity';
import { UserArchive } from '../entities/user-archive.entity';
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
import { NotificationTemplate } from '../entities/notification-template.entity';
import { BugReport } from '../bug-reports/bug-report.entity';
import { Payment } from '../entities/payment.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { UserCategoryInteraction } from '../entities/user-category-interaction.entity';
import { ServiceableCity } from '../entities/serviceable-city.entity';
import { CityRequest } from '../entities/city-request.entity';
import { truncate } from 'fs';

export const ALL_ENTITIES = [
  User,
  UserArchive,
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
  NotificationTemplate,
  BugReport,
  Payment,
  SubscriptionPlan,
  Subscription,
  Voucher,
  VoucherRedemption,
  UserCategoryInteraction,
  ServiceableCity,
  CityRequest,
];

export function buildTypeOrmOptions(url?: string): DataSourceOptions {
  // Resolve migrations from both TS (dev/CLI) and JS (compiled dist)
  const migrationsPath = join(__dirname, '..', 'migrations', '*{.ts,.js}');

  const base: Partial<DataSourceOptions> = {
    entities: ALL_ENTITIES,
    migrations: [migrationsPath],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: true, // auto-run pending migrations on app start
    synchronize: true,  // never use synchronize — migrations handle schema
    extra: {
      max: 3,
      idleTimeoutMillis: 5000,
    },
  };

  // Prefer individual env vars so special chars in passwords (e.g. @)
  // don't need URL-encoding — avoids %40 decoding issues on some hosts.
  if (process.env.DB_HOST) {
    return {
      ...base,
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '6543', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? 'postgres',
      ssl: { rejectUnauthorized: false },
    } as DataSourceOptions;
  }

  // Fallback: use connection URL (local dev)
  return {
    ...base,
    type: 'postgres',
    url,
  } as DataSourceOptions;
}

/** Used by TypeORM CLI for migrations */
export const AppDataSource = new DataSource(
  buildTypeOrmOptions(process.env.DATABASE_URL),
);
