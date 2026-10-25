import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Women-Led requests: who the woman is and her role, optional private
 * proof, the team's decision with a reason, and when it ended (turned off
 * by the owner or revoked by the team).
 *
 * Also makes the two provider flags agree, once: is_women_led is true only
 * when women_led_status is 'approved'.
 *  - Pending businesses lose the badge they were showing before review.
 *  - A badge an admin ticked directly (is_women_led with status 'none')
 *    counts as approved, since an admin set it.
 * Then every approved, pending or rejected business gets a request row
 * ('legacy') so the owner card and the review queue start from the truth.
 */
export class WomenLedRequests1782200000000 implements MigrationInterface {
  name = 'WomenLedRequests1782200000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "women_led_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "source" varchar(20) NOT NULL DEFAULT 'owner'
          CHECK ("source" IN ('owner', 'onboarding', 'admin', 'import', 'legacy')),
        "requested_by" uuid,
        "woman_name" varchar(100) NOT NULL,
        "role" varchar(20) NOT NULL CHECK ("role" IN ('owner', 'co_owner', 'runs_it')),
        "note" varchar(500),
        "evidence_key" varchar(300),
        "evidence_name" varchar(150),
        "evidence_type" varchar(80),
        "status" varchar(20) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'approved', 'rejected', 'withdrawn', 'ended')),
        "decided_at" timestamptz,
        "decided_by" uuid,
        "decision_note" varchar(500),
        "ended_at" timestamptz,
        "ended_by" uuid,
        "ended_reason" varchar(20) CHECK ("ended_reason" IN ('turned_off', 'revoked')),
        "end_note" varchar(500)
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_women_led_requests_provider_created" ON "women_led_requests" ("provider_id", "created_at")`,
    );
    // At most one waiting and one live badge per business.
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_women_led_requests_pending" ON "women_led_requests" ("provider_id") WHERE "status" = 'pending'`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_women_led_requests_approved" ON "women_led_requests" ("provider_id") WHERE "status" = 'approved'`,
    );

    // An admin's direct tick counts as approved.
    await q.query(`
      UPDATE "providers"
         SET "women_led_status" = 'approved',
             "women_led_reviewed_at" = COALESCE("women_led_reviewed_at", now())
       WHERE "is_women_led" = true AND "women_led_status" = 'none'
    `);
    // The badge shows only when approved.
    await q.query(`
      UPDATE "providers"
         SET "is_women_led" = ("women_led_status" = 'approved')
       WHERE "is_women_led" IS DISTINCT FROM ("women_led_status" = 'approved')
    `);

    await q.query(`
      INSERT INTO "women_led_requests"
        ("provider_id", "created_at", "source", "requested_by", "woman_name", "role", "status", "decided_at", "decided_by", "decision_note")
      SELECT p."id",
             p."created_at",
             'legacy',
             p."user_id",
             LEFT(COALESCE(NULLIF(TRIM(u."name"), ''), p."brand_name"), 100),
             'owner',
             p."women_led_status",
             CASE WHEN p."women_led_status" IN ('approved', 'rejected') THEN COALESCE(p."women_led_reviewed_at", p."created_at") END,
             p."women_led_reviewed_by",
             CASE WHEN p."women_led_status" = 'rejected' THEN 'Not approved before reasons were recorded.' END
        FROM "providers" p
        LEFT JOIN "users" u ON u."id" = p."user_id"
       WHERE p."women_led_status" IN ('approved', 'pending', 'rejected')
         AND NOT EXISTS (SELECT 1 FROM "women_led_requests" r WHERE r."provider_id" = p."id")
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    // The flag clean-up is not undone: pending businesses showed a badge by mistake.
    await q.query(`DROP TABLE IF EXISTS "women_led_requests"`);
  }
}
