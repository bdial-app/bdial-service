import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Someone whose business was deleted can list a new one. A user has one
 * business row (user_id is unique, and the code relies on it), so when they
 * do, the deleted row lets go of user_id and keeps the owner in
 * previous_user_id. It stays for history, and goes if the user is deleted,
 * as it would have before.
 */
export class ProviderDetachDeleted1782700000000 implements MigrationInterface {
  name = 'ProviderDetachDeleted1782700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "providers" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "providers"
        ADD COLUMN IF NOT EXISTS "previous_user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_providers_previous_user_id"
        ON "providers" ("previous_user_id") WHERE "previous_user_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Detached rows have no owner to go back to while the owner has a new business.
    const [{ n }] = await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM "providers" WHERE "user_id" IS NULL`,
    );
    if (n > 0)
      throw new Error(
        `${n} detached deleted businesses have no user_id; can't restore NOT NULL`,
      );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_providers_previous_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" DROP COLUMN IF EXISTS "previous_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" ALTER COLUMN "user_id" SET NOT NULL`,
    );
  }
}
