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

@Entity('city_requests')
@Index(['city', 'createdAt'])
@Index(['userId', 'city'])
export class CityRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  platform: string | null; // 'android' | 'ios' | 'web'

  @Column({ name: 'device_type', type: 'varchar', length: 20, nullable: true })
  deviceType: string | null; // 'mobile' | 'tablet' | 'desktop'

  @Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
  osVersion: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 30, nullable: true })
  appVersion: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
