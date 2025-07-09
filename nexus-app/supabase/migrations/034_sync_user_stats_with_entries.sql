-- Migration: 034_sync_user_stats_with_entries.sql
-- Description: Recalculate and synchronise users.stats (entries & dreams) with actual counts in stream_entries.
--              Safe to run multiple times (idempotent) – it recomputes from scratch each execution.
-- Date: 2025-07-09

-- 1. Create a temporary materialised view with per-user counts
CREATE TEMP TABLE _user_entry_counts ON COMMIT DROP AS
SELECT
    user_id                          AS id,
    COUNT(*) FILTER (WHERE entry_type = 'logbook') AS entries_count,
    COUNT(*) FILTER (WHERE entry_type = 'dream')   AS dreams_count
FROM stream_entries
GROUP BY user_id;

-- 2. Update stats JSON for users that have entries in the temp table
UPDATE users AS u
SET stats = jsonb_set(
              jsonb_set(
                  stats,
                  '{entries}',
                  to_jsonb(c.entries_count)
              ),
              '{dreams}',
              to_jsonb(c.dreams_count)
          )
FROM _user_entry_counts AS c
WHERE u.id = c.id;

-- 3. For users with **no** entries (not present in temp table) set entries & dreams to 0
UPDATE users
SET stats = jsonb_set(
            jsonb_set(stats, '{entries}', '0'::jsonb),
            '{dreams}', '0'::jsonb
          )
WHERE id NOT IN (SELECT id FROM _user_entry_counts);

-- No need to clean up – TEMP table is dropped automatically at commit. 