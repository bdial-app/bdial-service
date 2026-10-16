import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * tijarahapp.in/go?c=<code>: opens a screen in the app, or the right app
 * store when the app isn't installed. Tied to the person it was sent to, so
 * the app can open the same screen after they install and sign in.
 */
@Entity('go_links')
export class GoLink {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  code: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  /** The in-app route, e.g. /chat?id=… */
  @Column({ type: 'varchar', length: 500 })
  target: string;

  @Column({
    name: 'automation_key',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  automationKey: string | null;

  @Column({ name: 'open_count', type: 'int', default: 0 })
  openCount: number;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt: Date | null;

  /** Opened without the app: offer this screen after they sign in, until then. */
  @Column({ name: 'pending_until', type: 'timestamptz', nullable: true })
  pendingUntil: Date | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;
}
