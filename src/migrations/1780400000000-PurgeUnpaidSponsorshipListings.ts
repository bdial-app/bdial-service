import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Checkout used to insert a sponsored_listings row before the gateway
 * confirmed payment, so every abandoned checkout left an inactive ghost row
 * that showed up in the admin console. Listing creation now happens on
 * fulfilment; this removes the ghosts that already exist.
 *
 * Guards: only provider-paid rows whose linked payment never succeeded and
 * that never served (inactive, zero impressions/clicks) are removed.
 */
export class PurgeUnpaidSponsorshipListings1780400000000 implements MigrationInterface {
  name = 'PurgeUnpaidSponsorshipListings1780400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sponsored_listings" sl
      USING "payments" p
      WHERE sl."payment_id" = p."id"
        AND p."status" IN ('pending', 'processing', 'failed')
        AND sl."is_active" = false
        AND sl."impressions" = 0
        AND sl."clicks" = 0
        AND sl."source" = 'provider_paid'
        -- Age guard: a checkout that is still open when this migration runs
        -- would otherwise lose its row seconds before the payment settles,
        -- leaving a provider charged with nothing to show. Real ghosts are old.
        AND sl."created_at" < NOW() - INTERVAL '2 hours'
    `);
  }

  async down(): Promise<void> {
    // Deleted rows were never-paid placeholders; nothing to restore.
  }
}
