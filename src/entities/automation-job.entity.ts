import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationJobStatus =
  | 'pending'
  | 'sent'
  | 'skipped'
  | 'cancelled'
  | 'failed';

/**
 * One automated message to one person: scheduled, then sent, skipped (with
 * the reason) or cancelled. Doubles as the send log admins see.
 */
@Entity('automation_jobs')
export class AutomationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'automation_key', type: 'varchar', length: 40 })
  automationKey: string;

  /** One event never sends twice: e.g. W1:conversation-id:2026-10-17T10. */
  @Column({ name: 'dedupe_key', type: 'varchar', length: 200, unique: true })
  dedupeKey: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AutomationJobStatus;

  @Column({ name: 'skip_reason', type: 'varchar', length: 80, nullable: true })
  skipReason: string | null;

  /** What the message is about: names, counts, ids for the link. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  context: Record<string, unknown>;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({
    name: 'cost_inr',
    type: 'numeric',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  costInr: string | null;
}
