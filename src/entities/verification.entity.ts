import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('verifications')
@Index(['userId'])
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'aadhaar_doc_url', type: 'varchar', length: 500 })
  aadhaarDocUrl: string;

  @Column({ name: 'aadhaar_status', type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  aadhaarStatus: string;

  @Column({ name: 'ijamat_number', type: 'varchar', length: 50, nullable: true })
  ijamatNumber: string | null;

  @Column({ name: 'ijamat_expiry', type: 'date', nullable: true })
  ijamatExpiry: Date | null;

  @Column({ name: 'ijamat_doc_url', type: 'varchar', length: 500, nullable: true })
  ijamatDocUrl: string | null;

  @Column({ name: 'ijamat_status', type: 'enum', enum: ['pending', 'approved', 'rejected', 'not_submitted'], default: 'not_submitted' })
  ijamatStatus: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: string;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, (u) => u.verification)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, (u) => u.reviewedVerifications, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
