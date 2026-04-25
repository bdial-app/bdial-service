-- Migration: Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  device_info VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports (status, created_at);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON bug_reports (reporter_id);
