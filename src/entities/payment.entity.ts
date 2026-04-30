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

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type PaymentType = 'sponsorship' | 'lead_unlock' | 'badge' | 'subscription' | 'deal_unlock';

@Entity('payments')
@Index(['providerId', 'status'])
@Index(['stripePaymentIntentId'])
@Index(['stripeCheckoutSessionId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 255, nullable: true, unique: true })
  stripePaymentIntentId: string | null;

  @Column({ name: 'stripe_checkout_session_id', type: 'varchar', length: 255, nullable: true, unique: true })
  stripeCheckoutSessionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    default: 'pending',
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: ['sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock'],
  })
  type: PaymentType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId: string | null;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'stripe_receipt_url', type: 'text', nullable: true })
  stripeReceiptUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
}
