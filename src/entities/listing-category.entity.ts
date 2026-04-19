import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Listing } from './listing.entity';
import { Category } from './category.entity';

@Entity('listing_categories')
@Unique(['listingId', 'categoryId'])
@Index(['categoryId', 'listingId'])
export class ListingCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Listing, (l) => l.listingCategories)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @ManyToOne(() => Category, (c) => c.listingCategories)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
