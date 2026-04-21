import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Listing } from '../entities/listing.entity';
import { ListingCategory } from '../entities/listing-category.entity';
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

export const ALL_ENTITIES = [
  User,
  Category,
  Listing,
  ListingCategory,
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
