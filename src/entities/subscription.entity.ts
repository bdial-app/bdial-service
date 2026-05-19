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
import { SubscriptionPlan } from './subscription-plan.entity';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
export type SubscriptionGateway = 'razorpay' | 'apple';

@Entity('subscriptions')
@Index(['providerId'], { unique: true })
@Index(['gatewaySubscriptionId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid', unique: true })
  providerId: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({
    name: 'payment_gateway',
    type: 'varchar',
    length: 20,
    default: 'razorpay',
  })
  paymentGateway: SubscriptionGateway;

  @Column({ name: 'gateway_subscription_id', type: 'varchar', length: 255, unique: true })
  gatewaySubscriptionId: string;

  @Column({ name: 'gateway_customer_id', type: 'varchar', length: 255, nullable: true })
  gatewayCustomerId: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'past_due', 'canceled', 'trialing', 'paused'],
    default: 'active',
  })
  status: SubscriptionStatus;

  @Column({
    name: 'billing_interval',
    type: 'enum',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  })
  billingInterval: 'monthly' | 'yearly';

  @Column({ name: 'current_period_start', type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'lead_unlocks_used', type: 'int', default: 0 })
  leadUnlocksUsed: number;

  @Column({ name: 'lead_unlocks_reset_at', type: 'timestamptz', nullable: true })
  leadUnlocksResetAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;
}
