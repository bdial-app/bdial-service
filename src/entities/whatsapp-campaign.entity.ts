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
import {
  WhatsAppTemplate,
  WhatsAppVariableSource,
} from './whatsapp-template.entity';
import { User } from './user.entity';

export type WhatsAppCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';
export const WHATSAPP_CAMPAIGN_STATUS_VALUES: WhatsAppCampaignStatus[] = [
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'cancelled',
  'failed',
];

export interface WhatsAppVariableMappingEntry {
  source: WhatsAppVariableSource;
  value?: string;
}

/** Keyed by variable index as a string: { "1": { source: 'brand_name' } } */
export type WhatsAppVariableMapping = Record<
  string,
  WhatsAppVariableMappingEntry
>;

const numericTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | number | null) => (v === null ? 0 : Number(v)),
};

@Entity('whatsapp_campaigns')
@Index(['status'])
@Index(['templateId'])
export class WhatsAppCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  /** AudienceFilters snapshot */
  @Column({ type: 'jsonb', default: () => `'{}'` })
  audience: Record<string, unknown>;

  @Column({ name: 'variable_mapping', type: 'jsonb', default: () => `'{}'` })
  variableMapping: WhatsAppVariableMapping;

  @Column({
    name: 'header_media_url',
    type: 'varchar',
    length: 600,
    nullable: true,
  })
  headerMediaUrl: string | null;

  /** { "0": { source: 'profile_url' } } per URL button index */
  @Column({ name: 'button_url_params', type: 'jsonb', nullable: true })
  buttonUrlParams: WhatsAppVariableMapping | null;

  @Column({
    type: 'enum',
    enum: WHATSAPP_CAMPAIGN_STATUS_VALUES,
    enumName: 'whatsapp_campaign_status_enum',
    default: 'draft',
  })
  status: WhatsAppCampaignStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'rate_per_minute', type: 'int', nullable: true })
  ratePerMinute: number | null;

  @Column({ name: 'total_recipients', type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ name: 'queued_count', type: 'int', default: 0 })
  queuedCount: number;

  @Column({ name: 'sent_count', type: 'int', default: 0 })
  sentCount: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'read_count', type: 'int', default: 0 })
  readCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'skipped_count', type: 'int', default: 0 })
  skippedCount: number;

  @Column({ name: 'replied_count', type: 'int', default: 0 })
  repliedCount: number;

  @Column({
    name: 'estimated_cost_inr',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  estimatedCostInr: number;

  @Column({
    name: 'actual_cost_inr',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  actualCostInr: number;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WhatsAppTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: WhatsAppTemplate;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
