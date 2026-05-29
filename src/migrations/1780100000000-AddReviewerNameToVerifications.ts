import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewerNameToVerifications1780100000000 implements MigrationInterface {
  name = 'AddReviewerNameToVerifications1780100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verifications"
        ADD COLUMN IF NOT EXISTS "reviewer_name" VARCHAR(255) DEFAULT NULL
    `);

    // Back-fill existing reviewed rows from the users table while the relation still exists
    await queryRunner.query(`
      UPDATE "verifications" v
         SET "reviewer_name" = u."name"
        FROM "users" u
       WHERE v."reviewed_by" = u."id"
         AND v."reviewer_name" IS NULL
         AND v."reviewed_by" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "verifications" DROP COLUMN IF EXISTS "reviewer_name"
    `);
  }
}
