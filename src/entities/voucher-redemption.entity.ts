import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Voucher } from './voucher.entity';
import { Provider } from './provider.entity';
import { Payment } from './payment.entity';

@Entity('voucher_redemptions')
@Index(['voucherId', 'providerId'])
export class VoucherRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @CreateDateColumn({ name: 'redeemed_at' })
  redeemedAt: Date;

  @ManyToOne(() => Voucher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;
}
