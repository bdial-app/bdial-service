import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class SeedExpandedSynonyms1779600000000 implements MigrationInterface {
  name = 'SeedExpandedSynonyms1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlPath = path.join(process.cwd(), 'sql', 'seed-search-synonyms-expanded.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Strip any BEGIN/COMMIT if present
    const cleanSql = sql
      .replace(/^\s*BEGIN\s*;?\s*$/gim, '')
      .replace(/^\s*COMMIT\s*;?\s*$/gim, '')
      .trim();

    await queryRunner.query(cleanSql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove expanded synonyms (keep originals from seed-search-synonyms.sql)
    await queryRunner.query(`
      DELETE FROM search_synonyms
      WHERE term IN (
        'hammer', 'sledge', 'sledgehammer', 'wrench', 'drill', 'screwdriver',
        'leaking tap', 'leaky faucet', 'clogged drain', 'broken screen',
        'birthday party', 'wedding planner', 'car service', 'oil change'
      )
    `);
  }
}
