import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('provider_badges')
@Index(['providerId', 'type', 'isActive'])
export class ProviderBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({
    type: 'enum',
    enum: ['gold_seller', 'top_rated', 'express_service', 'trusted', 'rising_star'],
  })
  type: 'gold_seller' | 'top_rated' | 'express_service' | 'trusted' | 'rising_star';

  @Column({
    type: 'enum',
    enum: ['paid', 'earned'],
    default: 'earned',
  })
  source: 'paid' | 'earned';

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
}
