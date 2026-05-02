import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Verification } from './verification.entity';
import { Review } from './review.entity';
import { ReviewReport } from './review-report.entity';
import { Provider } from './provider.entity';
import { Report } from './report.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mobile_number', type: 'varchar', length: 15, nullable: true, unique: true })
  mobileNumber: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'] })
  gender: string;

  @Column({ type: 'enum', enum: ['customer', 'admin'], default: 'customer' })
  role: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'deleted', 'paused'], default: 'active' })
  status: string;

  @Column({ name: 'paused_at', type: 'timestamptz', nullable: true })
  @Exclude()
  pausedAt: Date | null;

  @Column({ name: 'archive_reason', type: 'varchar', length: 50, nullable: true })
  @Exclude()
  archiveReason: string | null;

  @Column({ name: 'supabase_id', type: 'varchar', length: 100, nullable: true, unique: true })
  @Exclude()
  supabaseId: string | null;

  @Column({ name: 'google_id', type: 'varchar', length: 150, nullable: true, unique: true })
  @Exclude()
  googleId: string | null;

  @Column({ name: 'google_email', type: 'varchar', length: 150, nullable: true })
  @Exclude()
  googleEmail: string | null;

  @Column({ name: 'google_name', type: 'varchar', length: 150, nullable: true })
  googleName: string | null;

  @Column({ name: 'sso_provider', type: 'varchar', length: 50, nullable: true })
  ssoProvider: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  @Exclude()
  deletedAt: Date | null;

  @Column({ name: 'preferred_mode', type: 'varchar', length: 20, default: 'customer' })
  preferredMode: string;

  @Column({ name: 'preferred_language', type: 'varchar', length: 10, default: 'en' })
  preferredLanguage: string;

  @Column({ name: 'preferred_category_ids', type: 'uuid', array: true, nullable: true, default: null })
  preferredCategoryIds: string[] | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations

  @OneToOne(() => Verification, (v) => v.user)
  verification: Verification;

  @OneToMany(() => Review, (r) => r.reviewer)
  reviews: Review[];

  @OneToMany(() => ReviewReport, (r) => r.reporter)
  reviewReports: ReviewReport[];

  @OneToMany(() => Review, (r) => r.moderator)
  moderatedReviews: Review[];

  @OneToMany(() => Verification, (v) => v.reviewer)
  reviewedVerifications: Verification[];

  @OneToOne(() => Provider, (p) => p.user)
  provider: Provider;

  @OneToMany(() => Report, (r) => r.reporter)
  reports: Report[];
}
