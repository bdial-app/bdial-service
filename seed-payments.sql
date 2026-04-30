-- ============================================================
-- Payment & Subscription Test Data
-- Creates sample payments and subscriptions for UAT/demo
-- Run AFTER seed.sql + seed-subscription-plans.sql + seed-vouchers.sql
-- Requires existing providers in the database
-- ============================================================

DO $$
DECLARE
  v_provider_1   UUID;
  v_provider_2   UUID;
  v_provider_3   UUID;
  v_free_plan    UUID;
  v_starter_plan UUID;
  v_growth_plan  UUID;
  v_pro_plan     UUID;
  v_welcome_v    UUID;
  v_boost_v      UUID;
BEGIN
  -- Look up first 3 providers
  SELECT id INTO v_provider_1 FROM providers ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_provider_2 FROM providers ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO v_provider_3 FROM providers ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  IF v_provider_1 IS NULL THEN
    RAISE NOTICE 'No providers found — skipping payment seed data';
    RETURN;
  END IF;

  -- Look up plans
  SELECT id INTO v_free_plan    FROM subscription_plans WHERE slug = 'free';
  SELECT id INTO v_starter_plan FROM subscription_plans WHERE slug = 'starter';
  SELECT id INTO v_growth_plan  FROM subscription_plans WHERE slug = 'growth';
  SELECT id INTO v_pro_plan     FROM subscription_plans WHERE slug = 'pro';

  -- Look up vouchers
  SELECT id INTO v_welcome_v FROM vouchers WHERE code = 'WELCOME20';
  SELECT id INTO v_boost_v   FROM vouchers WHERE code = 'BOOST100';

  -- ─── Sample Payments ─────────────────────────────────────
  -- Provider 1: subscription payment (succeeded)
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_1, 299, 'INR', 'succeeded', 'subscription',
    '{"plan": "starter", "interval": "monthly"}'::jsonb,
    now() - INTERVAL '25 days')
  ON CONFLICT DO NOTHING;

  -- Provider 1: sponsorship payment with voucher (succeeded)
  INSERT INTO payments (provider_id, amount, currency, status, type, voucher_id, discount_amount, metadata, created_at)
  VALUES (v_provider_1, 500, 'INR', 'succeeded', 'sponsorship',
    v_boost_v, 100,
    '{"listingType": "inline", "durationDays": 7}'::jsonb,
    now() - INTERVAL '20 days')
  ON CONFLICT DO NOTHING;

  -- Provider 1: lead unlock (succeeded)
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_1, 49, 'INR', 'succeeded', 'lead_unlock',
    jsonb_build_object('leadProviderId', COALESCE(v_provider_2::text, '')),
    now() - INTERVAL '15 days')
  ON CONFLICT DO NOTHING;

  -- Provider 2: subscription payment (succeeded)
  INSERT INTO payments (provider_id, amount, currency, status, type, voucher_id, discount_amount, metadata, created_at)
  VALUES (v_provider_2, 799, 'INR', 'succeeded', 'subscription',
    v_welcome_v, 160,
    '{"plan": "growth", "interval": "monthly"}'::jsonb,
    now() - INTERVAL '18 days')
  ON CONFLICT DO NOTHING;

  -- Provider 2: sponsorship (succeeded)
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_2, 1000, 'INR', 'succeeded', 'sponsorship',
    '{"listingType": "carousel", "durationDays": 14}'::jsonb,
    now() - INTERVAL '10 days')
  ON CONFLICT DO NOTHING;

  -- Provider 3: failed payment
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_3, 299, 'INR', 'failed', 'subscription',
    '{"plan": "starter", "interval": "monthly", "failReason": "card_declined"}'::jsonb,
    now() - INTERVAL '5 days')
  ON CONFLICT DO NOTHING;

  -- Provider 3: successful retry
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_3, 299, 'INR', 'succeeded', 'subscription',
    '{"plan": "starter", "interval": "monthly"}'::jsonb,
    now() - INTERVAL '4 days')
  ON CONFLICT DO NOTHING;

  -- Provider 2: multiple lead unlocks
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES
    (v_provider_2, 49, 'INR', 'succeeded', 'lead_unlock', '{}'::jsonb, now() - INTERVAL '8 days'),
    (v_provider_2, 49, 'INR', 'succeeded', 'lead_unlock', '{}'::jsonb, now() - INTERVAL '6 days'),
    (v_provider_2, 49, 'INR', 'succeeded', 'lead_unlock', '{}'::jsonb, now() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- Provider 1: pending payment
  INSERT INTO payments (provider_id, amount, currency, status, type, metadata, created_at)
  VALUES (v_provider_1, 1999, 'INR', 'pending', 'subscription',
    '{"plan": "pro", "interval": "monthly"}'::jsonb,
    now() - INTERVAL '1 hour')
  ON CONFLICT DO NOTHING;

  -- ─── Sample Subscriptions ────────────────────────────────
  -- Clean up any existing subscriptions for demo providers
  DELETE FROM subscriptions WHERE provider_id IN (v_provider_1, v_provider_2, v_provider_3);

  -- Provider 1 on Starter plan
  INSERT INTO subscriptions (provider_id, plan_id, stripe_subscription_id, stripe_customer_id, status, billing_interval, current_period_start, current_period_end, lead_unlocks_used, lead_unlocks_reset_at)
  VALUES (
    v_provider_1, v_starter_plan,
    'sub_demo_' || RIGHT(v_provider_1::text, 12),
    'cus_demo_' || RIGHT(v_provider_1::text, 12),
    'active', 'monthly',
    now() - INTERVAL '25 days',
    now() + INTERVAL '5 days',
    2,
    now() + INTERVAL '5 days'
  )
  ON CONFLICT ("provider_id") DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    lead_unlocks_used = EXCLUDED.lead_unlocks_used,
    updated_at = now();

  -- Provider 2 on Growth plan
  IF v_provider_2 IS NOT NULL THEN
    INSERT INTO subscriptions (provider_id, plan_id, stripe_subscription_id, stripe_customer_id, status, billing_interval, current_period_start, current_period_end, lead_unlocks_used, lead_unlocks_reset_at)
    VALUES (
      v_provider_2, v_growth_plan,
      'sub_demo_' || RIGHT(v_provider_2::text, 12),
      'cus_demo_' || RIGHT(v_provider_2::text, 12),
      'active', 'monthly',
      now() - INTERVAL '18 days',
      now() + INTERVAL '12 days',
      8,
      now() + INTERVAL '12 days'
    )
    ON CONFLICT ("provider_id") DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      lead_unlocks_used = EXCLUDED.lead_unlocks_used,
      updated_at = now();
  END IF;

  -- Provider 3 on Starter (canceling)
  IF v_provider_3 IS NOT NULL THEN
    INSERT INTO subscriptions (provider_id, plan_id, stripe_subscription_id, stripe_customer_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, lead_unlocks_used, lead_unlocks_reset_at)
    VALUES (
      v_provider_3, v_starter_plan,
      'sub_demo_' || RIGHT(v_provider_3::text, 12),
      'cus_demo_' || RIGHT(v_provider_3::text, 12),
      'active', 'monthly',
      now() - INTERVAL '4 days',
      now() + INTERVAL '26 days',
      true,
      0,
      now() + INTERVAL '26 days'
    )
    ON CONFLICT ("provider_id") DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now();
  END IF;

  -- Update voucher used counts for demo data
  UPDATE vouchers SET used_count = 1 WHERE code = 'WELCOME20';
  UPDATE vouchers SET used_count = 1 WHERE code = 'BOOST100';

  RAISE NOTICE 'Payment & subscription seed data inserted successfully';
END $$;

SELECT 'Payments: ' || count(*) FROM payments;
SELECT 'Subscriptions: ' || count(*) FROM subscriptions;
