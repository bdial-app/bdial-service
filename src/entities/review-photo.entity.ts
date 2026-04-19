import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('review_photos')
export class ReviewPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 300 })
  storageKey: string;

  @ManyToOne(() => Review, (r) => r.photos)
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
