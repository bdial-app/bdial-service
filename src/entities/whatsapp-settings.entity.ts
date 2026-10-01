import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export interface WhatsAppRates {
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
}

export interface WhatsAppPhoneMeta {
  display_phone_number?: string | null;
  verified_name?: string | null;
  quality_rating?: string | null;
  messaging_limit_tier?: string | null;
  name_status?: string | null;
  code_verification_status?: string | null;
  fetched_at?: string | null;
}

/**
 * Single-row (id = 1) configuration for the WhatsApp marketing module.
 * Credentials live in env; only operational knobs are stored here.
 */
@Entity('whatsapp_settings')
export class WhatsAppSettings {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'daily_cap', type: 'int', default: 1000 })
  dailyCap: number;

  @Column({ name: 'rate_per_minute', type: 'int', default: 60 })
  ratePerMinute: number;

  @Column({ name: 'send_window_start', type: 'smallint', default: 9 })
  sendWindowStart: number;

  @Column({ name: 'send_window_end', type: 'smallint', default: 21 })
  sendWindowEnd: number;

  @Column({
    name: 'opt_out_keywords',
    type: 'text',
    array: true,
    default: '{STOP,UNSUBSCRIBE,CANCEL}',
  })
  optOutKeywords: string[];

  @Column({
    name: 'opt_in_keywords',
    type: 'text',
    array: true,
    default: '{START,SUBSCRIBE}',
  })
  optInKeywords: string[];

  @Column({
    type: 'jsonb',
    default: () =>
      `'{"marketing":0.8631,"utility":0.115,"authentication":0.115,"service":0}'`,
  })
  rates: WhatsAppRates;

  @Column({
    name: 'require_opt_in_for_marketing',
    type: 'boolean',
    default: false,
  })
  requireOptInForMarketing: boolean;

  @Column({ name: 'phone_meta', type: 'jsonb', nullable: true })
  phoneMeta: WhatsAppPhoneMeta | null;

  @Column({
    name: 'webhook_last_event_at',
    type: 'timestamptz',
    nullable: true,
  })
  webhookLastEventAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
