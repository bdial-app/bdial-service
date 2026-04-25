import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../entities/user.entity';

export type BugReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

@Entity('bug_reports')
@Index(['status', 'createdAt'])
@Index(['reporterId'])
export class BugReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({
    type: 'enum',
    enum: ['crash', 'ui_issue', 'feature_not_working', 'performance', 'login_auth', 'payment', 'other'],
    default: 'other',
  })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'steps_to_reproduce', type: 'text', nullable: true })
  stepsToReproduce: string | null;

  @Column({ name: 'device_info', type: 'varchar', length: 200, nullable: true })
  deviceInfo: string | null;

  @Column({
    type: 'enum',
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  })
  status: BugReportStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;
}
