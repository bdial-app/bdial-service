import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Every change to someone's WhatsApp consent: what they chose, where, how
 * (for consent an admin recorded) and the wording they agreed to. Kept as
 * a record of consent; whatsapp_contacts holds the current state.
 */
@Entity('whatsapp_consent_events')
@Index(['phone', 'createdAt'])
@Index(['providerId', 'createdAt'])
export class WhatsAppConsentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  /** opted_in · opted_out · later (asked, chose "Not now") */
  @Column({ type: 'varchar', length: 20 })
  consent: string;

  /** app_onboarding · app_prompt · app_settings · app_home_card · app_dashboard_card · admin_recorded · bulk_import · admin · keyword */
  @Column({ type: 'varchar', length: 40 })
  source: string;

  /** How an admin got it: in_person · phone_call · paper_form · whatsapp_chat · import_file */
  @Column({ type: 'varchar', length: 30, nullable: true })
  method: string | null;

  /** The admin who recorded it. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /** Which consent text was shown, e.g. owner_alerts_v1. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  wording: string | null;
}
