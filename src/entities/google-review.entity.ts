import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Provider } from './provider.entity';

/**
 * One Google review of a linked business, as Google last returned it.
 *
 * A mirror, not an archive: each sync replaces a business's rows with what
 * Google currently returns, so a review deleted on Google disappears here.
 */
@Entity('google_reviews')
@Unique('uq_google_reviews_provider_review', ['providerId', 'googleReviewId'])
@Index('idx_google_reviews_provider', ['providerId', 'publishedAt'])
export class GoogleReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  /** Google's stable resource name: places/{placeId}/reviews/{reviewId}. */
  @Column({ name: 'google_review_id', type: 'varchar', length: 255 })
  googleReviewId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  language: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 200 })
  authorName: string;

  @Column({ name: 'author_uri', type: 'varchar', length: 500, nullable: true })
  authorUri: string | null;

  @Column({
    name: 'author_photo_uri',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  authorPhotoUri: string | null;

  @Column({
    name: 'google_maps_uri',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  googleMapsUri: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({
    name: 'first_seen_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'now()' })
  lastSeenAt: Date;
}
