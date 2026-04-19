import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 150 })
  brandName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ name: 'contact_number', type: 'varchar', length: 15 })
  contactNumber: string;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string | null;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string | null;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ name: 'profile_photo_url', type: 'varchar', length: 500, nullable: true })
  profilePhotoUrl: string | null;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, (u) => u.provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
