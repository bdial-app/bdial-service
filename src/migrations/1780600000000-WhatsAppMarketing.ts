import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WhatsApp marketing module (phase 1).
 *
 * Admin-driven template campaigns to business owners through Meta's Cloud API.
 * `whatsapp_messages` doubles as the send queue (no Redis); the worker claims
 * rows with FOR UPDATE SKIP LOCKED. Everything here is additive and idempotent
 * because migrations auto-run on start against the shared Supabase DB.
 */
export class WhatsAppMarketing1780600000000 implements MigrationInterface {
  name = 'WhatsAppMarketing1780600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_consent_enum" AS ENUM ('unknown', 'opted_in', 'opted_out');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_template_category_enum" AS ENUM ('marketing', 'utility', 'authentication');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_template_status_enum" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'paused', 'disabled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_campaign_status_enum" AS ENUM ('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_direction_enum" AS ENUM ('outbound', 'inbound');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_message_kind_enum" AS ENUM ('template', 'text', 'image', 'document', 'audio', 'video', 'sticker', 'location', 'reaction', 'unknown');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "whatsapp_message_status_enum" AS ENUM ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped', 'received');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Settings (single row, id = 1) ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_settings" (
        "id" smallint PRIMARY KEY,
        "daily_cap" integer NOT NULL DEFAULT 1000,
        "rate_per_minute" integer NOT NULL DEFAULT 60,
        "send_window_start" smallint NOT NULL DEFAULT 9,
        "send_window_end" smallint NOT NULL DEFAULT 21,
        "opt_out_keywords" text[] NOT NULL DEFAULT '{STOP,UNSUBSCRIBE,CANCEL}',
        "opt_in_keywords" text[] NOT NULL DEFAULT '{START,SUBSCRIBE}',
        "rates" jsonb NOT NULL DEFAULT '{"marketing":0.8631,"utility":0.115,"authentication":0.115,"service":0}',
        "require_opt_in_for_marketing" boolean NOT NULL DEFAULT false,
        "phone_meta" jsonb,
        "webhook_last_event_at" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "whatsapp_settings" ("id") VALUES (1)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── Contacts ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL UNIQUE,
        "provider_id" uuid REFERENCES "providers"("id") ON DELETE SET NULL,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "display_name" varchar(200),
        "consent" "whatsapp_consent_enum" NOT NULL DEFAULT 'unknown',
        "consent_changed_at" TIMESTAMP WITH TIME ZONE,
        "consent_source" varchar(40),
        "reachable" boolean NOT NULL DEFAULT true,
        "last_inbound_at" TIMESTAMP WITH TIME ZONE,
        "last_outbound_at" TIMESTAMP WITH TIME ZONE,
        "last_marketing_at" TIMESTAMP WITH TIME ZONE,
        "last_cap_hit_at" TIMESTAMP WITH TIME ZONE,
        "unread_count" integer NOT NULL DEFAULT 0,
        "tags" text[] NOT NULL DEFAULT '{}',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_contacts_provider_id"
      ON "whatsapp_contacts" ("provider_id")
    `);

    // ── Templates ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(512) NOT NULL,
        "language" varchar(10) NOT NULL DEFAULT 'en',
        "category" "whatsapp_template_category_enum" NOT NULL,
        "status" "whatsapp_template_status_enum" NOT NULL DEFAULT 'draft',
        "meta_template_id" varchar(64),
        "components" jsonb NOT NULL DEFAULT '[]',
        "variables" jsonb NOT NULL DEFAULT '[]',
        "description" text,
        "rejected_reason" text,
        "quality_score" varchar(20),
        "is_seed" boolean NOT NULL DEFAULT false,
        "last_synced_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_whatsapp_templates_name_language"
      ON "whatsapp_templates" ("name", "language")
    `);

    // ── Segments ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_segments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "description" text,
        "filters" jsonb NOT NULL DEFAULT '{}',
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    // ── Campaigns ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_campaigns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "template_id" uuid NOT NULL REFERENCES "whatsapp_templates"("id") ON DELETE RESTRICT,
        "audience" jsonb NOT NULL DEFAULT '{}',
        "variable_mapping" jsonb NOT NULL DEFAULT '{}',
        "header_media_url" varchar(600),
        "button_url_params" jsonb,
        "status" "whatsapp_campaign_status_enum" NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMP WITH TIME ZONE,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "rate_per_minute" integer,
        "total_recipients" integer NOT NULL DEFAULT 0,
        "queued_count" integer NOT NULL DEFAULT 0,
        "sent_count" integer NOT NULL DEFAULT 0,
        "delivered_count" integer NOT NULL DEFAULT 0,
        "read_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "skipped_count" integer NOT NULL DEFAULT 0,
        "replied_count" integer NOT NULL DEFAULT 0,
        "estimated_cost_inr" numeric(10,2) NOT NULL DEFAULT 0,
        "actual_cost_inr" numeric(10,2) NOT NULL DEFAULT 0,
        "failure_reason" text,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_campaigns_status"
      ON "whatsapp_campaigns" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_campaigns_template_id"
      ON "whatsapp_campaigns" ("template_id")
    `);

    // ── Messages (both directions; outbound rows are the queue) ────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "contact_id" uuid NOT NULL REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE,
        "campaign_id" uuid REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE,
        "provider_id" uuid,
        "direction" "whatsapp_direction_enum" NOT NULL,
        "kind" "whatsapp_message_kind_enum" NOT NULL DEFAULT 'template',
        "status" "whatsapp_message_status_enum" NOT NULL DEFAULT 'queued',
        "template_id" uuid,
        "template_name" varchar(512),
        "rendered_body" text,
        "payload" jsonb,
        "variables" jsonb,
        "wa_message_id" varchar(128),
        "error_code" integer,
        "error_message" text,
        "skip_reason" varchar(40),
        "attempts" smallint NOT NULL DEFAULT 0,
        "send_after" TIMESTAMP WITH TIME ZONE,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "billable" boolean,
        "pricing_category" varchar(20),
        "cost_inr" numeric(8,4) NOT NULL DEFAULT 0,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "delivered_at" TIMESTAMP WITH TIME ZONE,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "failed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_whatsapp_messages_wa_message_id"
      ON "whatsapp_messages" ("wa_message_id") WHERE "wa_message_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_messages_status_send_after"
      ON "whatsapp_messages" ("status", "send_after")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_messages_campaign_status"
      ON "whatsapp_messages" ("campaign_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_messages_contact_created"
      ON "whatsapp_messages" ("contact_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_messages_provider_created"
      ON "whatsapp_messages" ("provider_id", "created_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_settings"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "whatsapp_message_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "whatsapp_message_kind_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "whatsapp_direction_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "whatsapp_campaign_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "whatsapp_template_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "whatsapp_template_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "whatsapp_consent_enum"`);
  }
}
