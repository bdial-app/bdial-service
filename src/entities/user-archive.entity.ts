import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';

/**
 * Stores non-PII audit data for deleted user accounts.
 * The original user row is hard-deleted from `users` after archiving here.
 */
@Entity('user_archives')
export class UserArchive {
  /** Same UUID as the original user — preserves audit trail linkage */
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'varchar', length: 10 })
  gender: string;

  @Column({ name: 'archive_reason', type: 'varchar', length: 50 })
  archiveReason: string;

  /** Admin who deleted the account, or null if self-deleted */
  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;

  @Column({ name: 'original_created_at', type: 'timestamptz' })
  originalCreatedAt: Date;

  @CreateDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
