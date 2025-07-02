-- Migration: 011_add_entry_type_to_stream_entries.sql
-- Description: Add entry_type column to stream_entries to explicitly label entries as 'logbook' or 'dream'
-- Date: 2025-07-02

-- 1. Add the new column with a default value
ALTER TABLE stream_entries
ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'logbook' CHECK (entry_type IN ('logbook', 'dream'));

-- 2. Back-fill existing rows using heuristics on the "type" column
UPDATE stream_entries
SET entry_type = CASE
    WHEN type ILIKE '%dream%' OR type ILIKE '%lucid%' THEN 'dream'
    ELSE 'logbook'
END;

-- 3. Create an index for faster look-ups by entry_type
CREATE INDEX IF NOT EXISTS idx_stream_entries_entry_type ON stream_entries(entry_type); 