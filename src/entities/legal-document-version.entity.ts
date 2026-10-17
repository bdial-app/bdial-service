import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** One published, never-edited version of a legal document. */
@Entity('legal_document_versions')
@Index(['documentId', 'version'], { unique: true })
export class LegalDocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  /** 1, 2, 3… per document. */
  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /** What changed, for the history and for people asked to accept again. */
  @Column({ name: 'change_note', type: 'varchar', length: 300, nullable: true })
  changeNote: string | null;

  /** People who accepted an earlier version must accept this one. */
  @Column({ name: 'requires_acceptance', type: 'boolean', default: false })
  requiresAcceptance: boolean;

  @Column({ name: 'published_at', type: 'timestamptz', default: () => 'now()' })
  publishedAt: Date;

  /** The super admin who published it; null for the built-in first version. */
  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy: string | null;
}
