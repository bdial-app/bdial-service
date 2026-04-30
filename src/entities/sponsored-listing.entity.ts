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
import { Provider } from './provider.entity';
import { Payment } from './payment.entity';

@Entity('sponsored_listings')
@Index(['providerId', 'isActive'])
@Index(['isActive', 'startsAt', 'endsAt'])
export class SponsoredListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({
    type: 'enum',
    enum: ['carousel', 'inline', 'top_result'],
    default: 'carousel',
  })
  type: 'carousel' | 'inline' | 'top_result';

  @Column({ name: 'budget_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  budgetAmount: number;

  @Column({ name: 'spent_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ name: 'cost_per_click', type: 'decimal', precision: 10, scale: 2, default: 5.0 })
  costPerClick: number;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ name: 'target_category_ids', type: 'uuid', array: true, nullable: true })
  targetCategoryIds: string[] | null;

  @Column({ name: 'target_cities', type: 'text', array: true, nullable: true })
  targetCities: string[] | null;

  @Column({ name: 'target_radius', type: 'int', nullable: true })
  targetRadius: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'approved',
  })
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;
}
