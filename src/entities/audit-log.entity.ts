import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previousState: Record<string, any> | null;

  @Column({ name: 'new_state', type: 'jsonb', nullable: true })
  newState: Record<string, any> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;
}
