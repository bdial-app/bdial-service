import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Saved "List your business" progress — one per user (see the migration). */
@Entity('provider_onboarding_drafts')
export class ProviderOnboardingDraft {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  data: Record<string, unknown>;

  @Column({ type: 'smallint', default: 1 })
  step: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
