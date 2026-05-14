import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRoles1779100000000 implements MigrationInterface {
  name = 'AddAdminRoles1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values to the existing role enum type
    // PostgreSQL requires ALTER TYPE to add values to an existing enum
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'associate'`);
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'moderator'`);
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'`);

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
