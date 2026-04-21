import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';
import { ListingCategory } from './listing-category.entity';
import { Photo } from './photo.entity';
import { Product } from './product.entity';
import { Review } from './review.entity';

@Entity('listings')
@Index(['status', 'city'])
@Index(['isWomenLed', 'status'])
@Index(['providerId'])
@Index(['communityVerified', 'status'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ name: 'business_name', type: 'varchar', length: 150 })
  businessName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 15, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ name: 'is_women_led', type: 'boolean', default: false })
  isWomenLed: boolean;

  @Column({ name: 'community_verified', type: 'boolean', default: false })
  communityVerified: boolean;

  @Column({ type: 'enum', enum: ['pending', 'live', 'rejected', 'inactive'], default: 'pending' })
  status: string;

  @Column({ name: 'rejection_note', type: 'text', nullable: true })
  rejectionNote: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'now()' })
  submittedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Provider, (p) => p.listings)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @OneToMany(() => ListingCategory, (lc) => lc.listing)
  listingCategories: ListingCategory[];

  @OneToMany(() => Photo, (p) => p.listing)
  photos: Photo[];

  @OneToMany(() => Product, (p) => p.listing)
  products: Product[];

  @OneToMany(() => Review, (r) => r.listing)
  reviews: Review[];
}
