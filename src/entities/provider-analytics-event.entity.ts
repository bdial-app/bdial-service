import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

export type AnalyticsEventType =
  | 'profile_view'
  | 'product_view'
  | 'search_appearance'
  | 'search_click'
  | 'chat_initiated'
  | 'call_clicked'
  | 'direction_clicked'
  | 'share_clicked'
  | 'saved'
  | 'unsaved'
  | 'offer_viewed'
  | 'photo_viewed'
  | 'review_read'
  | 'tab_switched';

export type AnalyticsSource =
  | 'home_feed'
  | 'explore'
  | 'search'
  | 'direct'
  | 'saved'
  | 'chat'
  | 'product_link';

@Entity('provider_analytics_events')
@Index(['providerId', 'createdAt'])
@Index(['userId', 'providerId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class ProviderAnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: [
      'profile_view', 'product_view', 'search_appearance', 'search_click',
      'chat_initiated', 'call_clicked', 'direction_clicked', 'share_clicked',
      'saved', 'unsaved', 'offer_viewed', 'photo_viewed', 'review_read', 'tab_switched',
    ],
  })
  eventType: AnalyticsEventType;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({
    type: 'enum',
    enum: ['home_feed', 'explore', 'search', 'direct', 'saved', 'chat', 'product_link'],
    nullable: true,
  })
  source: AnalyticsSource | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
