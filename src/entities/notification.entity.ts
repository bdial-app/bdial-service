import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type NotificationType =
  | 'chat_message'
  | 'review_received'
  | 'provider_status'
  | 'verification_update'
  | 'booking_update'
  | 'promotional'
  | 'system_announcement'
  | 'report_update'
  | 'new_enquiry';

export type NotificationSource = 'system' | 'admin';

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['batchId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: [
      'chat_message',
      'review_received',
      'provider_status',
      'verification_update',
      'booking_update',
      'promotional',
      'system_announcement',
      'report_update',
      'new_enquiry',
    ],
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({
    type: 'enum',
    enum: ['system', 'admin'],
    default: 'system',
  })
  source: NotificationSource;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
