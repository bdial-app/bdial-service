import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';
import { Category } from './category.entity';

@Entity('provider_categories')
@Unique(['providerId', 'categoryId'])
@Index(['categoryId', 'providerId'])
export class ProviderCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Provider, (p) => p.providerCategories)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Category, (c) => c.providerCategories)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
