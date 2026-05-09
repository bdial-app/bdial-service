import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateStripeToRazorpayApple1778400000000 implements MigrationInterface {
  name = 'MigrateStripeToRazorpayApple1778400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── payments table ─────────────────────────────────────────────

    // Add new gateway columns
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_gateway" varchar(20) NOT NULL DEFAULT 'razorpay'`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_order_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_payment_id" varchar(255)`);

    // Migrate data from old Stripe columns (if they exist)
    const hasStripePI = await this.columnExists(queryRunner, 'payments', 'stripe_payment_intent_id');
    const hasStripeSess = await this.columnExists(queryRunner, 'payments', 'stripe_checkout_session_id');

    if (hasStripePI) {
      await queryRunner.query(`UPDATE "payments" SET "gateway_payment_id" = "stripe_payment_intent_id" WHERE "stripe_payment_intent_id" IS NOT NULL`);
    }
    if (hasStripeSess) {
      await queryRunner.query(`UPDATE "payments" SET "gateway_order_id" = "stripe_checkout_session_id" WHERE "stripe_checkout_session_id" IS NOT NULL`);
    }

    // Rename stripe_receipt_url → receipt_url if it exists
    const hasReceiptUrl = await this.columnExists(queryRunner, 'payments', 'stripe_receipt_url');
    if (hasReceiptUrl) {
      await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "stripe_receipt_url" TO "receipt_url"`);
    } else {
      await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_url" text`);
    }

    // Create indexes on new columns
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_gateway_payment_id" ON "payments" ("gateway_payment_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_gateway_order_id" ON "payments" ("gateway_order_id")`);

    // Drop old Stripe columns and indexes
    if (hasStripePI) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_stripe_payment_intent_id"`);
      await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "UQ_payments_stripe_payment_intent_id"`);
      await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "stripe_payment_intent_id"`);
    }
    if (hasStripeSess) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_stripe_checkout_session_id"`);
      await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "UQ_payments_stripe_checkout_session_id"`);
      await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "stripe_checkout_session_id"`);
    }

    // ── subscriptions table ────────────────────────────────────────

    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "payment_gateway" varchar(20) NOT NULL DEFAULT 'razorpay'`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "gateway_subscription_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "gateway_customer_id" varchar(255)`);

    const hasStripeSub = await this.columnExists(queryRunner, 'subscriptions', 'stripe_subscription_id');
    const hasStripeCust = await this.columnExists(queryRunner, 'subscriptions', 'stripe_customer_id');

    if (hasStripeSub) {
      await queryRunner.query(`UPDATE "subscriptions" SET "gateway_subscription_id" = "stripe_subscription_id" WHERE "stripe_subscription_id" IS NOT NULL`);
    }
    if (hasStripeCust) {
      await queryRunner.query(`UPDATE "subscriptions" SET "gateway_customer_id" = "stripe_customer_id" WHERE "stripe_customer_id" IS NOT NULL`);
    }

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscriptions_gateway_subscription_id" ON "subscriptions" ("gateway_subscription_id")`);

    if (hasStripeSub) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_stripe_subscription_id"`);
      await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "UQ_subscriptions_stripe_subscription_id"`);
      await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "stripe_subscription_id"`);
    }
    if (hasStripeCust) {
      await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "stripe_customer_id"`);
    }

    // ── subscription_plans table ───────────────────────────────────

    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "razorpay_plan_id_monthly" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "razorpay_plan_id_yearly" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "apple_product_id_monthly" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "apple_product_id_yearly" varchar(255)`);

    const hasStripeProduct = await this.columnExists(queryRunner, 'subscription_plans', 'stripe_product_id');
    const hasStripePriceM = await this.columnExists(queryRunner, 'subscription_plans', 'stripe_price_id_monthly');
    const hasStripePriceY = await this.columnExists(queryRunner, 'subscription_plans', 'stripe_price_id_yearly');

    if (hasStripeProduct) {
      await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "stripe_product_id"`);
    }
    if (hasStripePriceM) {
      await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "stripe_price_id_monthly"`);
    }
    if (hasStripePriceY) {
      await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "stripe_price_id_yearly"`);
    }

    // ── providers table ────────────────────────────────────────────

    const hasProviderStripe = await this.columnExists(queryRunner, 'providers', 'stripe_customer_id');
    if (hasProviderStripe) {
      await queryRunner.query(`ALTER TABLE "providers" RENAME COLUMN "stripe_customer_id" TO "gateway_customer_id"`);
    } else {
      await queryRunner.query(`ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "gateway_customer_id" varchar(255)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse provider column rename
    const hasGatewayCust = await this.columnExists(queryRunner, 'providers', 'gateway_customer_id');
    if (hasGatewayCust) {
      await queryRunner.query(`ALTER TABLE "providers" RENAME COLUMN "gateway_customer_id" TO "stripe_customer_id"`);
    }

    // Restore subscription_plans Stripe columns
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_product_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_id_monthly" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_id_yearly" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "razorpay_plan_id_monthly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "razorpay_plan_id_yearly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "apple_product_id_monthly"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "apple_product_id_yearly"`);

    // Restore subscriptions Stripe columns
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255) UNIQUE`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255)`);
    await queryRunner.query(`UPDATE "subscriptions" SET "stripe_subscription_id" = "gateway_subscription_id", "stripe_customer_id" = "gateway_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_gateway_subscription_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "gateway_subscription_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "gateway_customer_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "payment_gateway"`);

    // Restore payments Stripe columns
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" varchar(255) UNIQUE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" varchar(255) UNIQUE`);
    await queryRunner.query(`UPDATE "payments" SET "stripe_payment_intent_id" = "gateway_payment_id", "stripe_checkout_session_id" = "gateway_order_id"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "receipt_url" TO "stripe_receipt_url"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_gateway_payment_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_gateway_order_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "gateway_order_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "gateway_payment_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_gateway"`);
  }

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return result.length > 0;
  }
}
