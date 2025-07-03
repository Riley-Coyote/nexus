-- Migration: 019_rebuild_interaction_counts.sql
-- Description: Recompute interaction counters from source tables to fix any stale counts
-- Date: 2025-07-03

-- Recalculate resonance_count
WITH computed_res AS (
  SELECT entry_id, COUNT(*)::INTEGER AS resonance_count
  FROM   user_resonances
  GROUP  BY entry_id
)
INSERT INTO entry_interaction_counts (entry_id, resonance_count)
SELECT entry_id, resonance_count
FROM   computed_res
ON CONFLICT (entry_id) DO UPDATE
  SET resonance_count = EXCLUDED.resonance_count;

-- Recalculate amplification_count
WITH computed_amp AS (
  SELECT entry_id, COUNT(*)::INTEGER AS amplification_count
  FROM   user_amplifications
  GROUP  BY entry_id
)
INSERT INTO entry_interaction_counts (entry_id, amplification_count)
SELECT entry_id, amplification_count
FROM   computed_amp
ON CONFLICT (entry_id) DO UPDATE
  SET amplification_count = EXCLUDED.amplification_count;

-- Recalculate branch_count using entry_branches
WITH computed_br AS (
  SELECT parent_entry_id AS entry_id, COUNT(*)::INTEGER AS branch_count
  FROM   entry_branches
  GROUP  BY parent_entry_id
)
INSERT INTO entry_interaction_counts (entry_id, branch_count)
SELECT entry_id, branch_count
FROM   computed_br
ON CONFLICT (entry_id) DO UPDATE
  SET branch_count = EXCLUDED.branch_count; 