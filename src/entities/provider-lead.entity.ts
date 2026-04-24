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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
