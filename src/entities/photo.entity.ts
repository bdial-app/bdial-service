import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Listing } from './listing.entity';

@Entity('photos')
@Index(['listingId', 'displayOrder'])
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 300 })
  storageKey: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'now()' })
  uploadedAt: Date;

  @ManyToOne(() => Listing, (l) => l.photos)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;
}
