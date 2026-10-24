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

/**
 * A badge a business holds, or held. The badges themselves and their rules
 * live in src/badges/badge-catalog.ts. A badge that's taken away is kept
 * with isActive false, so its history stays; at most one active row per
 * business and badge (a partial unique index, see the BadgesRework migration).
 */
@Entity('provider_badges')
@Index(['providerId', 'type', 'isActive'])
export class ProviderBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  /** A BadgeKey from the catalogue. */
  @Column({ type: 'varchar', length: 40 })
  type: string;

  /** earned: worked out from the business's numbers; curated: given by the team. */
  @Column({ type: 'varchar', length: 20, default: 'earned' })
  source: 'earned' | 'curated';

  /** Why the team gave it (curated badges). */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** The admin who gave it (curated badges). */
  @Column({ name: 'awarded_by', type: 'uuid', nullable: true })
  awardedBy: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
}
