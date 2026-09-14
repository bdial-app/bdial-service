import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ProviderCategory } from './provider-category.entity';
import { Photo } from './photo.entity';
import { Product } from './product.entity';
import { Review } from './review.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

@Entity('providers')
@Index(['status', 'city'])
@Index(['isWomenLed', 'status'])
@Index(['communityVerified', 'status'])
@Index(['latitude', 'longitude'])
@Index(['isFeatured', 'status'])
@Index(['createdAt'])
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 150 })
  brandName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

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

  @Column({ name: 'contact_number', type: 'varchar', length: 15 })
  contactNumber: string;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string | null;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string | null;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ name: 'profile_photo_url', type: 'varchar', length: 500, nullable: true })
  profilePhotoUrl: string | null;

  @Column({ name: 'banner_image_url', type: 'varchar', length: 500, nullable: true })
  bannerImageUrl: string | null;

  @Column({ name: 'is_women_led', type: 'boolean', default: false })
  isWomenLed: boolean;

  @Column({ name: 'women_led_status', type: 'varchar', length: 20, default: 'none' })
  womenLedStatus: 'none' | 'pending' | 'approved' | 'rejected';

  @Column({ name: 'women_led_reviewed_at', type: 'timestamptz', nullable: true })
  womenLedReviewedAt: Date | null;

  @Column({ name: 'women_led_reviewed_by', type: 'uuid', nullable: true })
  womenLedReviewedBy: string | null;

  @Column({ name: 'community_verified', type: 'boolean', default: false })
  communityVerified: boolean;

  @Column({ type: 'enum', enum: ['unverified', 'active', 'suspended', 'disabled'], default: 'unverified' })
  status: 'unverified' | 'active' | 'suspended' | 'disabled';

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'text', array: true, nullable: true, default: null })
  keywords: string[] | null;

  @Column({ name: 'gateway_customer_id', type: 'varchar', length: 255, nullable: true })
  gatewayCustomerId: string | null;

  @Column({ name: 'free_leads_used_this_month', type: 'int', default: 0 })
  freeLeadsUsedThisMonth: number;

  @Column({ name: 'free_leads_reset_at', type: 'timestamptz', nullable: true })
  freeLeadsResetAt: Date | null;

  @Column({ name: 'free_deals_created', type: 'int', default: 0 })
  freeDealsCreated: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'disabled_at', type: 'timestamptz', nullable: true })
  disabledAt: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ name: 'suspension_confirmed', type: 'boolean', default: false })
  suspensionConfirmed: boolean;

  @Column({ name: 'last_contact_number_change_at', type: 'timestamptz', nullable: true })
  lastContactNumberChangeAt: Date | null;

  @Column({ name: 'website_url', type: 'varchar', length: 512, nullable: true })
  websiteUrl: string | null;

  @Column({ name: 'website_logo_url', type: 'varchar', length: 512, nullable: true })
  websiteLogoUrl: string | null;

  @Column({ name: 'instagram_handle', type: 'varchar', length: 64, nullable: true })
  instagramHandle: string | null;

  @Column({ name: 'facebook_handle', type: 'varchar', length: 128, nullable: true })
  facebookHandle: string | null;

  @Column({ name: 'youtube_handle', type: 'varchar', length: 128, nullable: true })
  youtubeHandle: string | null;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 20, nullable: true })
  whatsappNumber: string | null;

  @Column({ name: 'linkedin_handle', type: 'varchar', length: 128, nullable: true })
  linkedinHandle: string | null;

  // ── Google Reviews Integration ──
  @Column({ name: 'google_place_id', type: 'varchar', length: 255, nullable: true })
  googlePlaceId: string | null;

  @Column({ name: 'google_rating', type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DecimalTransformer })
  googleRating: number | null;

  @Column({ name: 'google_review_count', type: 'int', nullable: true })
  googleReviewCount: number | null;

  @Column({ name: 'google_verified_at', type: 'timestamptz', nullable: true })
  googleVerifiedAt: Date | null;

  @Column({ name: 'google_last_fetched_at', type: 'timestamptz', nullable: true })
  googleLastFetchedAt: Date | null;

  @Column({ name: 'combined_rating', type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: DecimalTransformer })
  combinedRating: number | null;

  @Column({ name: 'combined_review_count', type: 'int', nullable: true })
  combinedReviewCount: number | null;

  @Column({
    name: 'trust_level',
    type: 'enum',
    enum: ['unverified', 'basic', 'verified', 'trusted'],
    default: 'unverified',
  })
  trustLevel: 'unverified' | 'basic' | 'verified' | 'trusted';

  @OneToOne(() => User, (u) => u.provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ProviderCategory, (pc) => pc.provider)
  providerCategories: ProviderCategory[];

  @OneToMany(() => Photo, (p) => p.provider)
  photos: Photo[];

  @OneToMany(() => Product, (p) => p.provider)
  products: Product[];

  @OneToMany(() => Review, (r) => r.provider)
  reviews: Review[];
}
