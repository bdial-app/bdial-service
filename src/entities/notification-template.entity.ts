import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Each automated notification has a template row.
 * Admin can toggle active/inactive and edit content.
 */
@Entity('notification_templates')
@Index(['slug'], { unique: true })
@Index(['type'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique machine-readable identifier, e.g. "welcome", "payment_success" */
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  /** Human-readable name for admin UI */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Description of when this notification fires */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Notification category type */
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
      'payment_update',
      'voucher_update',
      'subscription_update',
      'invite_update',
    ],
  })
  type: string;

  /** Template title — supports {{variable}} interpolation */
  @Column({ name: 'title_template', type: 'varchar', length: 200 })
  titleTemplate: string;

  /** Template body — supports {{variable}} interpolation */
  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate: string;

  /** Variables this template expects, e.g. ["userName", "amount"] */
  @Column({ type: 'jsonb', default: [] })
  variables: string[];

  /** Category for admin grouping: onboarding, transactional, engagement, marketing */
  @Column({ type: 'varchar', length: 50, default: 'transactional' })
  category: string;

  /** Whether this notification is active — admin master switch */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Deep-link route template, e.g. "/provider-details/{{providerId}}" */
  @Column({ name: 'default_route', type: 'varchar', length: 300, nullable: true })
  defaultRoute: string | null;

  /** Optional default image URL */
  @Column({ name: 'default_image_url', type: 'varchar', length: 500, nullable: true })
  defaultImageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
