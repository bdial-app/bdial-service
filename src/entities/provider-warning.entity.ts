import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type ProviderWarningType = 'report_warning' | 'policy_violation' | 'content_warning';

@Entity('provider_warnings')
@Index(['providerId', 'createdAt'])
@Index(['isRead'])
export class ProviderWarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({
    type: 'enum',
    enum: ['report_warning', 'policy_violation', 'content_warning'],
    default: 'report_warning',
  })
  warningType: ProviderWarningType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'report_id', type: 'uuid', nullable: true })
  reportId: string | null;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'issued_by' })
  issuer: User | null;
}
