-- Migration: 013_refresh_branch_counts.sql
-- Description: Recalculate branch_count values in entry_interaction_counts so they accurately reflect the number of direct children (branches) each entry currently has.
-- Date: 2025-07-02

-- 1. Aggregate the current branch counts from entry_branches
WITH agg AS (
  SELECT parent_entry_id     AS entry_id,
         COUNT(*)            AS branch_count
  FROM   entry_branches
  GROUP  BY parent_entry_id
)
-- 2. Upsert into entry_interaction_counts.
--    a) If a row exists, overwrite its branch_count with the fresh value.
--    b) If no row exists (possible for very old entries), insert a new row initialised with the correct branch_count and zeros for the other counters.
INSERT INTO entry_interaction_counts AS eic (entry_id, branch_count, resonance_count, amplification_count, share_count)
SELECT entry_id,
       branch_count,
       0               AS resonance_count,
       0               AS amplification_count,
       0               AS share_count
FROM   agg
ON CONFLICT (entry_id) DO UPDATE
SET    branch_count = EXCLUDED.branch_count,
       updated_at   = NOW();

-- 3. (Optional safety) For any rows that still have NULL branch_count, set them to 0 to avoid null issues.
UPDATE entry_interaction_counts
SET    branch_count = 0
WHERE  branch_count IS NULL;

-- 4. Remember to bump the updated_at timestamp for all modified rows (handled above in UPSERT).

-- ✅ Branch counts are now in sync with existing branch relationships. 