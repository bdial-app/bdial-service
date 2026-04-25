import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'chat_messages', type: 'boolean', default: true })
  chatMessages: boolean;

  @Column({ name: 'reviews_received', type: 'boolean', default: true })
  reviewsReceived: boolean;

  @Column({ name: 'provider_status_updates', type: 'boolean', default: true })
  providerStatusUpdates: boolean;

  @Column({ name: 'verification_updates', type: 'boolean', default: true })
  verificationUpdates: boolean;

  @Column({ name: 'booking_updates', type: 'boolean', default: true })
  bookingUpdates: boolean;

  @Column({ type: 'boolean', default: true })
  promotional: boolean;

  @Column({ name: 'system_announcements', type: 'boolean', default: true })
  systemAnnouncements: boolean;

  @Column({ name: 'quiet_hours_enabled', type: 'boolean', default: false })
  quietHoursEnabled: boolean;

  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart: string | null;

  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
