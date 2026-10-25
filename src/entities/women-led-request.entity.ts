import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WomenLedRole = 'owner' | 'co_owner' | 'runs_it';
export type WomenLedRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'ended';
export type WomenLedRequestSource =
  | 'owner'
  | 'onboarding'
  | 'admin'
  | 'import'
  | 'legacy';
export type WomenLedEndReason = 'turned_off' | 'revoked';

/**
 * One request for a business's Women-Led badge, and what became of it: who
 * the woman is and her role, optional proof (stored privately), the team's
 * decision with its reason, and — once approved — when and why it ended
 * (the owner turned it off, or the team revoked it).
 *
 * The provider's women_led_status follows the latest request; is_women_led
 * is true only while one is approved and not ended.
 */
@Entity('women_led_requests')
@Index(['providerId', 'createdAt'])
export class WomenLedRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'owner' })
  source: WomenLedRequestSource;

  /** The owner who asked, or the admin who recorded it. */
  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @Column({ name: 'woman_name', type: 'varchar', length: 100 })
  womanName: string;

  @Column({ type: 'varchar', length: 20 })
  role: WomenLedRole;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  /** Private storage key of optional proof (never a public URL). */
  @Column({
    name: 'evidence_key',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  evidenceKey: string | null;

  @Column({
    name: 'evidence_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  evidenceName: string | null;

  @Column({
    name: 'evidence_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  evidenceType: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: WomenLedRequestStatus;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  /** Approval note, or the reason it wasn't approved (shown to the owner). */
  @Column({
    name: 'decision_note',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  decisionNote: string | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'ended_by', type: 'uuid', nullable: true })
  endedBy: string | null;

  @Column({ name: 'ended_reason', type: 'varchar', length: 20, nullable: true })
  endedReason: WomenLedEndReason | null;

  /** Why the team revoked it, or the owner's note when turning it off. */
  @Column({ name: 'end_note', type: 'varchar', length: 500, nullable: true })
  endNote: string | null;
}
