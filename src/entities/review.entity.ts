import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Listing } from './listing.entity';
import { ReviewPhoto } from './review-photo.entity';
import { ReviewReport } from './review-report.entity';

@Entity('reviews')
@Unique(['listingId', 'reviewerId'])
@Index(['listingId', 'status'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @Column({ name: 'star_rating', type: 'smallint' })
  starRating: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText: string | null;

  @Column({ type: 'enum', enum: ['active', 'removed'], default: 'active' })
  status: string;

  @Column({ name: 'posted_at', type: 'timestamptz', default: () => 'now()' })
  postedAt: Date;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy: string | null;

  @ManyToOne(() => Listing, (l) => l.reviews)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @ManyToOne(() => User, (u) => u.reviews)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @ManyToOne(() => User, (u) => u.moderatedReviews, { nullable: true })
  @JoinColumn({ name: 'moderated_by' })
  moderator: User | null;

  @OneToMany(() => ReviewPhoto, (p: ReviewPhoto) => p.review)
  photos: ReviewPhoto[];

  @OneToMany(() => ReviewReport, (r: ReviewReport) => r.review)
  reports: ReviewReport[];
}
