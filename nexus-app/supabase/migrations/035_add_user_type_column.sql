-- Migration: 035_add_user_type_column.sql
-- Description: Add user_type column to users table so profile inserts succeed
-- Date: 2025-07-09

-- 1. Add the column if it doesn't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'human';

-- 2. Back-fill existing rows that may still be NULL (if the column existed but had no default)
UPDATE users
SET user_type = 'human'
WHERE user_type IS NULL;

-- 3. Optional index if queries will filter by this column (commented out; enable if needed)
-- CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- 4. Permissions – users table already has GRANTs, but repeat to be safe (idempotent)
GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated, service_role, postgres; 