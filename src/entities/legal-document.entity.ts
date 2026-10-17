import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A legal document shown in the apps (Terms of Use, Privacy Policy…). Its
 * text lives in published versions; the newest version is what people read.
 * Super admins edit a draft here and publish it as the next version.
 */
@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** terms · privacy · business-terms · community-guidelines · refund-policy · eula */
  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  /** One line shown where people are asked to accept it. */
  @Column({ type: 'varchar', length: 300, default: '' })
  summary: string;

  /** Who must tick to accept it: everyone · business (owners) · none (read only). */
  @Column({
    name: 'required_for',
    type: 'varchar',
    length: 20,
    default: 'none',
  })
  requiredFor: 'everyone' | 'business' | 'none';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** Unpublished edits. Null when there is no draft. */
  @Column({ name: 'draft_content', type: 'text', nullable: true })
  draftContent: string | null;

  @Column({ name: 'draft_title', type: 'varchar', length: 120, nullable: true })
  draftTitle: string | null;

  @Column({
    name: 'draft_summary',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  draftSummary: string | null;

  @Column({ name: 'draft_updated_at', type: 'timestamptz', nullable: true })
  draftUpdatedAt: Date | null;

  @Column({ name: 'draft_updated_by', type: 'uuid', nullable: true })
  draftUpdatedBy: string | null;
}
