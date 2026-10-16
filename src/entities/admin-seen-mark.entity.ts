import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * When an admin last opened a section of the admin (Users, Reviews, Logs…).
 * Anything newer shows as "new" on that section in their sidebar. One row
 * per admin per section; kept on the server so it follows them across devices.
 */
@Entity('admin_seen_marks')
export class AdminSeenMark {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  section: string;

  @Column({ name: 'seen_at', type: 'timestamptz' })
  seenAt: Date;
}
