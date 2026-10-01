import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WhatsAppContact } from './whatsapp-contact.entity';
import { WhatsAppCampaign } from './whatsapp-campaign.entity';

export type WhatsAppDirection = 'outbound' | 'inbound';
export const WHATSAPP_DIRECTION_VALUES: WhatsAppDirection[] = [
  'outbound',
  'inbound',
];

export type WhatsAppMessageKind =
  | 'template'
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'location'
  | 'reaction'
  | 'unknown';
export const WHATSAPP_MESSAGE_KIND_VALUES: WhatsAppMessageKind[] = [
  'template',
  'text',
  'image',
  'document',
  'audio',
  'video',
  'sticker',
  'location',
  'reaction',
  'unknown',
];

export type WhatsAppMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped'
  | 'received';
export const WHATSAPP_MESSAGE_STATUS_VALUES: WhatsAppMessageStatus[] = [
  'queued',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped',
  'received',
];

export type WhatsAppSkipReason =
  | 'opted_out'
  | 'no_phone'
  | 'invalid_phone'
  | 'duplicate'
  | 'unreachable'
  | 'marketing_cap'
  | 'daily_cap'
  | 'cancelled';

const costTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | number | null) => (v === null ? 0 : Number(v)),
};

/**
 * Both directions. Outbound campaign rows double as the send queue
 * (claimed with FOR UPDATE SKIP LOCKED by the worker).
 */
@Entity('whatsapp_messages')
@Index(['status', 'sendAfter'])
@Index(['campaignId', 'status'])
@Index(['contactId', 'createdAt'])
@Index(['providerId', 'createdAt'])
export class WhatsAppMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @Column({
    type: 'enum',
    enum: WHATSAPP_DIRECTION_VALUES,
    enumName: 'whatsapp_direction_enum',
  })
  direction: WhatsAppDirection;

  @Column({
    type: 'enum',
    enum: WHATSAPP_MESSAGE_KIND_VALUES,
    enumName: 'whatsapp_message_kind_enum',
    default: 'template',
  })
  kind: WhatsAppMessageKind;

  @Column({
    type: 'enum',
    enum: WHATSAPP_MESSAGE_STATUS_VALUES,
    enumName: 'whatsapp_message_status_enum',
    default: 'queued',
  })
  status: WhatsAppMessageStatus;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({
    name: 'template_name',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  templateName: string | null;

  @Column({ name: 'rendered_body', type: 'text', nullable: true })
  renderedBody: string | null;

  /** Exact API request (outbound) or the webhook message object (inbound). */
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  /** Resolved variables: { "1": "Pronttera" } */
  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, string> | null;

  @Column({
    name: 'wa_message_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  waMessageId: string | null;

  @Column({ name: 'error_code', type: 'int', nullable: true })
  errorCode: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'skip_reason', type: 'varchar', length: 40, nullable: true })
  skipReason: WhatsAppSkipReason | null;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ name: 'send_after', type: 'timestamptz', nullable: true })
  sendAfter: Date | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  @Column({ type: 'boolean', nullable: true })
  billable: boolean | null;

  @Column({
    name: 'pricing_category',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  pricingCategory: string | null;

  @Column({
    name: 'cost_inr',
    type: 'numeric',
    precision: 8,
    scale: 4,
    default: 0,
    transformer: costTransformer,
  })
  costInr: number;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => WhatsAppContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: WhatsAppContact;

  @ManyToOne(() => WhatsAppCampaign, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: WhatsAppCampaign | null;
}
