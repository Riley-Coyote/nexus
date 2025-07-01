-- Migration: 007_rename_user_uuid_to_user_id.sql
-- Description: Remove legacy text user_id and rename user_uuid to user_id (UUID)
-- Date: 2025-06-01

-- Drop old RLS policies referencing the legacy user_id column
DROP POLICY IF EXISTS "Users can view entries" ON stream_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON stream_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON stream_entries;

ALTER TABLE stream_entries
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE stream_entries
  RENAME COLUMN user_uuid TO user_id;

-- Drop old indexes and recreate on the renamed column
DROP INDEX IF EXISTS idx_stream_entries_user_id;
DROP INDEX IF EXISTS idx_stream_entries_user_uuid;

CREATE INDEX IF NOT EXISTS idx_stream_entries_user_id ON stream_entries(user_id);

-- Recreate RLS policies for the new UUID-based user_id column
CREATE POLICY "Users can view entries" ON stream_entries
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid());
CREATE POLICY "Users can insert own entries" ON stream_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON stream_entries
  FOR UPDATE USING (auth.uid() = user_id); 