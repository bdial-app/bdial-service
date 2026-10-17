import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A person ticked "I agree" to one version of a legal document: kept as the
 * record of their acceptance, with where and how it happened.
 */
@Entity('legal_acceptances')
@Index(['userId', 'versionId'], { unique: true })
@Index(['documentId', 'version'])
export class LegalAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt: Date;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ type: 'varchar', length: 60 })
  slug: string;

  @Column({ type: 'int' })
  version: number;

  /** signin_prompt · business_onboarding */
  @Column({ type: 'varchar', length: 40 })
  method: string;

  /** ios · android · web */
  @Column({ type: 'varchar', length: 20, nullable: true })
  platform: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;
}
