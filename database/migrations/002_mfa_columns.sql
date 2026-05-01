-- ============================================================
-- Migration 002: MFA columns on users table
-- Thêm TOTP (speakeasy) cho admin và manager
-- Run: psql -U postgres -d flood_rescue_db -f 002_mfa_columns.sql
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_secret  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

-- Done
DO $$ BEGIN
  RAISE NOTICE 'Migration 002_mfa_columns completed successfully.';
END $$;
