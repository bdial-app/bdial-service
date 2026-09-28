import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DecimalTransformer } from '../common/decimal.transformer';

export type GeocodePrecision =
  | 'rooftop'
  | 'street'
  | 'locality'
  | 'pincode'
  | 'city'
  | 'manual';

/**
 * One row per place string we have already looked up, so a locality shared by
 * many businesses is geocoded once. A row with null coordinates records a
 * lookup that found nothing, so we don't pay to ask again.
 */
@Entity('geocode_cache')
export class GeocodeCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Normalised place string, e.g. "dadar west, mumbai, 400028". */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 300 })
  query: string;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: DecimalTransformer,
  })
  latitude: number | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: DecimalTransformer,
  })
  longitude: number | null;

  @Column({
    type: 'enum',
    enum: ['rooftop', 'street', 'locality', 'pincode', 'city', 'manual'],
    nullable: true,
  })
  precision: GeocodePrecision | null;

  @Column({ type: 'varchar', length: 32, default: 'google' })
  source: string;

  /** How often this entry saved us a lookup. */
  @Column({ type: 'int', default: 0 })
  hits: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
