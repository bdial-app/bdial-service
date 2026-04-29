import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration — marks the starting point for TypeORM-managed migrations.
 * All existing schema up to this point was created via synchronize + raw SQL files.
 * This is intentionally empty so existing databases are not affected.
 */
export class Baseline1714380000000 implements MigrationInterface {
  name = 'Baseline1714380000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: existing schema is already in place
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: cannot reverse baseline
  }
}
