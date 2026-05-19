import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type ReportEntityType = 'provider' | 'product' | 'message' | 'deal' | 'review' | 'customer';

export type ReportReason =
  // Provider reasons
  | 'fake_business'
  | 'inappropriate_content'
  | 'fraud_scam'
  | 'harassment'
  | 'impersonation'
  | 'wrong_category'
  // Product reasons
  | 'fake_product'
  | 'counterfeit'
  | 'prohibited_item'
  | 'wrong_price'
  // Message reasons
  | 'spam'
  | 'fraud'
  // Deal reasons
  | 'misleading_offer'
  | 'expired_deal'
  | 'fake_discount'
  // Review reasons
  | 'fake_review'
  | 'offensive_language'
  | 'irrelevant_content'
  // Customer reasons
  | 'abusive_behavior'
  | 'fake_account'
  | 'spam_messages'
  // Shared
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'action_taken' | 'dismissed';

export type ReportAdminAction = 'warning' | 'suspend' | 'ban';

@Entity('reports')
@Index(['entityType', 'entityId'])
@Index(['reporterId'])
@Index(['status', 'createdAt'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: ['provider', 'product', 'message', 'deal', 'review', 'customer'],
  })
  entityType: ReportEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({
    type: 'enum',
    enum: [
      'fake_business',
      'inappropriate_content',
      'fraud_scam',
      'harassment',
      'impersonation',
      'wrong_category',
      'fake_product',
      'counterfeit',
      'prohibited_item',
      'wrong_price',
      'spam',
      'fraud',
      'misleading_offer',
      'expired_deal',
      'fake_discount',
      'fake_review',
      'offensive_language',
      'irrelevant_content',
      'abusive_behavior',
      'fake_account',
      'spam_messages',
      'other',
    ],
  })
  reason: ReportReason;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'under_review', 'action_taken', 'dismissed'],
    default: 'pending',
  })
  status: ReportStatus;

  @Column({
    name: 'admin_action',
    type: 'enum',
    enum: ['warning', 'suspend', 'ban'],
    nullable: true,
  })
  adminAction: ReportAdminAction | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.reports, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
