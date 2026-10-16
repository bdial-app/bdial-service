import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** An automated message admins can switch on or off (all start off). */
@Entity('messaging_automations')
export class MessagingAutomation {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /** Overrides of the automation's defaults (delays and limits). */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  settings: Record<string, unknown>;

  @Column({
    name: 'monthly_budget_inr',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  monthlyBudgetInr: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
