-- Migration: 016_fix_get_interaction_counts_join.sql
-- Description: Fix join in get_interaction_counts to avoid USING clause error
-- Date: 2025-07-03

CREATE OR REPLACE FUNCTION get_interaction_counts(entry_ids BIGINT[])
RETURNS TABLE(
    entry_id            BIGINT,
    resonance_count     INTEGER,
    branch_count        INTEGER,
    amplification_count INTEGER,
    share_count         INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT  target_entry_id                                         AS entry_id,
            COALESCE(eic.resonance_count,     0)                    AS resonance_count,
            COALESCE(eic.branch_count,        0)                    AS branch_count,
            COALESCE(eic.amplification_count, 0)                    AS amplification_count,
            COALESCE(eic.share_count,         0)                    AS share_count
    FROM   unnest(entry_ids) AS target_entry_id
    LEFT   JOIN entry_interaction_counts eic
           ON eic.entry_id = target_entry_id;
END;
$$ LANGUAGE plpgsql; 