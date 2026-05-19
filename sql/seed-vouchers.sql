-- ============================================================
-- Voucher Seed Data
-- Sample vouchers for testing / UAT
-- Run AFTER the PaymentGateway migration
-- ============================================================

INSERT INTO "vouchers" ("code", "description", "discount_type", "discount_value", "max_uses", "used_count", "max_uses_per_provider", "min_purchase_amount", "max_discount_amount", "applicable_to", "valid_from", "valid_until", "is_active")
VALUES
  -- Welcome offer: 20% off any first purchase, max ₹200 discount
  (
    'WELCOME20',
    'Welcome to Tijarah! 20% off your first purchase',
    'percentage', 20,
    NULL, 0, 1,
    NULL, 200,
    '{sponsorship,subscription,lead_unlock}',
    now(), now() + INTERVAL '6 months',
    true
  ),

  -- Flat ₹100 off sponsorships
  (
    'BOOST100',
    'Flat ₹100 off any sponsorship',
    'fixed_amount', 100,
    500, 0, 3,
    200, NULL,
    '{sponsorship}',
    now(), now() + INTERVAL '3 months',
    true
  ),

  -- 50% off first subscription month, max ₹500
  (
    'STARTER50',
    '50% off your first subscription month',
    'percentage', 50,
    200, 0, 1,
    NULL, 500,
    '{subscription}',
    now(), now() + INTERVAL '2 months',
    true
  ),

  -- Flash sale: ₹25 off lead unlocks
  (
    'LEADS25',
    '₹25 off each lead unlock',
    'fixed_amount', 25,
    1000, 0, 10,
    NULL, NULL,
    '{lead_unlock}',
    now(), now() + INTERVAL '1 month',
    true
  ),

  -- Festive offer: 30% off everything, max ₹1000
  (
    'FESTIVE30',
    'Festive season special — 30% off everything!',
    'percentage', 30,
    NULL, 0, 2,
    100, 1000,
    '{sponsorship,subscription,lead_unlock,badge}',
    now(), now() + INTERVAL '45 days',
    true
  ),

  -- Expired voucher (for testing)
  (
    'EXPIRED10',
    'This voucher has expired (test data)',
    'percentage', 10,
    100, 5, 1,
    NULL, NULL,
    '{sponsorship}',
    now() - INTERVAL '60 days', now() - INTERVAL '1 day',
    false
  ),

  -- Fully used voucher (for testing)
  (
    'MAXEDOUT',
    'Fully redeemed voucher (test data)',
    'fixed_amount', 50,
    10, 10, 1,
    NULL, NULL,
    '{lead_unlock}',
    now() - INTERVAL '30 days', now() + INTERVAL '30 days',
    true
  ),

  -- VIP provider voucher: 40% off, very limited
  (
    'VIP40',
    'VIP provider exclusive — 40% off Pro subscription',
    'percentage', 40,
    20, 0, 1,
    NULL, 2000,
    '{subscription}',
    now(), now() + INTERVAL '90 days',
    true
  )

ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description",
  "discount_type" = EXCLUDED."discount_type",
  "discount_value" = EXCLUDED."discount_value",
  "max_uses" = EXCLUDED."max_uses",
  "max_uses_per_provider" = EXCLUDED."max_uses_per_provider",
  "min_purchase_amount" = EXCLUDED."min_purchase_amount",
  "max_discount_amount" = EXCLUDED."max_discount_amount",
  "applicable_to" = EXCLUDED."applicable_to",
  "valid_from" = EXCLUDED."valid_from",
  "valid_until" = EXCLUDED."valid_until",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

SELECT 'Vouchers seeded: ' || count(*) FROM vouchers;
