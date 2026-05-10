import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('serviceable_cities')
@Index(['status'])
export class ServiceableCity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: ['active', 'coming_soon', 'disabled'],
    default: 'coming_soon',
  })
  status: 'active' | 'coming_soon' | 'disabled';

  @Column({ name: 'launch_date', type: 'timestamptz', nullable: true })
  launchDate: Date | null;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  lat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  lng: number;

  @Column({ name: 'radius_km', type: 'int', default: 50 })
  radiusKm: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
