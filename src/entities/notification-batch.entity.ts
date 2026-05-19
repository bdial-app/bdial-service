import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export type BatchTargetType = 'all' | 'segment' | 'individual';

export type BatchStatus = 'draft' | 'sending' | 'sent' | 'failed';

@Entity('notification_batches')
export class NotificationBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ['all', 'segment', 'individual'],
  })
  targetType: BatchTargetType;

  @Column({ name: 'target_criteria', type: 'jsonb', nullable: true })
  targetCriteria: Record<string, any> | null;

  @Column({ name: 'sent_by', type: 'uuid', nullable: true })
  sentBy: string | null;

  @Column({ name: 'total_recipients', type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'read_count', type: 'int', default: 0 })
  readCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'sending', 'sent', 'failed'],
    default: 'draft',
  })
  status: BatchStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by' })
  sender: User | null;
}
