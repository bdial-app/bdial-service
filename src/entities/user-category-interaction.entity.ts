import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

@Entity('user_category_interactions')
@Unique('uq_user_category_type', ['userId', 'categoryId', 'interactionType'])
@Index(['userId'])
@Index(['userId', 'weight'])
export class UserCategoryInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'interaction_type', type: 'varchar', length: 20 })
  interactionType: 'search' | 'view' | 'bookmark' | 'inquiry' | 'contact';

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 1.0 })
  weight: number;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ name: 'last_interaction_at', type: 'timestamptz', default: () => 'NOW()' })
  lastInteractionAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
