import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ad_events')
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class AdEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: ['impression', 'click'],
  })
  eventType: 'impression' | 'click';

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: ['sponsored_listing', 'promo_banner', 'provider_offer'],
  })
  entityType: 'sponsored_listing' | 'promo_banner' | 'provider_offer';

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
