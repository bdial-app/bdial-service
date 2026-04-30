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

export type VoucherDiscountType = 'percentage' | 'fixed_amount';

@Entity('vouchers')
@Index(['code'], { unique: true })
@Index(['isActive', 'validFrom', 'validUntil'])
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: ['percentage', 'fixed_amount'],
  })
  discountType: VoucherDiscountType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'max_uses_per_provider', type: 'int', nullable: true })
  maxUsesPerProvider: number | null;

  @Column({ name: 'min_purchase_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPurchaseAmount: number | null;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ name: 'applicable_to', type: 'text', array: true, nullable: true })
  applicableTo: string[] | null;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamptz' })
  validUntil: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
