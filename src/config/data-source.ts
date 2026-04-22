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
];

export function buildTypeOrmOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ALL_ENTITIES,
    synchronize: true,
  };
}

/** Used by TypeORM CLI for migrations */
export const AppDataSource = new DataSource(
  buildTypeOrmOptions(process.env.DATABASE_URL ?? ''),
);
