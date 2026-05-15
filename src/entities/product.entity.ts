import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('products')
@Index(['providerId', 'isActive'])
@Index(['providerId', 'isHero'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ name: 'photo_urls', type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'product_type', type: 'varchar', length: 10, default: 'product' })
  productType: 'product' | 'service';

  @Column({ name: 'is_hero', type: 'boolean', default: false })
  isHero: boolean;

  @Column({ type: 'text', array: true, nullable: true, default: null })
  keywords: string[] | null;

  @ManyToOne(() => Provider, (p) => p.products)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
}
