import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Provider } from './provider.entity';
import { User } from './user.entity';

export type LeadTier = 'hot' | 'warm' | 'soft' | 'cold';

/**
 * anonymous: no contact to sell · free: lead monetization off · plan: a
 * subscription credit (or unlimited plan) · quota: the free monthly unlocks ·
 * paid: bought, alone or in a bulk payment.
 */
export type LeadUnlockMethod = 'anonymous' | 'free' | 'plan' | 'quota' | 'paid';

@Entity('provider_leads')
@Index(['providerId', 'tier', 'createdAt'])
@Unique(['providerId', 'visitorKey'])
export class ProviderLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId: string;

  // Composite key for uniqueness: either the userId or 'anon:' + sessionId
  @Column({ name: 'visitor_key', type: 'varchar', length: 100 })
  visitorKey: string;

  @Column({
    type: 'enum',
    enum: ['hot', 'warm', 'soft', 'cold'],
  })
  tier: LeadTier;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({
    type: 'enum',
    enum: ['home_feed', 'explore', 'search', 'direct', 'saved', 'chat', 'product_link'],
    nullable: true,
  })
  source: string | null;

  @Column({ name: 'search_query', type: 'varchar', length: 255, nullable: true })
  searchQuery: string | null;

  @Column({ name: 'products_viewed', type: 'uuid', array: true, default: '{}' })
  productsViewed: string[];

  @Column({ name: 'actions_performed', type: 'text', array: true, default: '{}' })
  actionsPerformed: string[];

  @Column({ name: 'total_duration', type: 'int', default: 0 })
  totalDuration: number;

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'is_unlocked', type: 'boolean', default: false })
  isUnlocked: boolean;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true })
  unlockedAt: Date | null;

  /** How the contact was unlocked; null on leads unlocked before this was recorded. */
  @Column({ name: 'unlock_method', type: 'varchar', length: 10, nullable: true })
  unlockMethod: LeadUnlockMethod | null;

  @Column({ name: 'unlock_payment_id', type: 'uuid', nullable: true })
  unlockPaymentId: string | null;

  /** The business opened this lead in its leads screen. */
  @Column({ name: 'first_viewed_at', type: 'timestamptz', nullable: true })
  firstViewedAt: Date | null;

  @Column({ name: 'last_viewed_at', type: 'timestamptz', nullable: true })
  lastViewedAt: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
