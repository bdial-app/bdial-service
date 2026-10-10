import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type SystemLogSource = 'server' | 'app' | 'admin';
export type SystemLogLevel = 'error' | 'warn' | 'info';

/**
 * What the other tables don't record: server errors and rejected requests,
 * errors reported by the apps (crashes, failed API calls), and sign-in
 * problems. Read together with the rest of the activity in the admin Logs.
 * Pruned by SystemLogsService (info after 30 days, the rest after 90).
 */
@Entity('system_logs')
@Index(['createdAt'])
@Index(['level', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['category', 'createdAt'])
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Where it happened: the API server, the customer app, or the admin. */
  @Column({ type: 'varchar', length: 20 })
  source: SystemLogSource;

  @Column({ type: 'varchar', length: 10 })
  level: SystemLogLevel;

  /** http · client_error · api_error · auth */
  @Column({ type: 'varchar', length: 40 })
  category: string;

  /** A short code to filter on, e.g. http_500, otp_verify_failed, js_error. */
  @Column({ type: 'varchar', length: 120 })
  event: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  stack: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_role', type: 'varchar', length: 20, nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  path: string | null;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  /** Ties an app's failed call to the server's record of it (x-request-id). */
  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId: string | null;

  /** android · ios · web · admin */
  @Column({ type: 'varchar', length: 20, nullable: true })
  platform: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 30, nullable: true })
  appVersion: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;
}
