import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chat: file (PDF), product and deal messages; muting a conversation; and a
 * business's saved quick replies.
 */
export class ChatImprovements1782400000000 implements MigrationInterface {
  name = 'ChatImprovements1782400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // The enum's name comes from the column, whatever it was created as.
    await queryRunner.query(`
      DO $$
      DECLARE t text;
      BEGIN
        SELECT format_type(atttypid, NULL) INTO t
          FROM pg_attribute WHERE attrelid = 'messages'::regclass AND attname = 'message_type';
        EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', t, 'file');
        EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', t, 'product');
        EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', t, 'deal');
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "conversation_participants"
        ADD COLUMN IF NOT EXISTS "is_muted" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "providers"
        ADD COLUMN IF NOT EXISTS "chat_quick_replies" jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Enum values can't be dropped; unused values are harmless.
    await queryRunner.query(
      `ALTER TABLE "providers" DROP COLUMN IF EXISTS "chat_quick_replies"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP COLUMN IF EXISTS "is_muted"`,
    );
  }
}
