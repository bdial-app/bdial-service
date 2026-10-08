import { MigrationInterface, QueryRunner } from 'typeorm';

/** Each home collection banner shows an illustration the admin picks. */
export class HomeCollectionIllustration1781200000000 implements MigrationInterface {
  name = 'HomeCollectionIllustration1781200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "home_collections" ADD COLUMN IF NOT EXISTS "illustration" varchar(30) NOT NULL DEFAULT 'shopping'`,
    );
    // The starter set.
    const seed: [string, string][] = [
      ['Get your home fixed', 'home-repair'],
      ['Home appliances & essentials', 'appliances'],
      ["Ridas you'll love", 'fashion'],
      ['Shaadi season', 'wedding'],
      ['Sweet cravings', 'sweets'],
      ['Hajj & Umrah ready', 'travel'],
    ];
    for (const [title, art] of seed) {
      await queryRunner.query(
        `UPDATE "home_collections" SET "illustration" = $2 WHERE "title" = $1 AND "illustration" = 'shopping'`,
        [title, art],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "home_collections" DROP COLUMN IF EXISTS "illustration"`,
    );
  }
}
