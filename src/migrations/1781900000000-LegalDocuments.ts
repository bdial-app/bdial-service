import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legal documents editable by super admins, their published versions, and a
 * record of who accepted which version. The documents' first versions are
 * inserted by LegalService on start-up, not here.
 */
export class LegalDocuments1781900000000 implements MigrationInterface {
  name = 'LegalDocuments1781900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "slug" varchar(60) NOT NULL UNIQUE,
        "title" varchar(120) NOT NULL,
        "summary" varchar(300) NOT NULL DEFAULT '',
        "required_for" varchar(20) NOT NULL DEFAULT 'none',
        "sort_order" int NOT NULL DEFAULT 0,
        "draft_content" text,
        "draft_title" varchar(120),
        "draft_summary" varchar(300),
        "draft_updated_at" timestamptz,
        "draft_updated_by" uuid
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_document_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" uuid NOT NULL REFERENCES "legal_documents"("id") ON DELETE CASCADE,
        "version" int NOT NULL,
        "title" varchar(120) NOT NULL,
        "content" text NOT NULL,
        "change_note" varchar(300),
        "requires_acceptance" boolean NOT NULL DEFAULT false,
        "published_at" timestamptz NOT NULL DEFAULT now(),
        "published_by" uuid
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_versions_doc_version" ON "legal_document_versions" ("document_id", "version")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_acceptances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "accepted_at" timestamptz NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "document_id" uuid NOT NULL REFERENCES "legal_documents"("id") ON DELETE CASCADE,
        "version_id" uuid NOT NULL REFERENCES "legal_document_versions"("id") ON DELETE CASCADE,
        "slug" varchar(60) NOT NULL,
        "version" int NOT NULL,
        "method" varchar(40) NOT NULL,
        "platform" varchar(20),
        "ip" varchar(64),
        "user_agent" varchar(300)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_acceptances_user_version" ON "legal_acceptances" ("user_id", "version_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_legal_acceptances_doc_version" ON "legal_acceptances" ("document_id", "version")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_acceptances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_documents"`);
  }
}
