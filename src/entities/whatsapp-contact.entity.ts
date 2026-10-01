import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Provider } from './provider.entity';
import { User } from './user.entity';

export type WhatsAppConsent = 'unknown' | 'opted_in' | 'opted_out';
export const WHATSAPP_CONSENT_VALUES: WhatsAppConsent[] = [
  'unknown',
  'opted_in',
  'opted_out',
];

/** One row per phone number we have targeted or heard from. */
@Entity('whatsapp_contacts')
@Index(['providerId'])
export class WhatsAppContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** E.164 with leading "+", e.g. +919876543210 */
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  displayName: string | null;

  @Column({
    type: 'enum',
    enum: WHATSAPP_CONSENT_VALUES,
    enumName: 'whatsapp_consent_enum',
    default: 'unknown',
  })
  consent: WhatsAppConsent;

  @Column({ name: 'consent_changed_at', type: 'timestamptz', nullable: true })
  consentChangedAt: Date | null;

  @Column({
    name: 'consent_source',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  consentSource: string | null;

  @Column({ type: 'boolean', default: true })
  reachable: boolean;

  @Column({ name: 'last_inbound_at', type: 'timestamptz', nullable: true })
  lastInboundAt: Date | null;

  @Column({ name: 'last_outbound_at', type: 'timestamptz', nullable: true })
  lastOutboundAt: Date | null;

  @Column({ name: 'last_marketing_at', type: 'timestamptz', nullable: true })
  lastMarketingAt: Date | null;

  @Column({ name: 'last_cap_hit_at', type: 'timestamptz', nullable: true })
  lastCapHitAt: Date | null;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Provider, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
