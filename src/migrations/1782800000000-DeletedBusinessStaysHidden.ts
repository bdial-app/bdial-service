import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A deleted business is never live. Customer lists filter on status, and a
 * delete sets it to 'disabled', but other writes (approving a verification,
 * say) could set it back to 'active' and bring the business back into search.
 * The database now holds this whatever the code, or an older build, does.
 */
export class DeletedBusinessStaysHidden1782800000000 implements MigrationInterface {
  name = 'DeletedBusinessStaysHidden1782800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_provider_deleted_stays_disabled() RETURNS trigger AS $$
      BEGIN
        IF NEW.deleted_at IS NOT NULL THEN
          NEW.status := 'disabled';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_provider_deleted_stays_disabled ON "providers"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_provider_deleted_stays_disabled
        BEFORE INSERT OR UPDATE OF status, deleted_at ON "providers"
        FOR EACH ROW EXECUTE FUNCTION fn_provider_deleted_stays_disabled()
    `);
    // Any that have already come back.
    await queryRunner.query(`
      UPDATE "providers" SET "status" = 'disabled'
       WHERE "deleted_at" IS NOT NULL AND "status" <> 'disabled'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_provider_deleted_stays_disabled ON "providers"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_provider_deleted_stays_disabled()`,
    );
  }
}
