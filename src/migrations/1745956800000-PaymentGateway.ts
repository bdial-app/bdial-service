import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentGateway1745956800000 implements MigrationInterface {
  name = 'PaymentGateway1745956800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_status enum
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded')
    `);

    // Create payment_type enum
    await queryRunner.query(`
      CREATE TYPE "payment_type_enum" AS ENUM ('sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock')
    `);

    // Create subscription_status enum
    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'paused')
    `);

    // Create billing_interval enum
    await queryRunner.query(`
      CREATE TYPE "billing_interval_enum" AS ENUM ('monthly', 'yearly')
    `);

    // Create voucher_discount_type enum
    await queryRunner.query(`
      CREATE TYPE "voucher_discount_type_enum" AS ENUM ('percentage', 'fixed_amount')
    `);

    // ─── payments table ──────────────────────
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "stripe_payment_intent_id" varchar(255),
        "stripe_checkout_session_id" varchar(255),
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'INR',
        "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "type" "payment_type_enum" NOT NULL,
        "metadata" jsonb,
        "voucher_id" uuid,
        "discount_amount" decimal(10,2) NOT NULL DEFAULT 0,
        "stripe_receipt_url" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_stripe_payment_intent" UNIQUE ("stripe_payment_intent_id"),
        CONSTRAINT "UQ_payments_stripe_checkout_session" UNIQUE ("stripe_checkout_session_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_payments_provider_status" ON "payments" ("provider_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_stripe_pi" ON "payments" ("stripe_payment_intent_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_stripe_cs" ON "payments" ("stripe_checkout_session_id")`);

    // ─── subscription_plans table ────────────
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "stripe_product_id" varchar(255),
        "stripe_price_id_monthly" varchar(255),
        "stripe_price_id_yearly" varchar(255),
        "price_monthly" decimal(10,2) NOT NULL,
        "price_yearly" decimal(10,2) NOT NULL,
        "features" jsonb,
        "max_active_deals" int NOT NULL DEFAULT 3,
        "max_total_deals" int NOT NULL DEFAULT 5,
        "monthly_lead_unlocks" int NOT NULL DEFAULT 0,
        "sponsorship_types" text[],
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_slug" UNIQUE ("slug")
      )
    `);

    // ─── subscriptions table ─────────────────
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "stripe_subscription_id" varchar(255) NOT NULL,
        "stripe_customer_id" varchar(255) NOT NULL,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'active',
        "billing_interval" "billing_interval_enum" NOT NULL DEFAULT 'monthly',
        "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "lead_unlocks_used" int NOT NULL DEFAULT 0,
        "lead_unlocks_reset_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_provider" UNIQUE ("provider_id"),
        CONSTRAINT "UQ_subscriptions_stripe" UNIQUE ("stripe_subscription_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_stripe" ON "subscriptions" ("stripe_subscription_id")`);

    // ─── vouchers table ──────────────────────
    await queryRunner.query(`
      CREATE TABLE "vouchers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "description" text,
        "discount_type" "voucher_discount_type_enum" NOT NULL,
        "discount_value" decimal(10,2) NOT NULL,
        "max_uses" int,
        "used_count" int NOT NULL DEFAULT 0,
        "max_uses_per_provider" int,
        "min_purchase_amount" decimal(10,2),
        "max_discount_amount" decimal(10,2),
        "applicable_to" text[],
        "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL,
        "valid_until" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vouchers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vouchers_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_vouchers_active_dates" ON "vouchers" ("is_active", "valid_from", "valid_until")`);

    // ─── voucher_redemptions table ───────────
    await queryRunner.query(`
      CREATE TABLE "voucher_redemptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "voucher_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "payment_id" uuid NOT NULL,
        "discount_amount" decimal(10,2) NOT NULL,
        "redeemed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voucher_redemptions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_voucher_redemptions_voucher_provider" ON "voucher_redemptions" ("voucher_id", "provider_id")`);

    // ─── Add stripe_customer_id to providers ─
    await queryRunner.query(`ALTER TABLE "providers" ADD "stripe_customer_id" varchar(255)`);

    // ─── Add payment_id to sponsored_listings ─
    await queryRunner.query(`ALTER TABLE "sponsored_listings" ADD "payment_id" uuid`);

    // ─── Foreign key constraints ─────────────
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")`);
    await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "FK_vr_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "FK_vr_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "FK_vr_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "sponsored_listings" ADD CONSTRAINT "FK_sponsored_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id")`);

    // ─── Seed default subscription plans ─────
    await queryRunner.query(`
      INSERT INTO "subscription_plans" ("name", "slug", "price_monthly", "price_yearly", "features", "max_active_deals", "max_total_deals", "monthly_lead_unlocks", "sponsorship_types", "sort_order")
      VALUES
        ('Free', 'free', 0, 0, '{"maxPhotos": 5, "analytics": "basic"}', 3, 5, 0, NULL, 0),
        ('Starter', 'starter', 299, 2990, '{"maxPhotos": 15, "analytics": "standard", "prioritySupport": false}', 5, 15, 5, '{inline}', 1),
        ('Growth', 'growth', 799, 7990, '{"maxPhotos": 50, "analytics": "advanced", "prioritySupport": true}', 10, 50, 20, '{carousel,inline,top_result}', 2),
        ('Pro', 'pro', 1999, 19990, '{"maxPhotos": -1, "analytics": "advanced", "prioritySupport": true, "dedicatedSupport": true}', -1, -1, -1, '{carousel,inline,top_result}', 3)
    `);

    // ─── Seed pricing settings ───────────────
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
      VALUES
        ('lead_unlock_price', '49', 'number', 'pricing', 'Price in INR to unlock a single lead'),
        ('sponsorship_min_budget', '100', 'number', 'pricing', 'Minimum budget in INR for a sponsored listing')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP CONSTRAINT IF EXISTS "FK_sponsored_payment"`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" DROP CONSTRAINT IF EXISTS "FK_vr_payment"`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" DROP CONSTRAINT IF EXISTS "FK_vr_provider"`);
    await queryRunner.query(`ALTER TABLE "voucher_redemptions" DROP CONSTRAINT IF EXISTS "FK_vr_voucher"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_creator"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_plan"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_provider"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_provider"`);

    // Drop columns added to existing tables
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP COLUMN IF EXISTS "payment_id"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN IF EXISTS "stripe_customer_id"`);

    // Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS "voucher_redemptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vouchers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "voucher_discount_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_interval_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);

    // Remove seeded settings
    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" IN ('lead_unlock_price', 'sponsorship_min_budget')`);
  }
}
