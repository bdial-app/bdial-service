import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lead Wallet: a business tops up (with a bonus) and spends the balance on
 * lead contacts, one at a time or many at once. Balance never expires.
 */
export class LeadWallet1782500000000 implements MigrationInterface {
  name = 'LeadWallet1782500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // The payment type enum's name comes from the column.
    await queryRunner.query(`
      DO $$
      DECLARE t text;
      BEGIN
        SELECT format_type(atttypid, NULL) INTO t
          FROM pg_attribute WHERE attrelid = 'payments'::regclass AND attname = 'type';
        EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', t, 'lead_credits');
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lead_wallets" (
        "provider_id" uuid PRIMARY KEY REFERENCES "providers"("id") ON DELETE CASCADE,
        "balance" numeric(10,2) NOT NULL DEFAULT 0,
        "lifetime_topped_up" numeric(10,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // topup / bonus / unlock (negative) — every change to a balance.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lead_wallet_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "kind" varchar(10) NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "balance_after" numeric(10,2) NOT NULL,
        "payment_id" uuid,
        "lead_id" uuid,
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lead_wallet_tx_provider"
        ON "lead_wallet_transactions" ("provider_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      INSERT INTO "system_settings" ("id", "key", "value", "type", "group", "description") VALUES
        (gen_random_uuid(), 'lead_wallet_enabled', 'true', 'boolean', 'monetization', 'Sell lead credit packs (Lead Wallet).'),
        (gen_random_uuid(), 'lead_packs', '[{"id":"starter","price":499,"bonusPct":10,"appleProductId":""},{"id":"popular","price":999,"bonusPct":20,"popular":true,"appleProductId":""},{"id":"best","price":2499,"bonusPct":30,"appleProductId":""}]', 'json', 'monetization', 'Lead Wallet packs: price (₹), bonus %, Apple product id for iOS.'),
        (gen_random_uuid(), 'lead_first_topup_bonus', '100', 'number', 'monetization', 'Extra ₹ on a business''s first Lead Wallet top-up.'),
        (gen_random_uuid(), 'lead_growth_extra_bonus_pct', '10', 'number', 'monetization', 'Extra bonus % on packs for Growth subscribers.')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "system_settings" WHERE "key" IN ('lead_wallet_enabled', 'lead_packs', 'lead_first_topup_bonus',
        'lead_growth_extra_bonus_pct')
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_wallets"`);
    // The enum value stays; unused values are harmless.
  }
}
