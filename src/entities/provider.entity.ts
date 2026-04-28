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

  @Column({ name: 'community_verified', type: 'boolean', default: false })
  communityVerified: boolean;

  @Column({ type: 'enum', enum: ['pending', 'in_review', 'active', 'suspended', 'unverified', 'disabled'], default: 'pending' })
  status: 'pending' | 'in_review' | 'active' | 'suspended' | 'unverified' | 'disabled';

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'text', array: true, nullable: true, default: null })
  keywords: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

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
