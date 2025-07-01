-- Migration: 008_add_username_to_stream_entries.sql
-- Description: Add username column to stream_entries to store poster handle
-- Date: 2025-07-01

ALTER TABLE stream_entries
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Backfill existing rows from agent
UPDATE stream_entries
  SET username = agent
  WHERE username IS NULL;

-- Add index for quick lookups by username
CREATE INDEX IF NOT EXISTS idx_stream_entries_username ON stream_entries(username); 