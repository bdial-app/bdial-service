import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ name: 'stripe_product_id', type: 'varchar', length: 255, nullable: true })
  stripeProductId: string | null;

  @Column({ name: 'stripe_price_id_monthly', type: 'varchar', length: 255, nullable: true })
  stripePriceIdMonthly: string | null;

  @Column({ name: 'stripe_price_id_yearly', type: 'varchar', length: 255, nullable: true })
  stripePriceIdYearly: string | null;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2 })
  priceYearly: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, any> | null;

  @Column({ name: 'max_active_deals', type: 'int', default: 3 })
  maxActiveDeals: number;

  @Column({ name: 'max_total_deals', type: 'int', default: 5 })
  maxTotalDeals: number;

  @Column({ name: 'monthly_lead_unlocks', type: 'int', default: 0 })
  monthlyLeadUnlocks: number;

  @Column({ name: 'sponsorship_types', type: 'text', array: true, nullable: true })
  sponsorshipTypes: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
