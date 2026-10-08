import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const HOME_COLLECTION_THEMES = [
  'amber',
  'rose',
  'sky',
  'violet',
  'emerald',
  'orange',
  'indigo',
  'teal',
] as const;
export type HomeCollectionTheme = (typeof HOME_COLLECTION_THEMES)[number];

export const HOME_COLLECTION_ILLUSTRATIONS = [
  'home-repair',
  'appliances',
  'fashion',
  'wedding',
  'sweets',
  'travel',
  'gifts',
  'shopping',
] as const;
export type HomeCollectionIllustration =
  (typeof HOME_COLLECTION_ILLUSTRATIONS)[number];

export const HOME_COLLECTION_TYPES = ['all', 'product', 'service'] as const;
export type HomeCollectionType = (typeof HOME_COLLECTION_TYPES)[number];

/**
 * A "need" on the home screen — "Get your home fixed", "Ridas you'll love" —
 * that gathers every product and service from a set of categories (any
 * level; sub-categories included). Managed from the admin panel.
 */
@Entity('home_collections')
@Index(['isActive', 'displayOrder'])
export class HomeCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 20, default: 'amber' })
  theme: HomeCollectionTheme;

  /** The banner's illustration (drawn in the app). */
  @Column({ type: 'varchar', length: 30, default: 'shopping' })
  illustration: HomeCollectionIllustration;

  /** Optional cover photo; without one the card shows real listing photos. */
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'listing_type', type: 'varchar', length: 10, default: 'all' })
  listingType: HomeCollectionType;

  @Column({
    name: 'category_ids',
    type: 'uuid',
    array: true,
    default: () => "'{}'",
  })
  categoryIds: string[];

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
