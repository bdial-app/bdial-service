import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type DevicePlatform = 'web' | 'android' | 'ios';

@Entity('device_tokens')
@Index(['userId', 'isActive'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @Column({
    type: 'enum',
    enum: ['web', 'android', 'ios'],
    default: 'web',
  })
  platform: DevicePlatform;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: Record<string, any> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
