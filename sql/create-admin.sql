-- ============================================================
-- Create Admin User
-- Run this against your Supabase / PostgreSQL database.
-- Adjust the values in the SET block before running.
-- ============================================================

DO $$
DECLARE
  v_mobile   TEXT := '9999999999';   -- 10-digit mobile, no country code
  v_name     TEXT := 'Admin';
  v_gender   TEXT := 'male';         -- 'male' | 'female' | 'other'
  v_email    TEXT := NULL;           -- optional
  v_existing UUID;
BEGIN
  -- Check if user already exists with this mobile
  SELECT id INTO v_existing
  FROM users
  WHERE mobile_number = v_mobile;

  IF v_existing IS NOT NULL THEN
    -- Upgrade existing user to admin
    UPDATE users
    SET
      role   = 'admin',
      status = 'active',
      name   = v_name
    WHERE id = v_existing;

    RAISE NOTICE 'Existing user % upgraded to admin.', v_existing;
  ELSE
    -- Insert new admin user
    INSERT INTO users (
      id,
      mobile_number,
      name,
      gender,
      email,
      role,
      status,
      preferred_mode,
      preferred_language,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_mobile,
      v_name,
      v_gender::users_gender_enum,
      v_email,
      'admin'::users_role_enum,
      'active'::users_status_enum,
      'customer',
      'en',
      now(),
      now()
    );

    RAISE NOTICE 'New admin user created with mobile %.', v_mobile;
  END IF;
END $$;

-- Verify
SELECT id, mobile_number, name, role, status, created_at
FROM users
WHERE role = 'admin';
