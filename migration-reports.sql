-- ============================================
-- Migration: Reports + Provider Warnings
-- ============================================

-- Report entity type enum
DO $$ BEGIN
  CREATE TYPE report_entity_type AS ENUM ('provider', 'product', 'message');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Report reason enum
DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'fake_business', 'inappropriate_content', 'fraud_scam', 'harassment',
    'impersonation', 'wrong_category', 'fake_product', 'counterfeit',
    'prohibited_item', 'wrong_price', 'spam', 'fraud', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Report status enum
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'action_taken', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Report admin action enum
DO $$ BEGIN
  CREATE TYPE report_admin_action AS ENUM ('warning', 'suspend', 'ban');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Provider warning type enum
DO $$ BEGIN
  CREATE TYPE provider_warning_type AS ENUM ('report_warning', 'policy_violation', 'content_warning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Reports table
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   report_entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  reason        report_reason NOT NULL,
  description   VARCHAR(500),
  status        report_status NOT NULL DEFAULT 'pending',
  admin_action  report_admin_action,
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_entity     ON reports (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter   ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_date ON reports (status, created_at);

-- ============================================
-- Provider warnings table
-- ============================================
CREATE TABLE IF NOT EXISTS provider_warnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  warning_type  provider_warning_type NOT NULL DEFAULT 'report_warning',
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  report_id     UUID REFERENCES reports(id),
  issued_by     UUID NOT NULL REFERENCES users(id),
  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_warnings_provider ON provider_warnings (provider_id, created_at);
CREATE INDEX IF NOT EXISTS idx_provider_warnings_read     ON provider_warnings (is_read);
