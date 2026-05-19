import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Review } from './review.entity';
import { User } from './user.entity';

@Entity('review_reports')
@Unique(['reviewId', 'reporterId'])
export class ReviewReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' })
  status: string;

  @Column({ name: 'reported_at', type: 'timestamptz', default: () => 'now()' })
  reportedAt: Date;

  @ManyToOne(() => Review, (r) => r.reports)
  @JoinColumn({ name: 'review_id' })
  review: Review;

  @ManyToOne(() => User, (u) => u.reviewReports, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User | null;
}
