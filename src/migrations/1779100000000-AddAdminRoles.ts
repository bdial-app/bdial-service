import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRoles1779100000000 implements MigrationInterface {
  name = 'AddAdminRoles1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot use a newly added enum value in the same transaction.
    // We must commit after ALTER TYPE, then use the new values.

    // If running inside a transaction, commit it first so ALTER TYPE works outside a tx block
    if (queryRunner.isTransactionActive) {
      await queryRunner.commitTransaction();
    }

    // Add new enum values (must run outside a transaction in PG)
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'associate'`);
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'moderator'`);
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'`);

    // Start a new transaction for the DML
    await queryRunner.startTransaction();

    // Promote all existing 'admin' users to 'super_admin' to preserve access
    await queryRunner.query(`UPDATE "users" SET "role" = 'super_admin' WHERE "role" = 'admin'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Demote super_admin/moderator/associate back to admin (best effort)
    await queryRunner.query(`UPDATE "users" SET "role" = 'admin' WHERE "role" IN ('super_admin', 'moderator', 'associate')`);

    // Note: PostgreSQL does not support removing values from an existing enum type
    // without recreating it. This is intentionally left as a no-op for the enum
    // since the values will remain harmless if not used.
  }
}
