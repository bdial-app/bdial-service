import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type WhatsAppTemplateCategory =
  | 'marketing'
  | 'utility'
  | 'authentication';
export const WHATSAPP_TEMPLATE_CATEGORY_VALUES: WhatsAppTemplateCategory[] = [
  'marketing',
  'utility',
  'authentication',
];

export type WhatsAppTemplateStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paused'
  | 'disabled';
export const WHATSAPP_TEMPLATE_STATUS_VALUES: WhatsAppTemplateStatus[] = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'paused',
  'disabled',
];

export type WhatsAppVariableSource =
  | 'brand_name'
  | 'owner_name'
  | 'city'
  | 'category'
  | 'profile_url'
  | 'products_count'
  | 'visits_7d'
  | 'enquiries_7d'
  | 'app_download_url'
  | 'custom';
export const WHATSAPP_VARIABLE_SOURCES: WhatsAppVariableSource[] = [
  'brand_name',
  'owner_name',
  'city',
  'category',
  'profile_url',
  'products_count',
  'visits_7d',
  'enquiries_7d',
  'app_download_url',
  'custom',
];

export type WhatsAppVariableLocation = 'body' | 'header' | 'button';

export interface WhatsAppTemplateVariable {
  index: number;
  location: WhatsAppVariableLocation;
  label: string;
  source: WhatsAppVariableSource;
  sample: string;
}

export interface WhatsAppTemplateButton {
  type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: Record<string, unknown>;
  buttons?: WhatsAppTemplateButton[];
}

/** Local mirror of a Meta message template plus our variable metadata. */
@Entity('whatsapp_templates')
@Index(['name', 'language'], { unique: true })
export class WhatsAppTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 512 })
  name: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({
    type: 'enum',
    enum: WHATSAPP_TEMPLATE_CATEGORY_VALUES,
    enumName: 'whatsapp_template_category_enum',
  })
  category: WhatsAppTemplateCategory;

  @Column({
    type: 'enum',
    enum: WHATSAPP_TEMPLATE_STATUS_VALUES,
    enumName: 'whatsapp_template_status_enum',
    default: 'draft',
  })
  status: WhatsAppTemplateStatus;

  @Column({
    name: 'meta_template_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  metaTemplateId: string | null;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  components: WhatsAppTemplateComponent[];

  @Column({ type: 'jsonb', default: () => `'[]'` })
  variables: WhatsAppTemplateVariable[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string | null;

  @Column({
    name: 'quality_score',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  qualityScore: string | null;

  @Column({ name: 'is_seed', type: 'boolean', default: false })
  isSeed: boolean;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
