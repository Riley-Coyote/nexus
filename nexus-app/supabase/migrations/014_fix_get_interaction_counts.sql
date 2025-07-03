-- Migration: 014_fix_get_interaction_counts.sql
-- Description: Ensure get_interaction_counts always returns the input entry_id even when no counter row exists
-- Date: 2025-07-03

-- 1️⃣  Replace the function so it uses the unnested id as the authoritative key
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
    LEFT   JOIN entry_interaction_counts eic USING (entry_id);
END;
$$ LANGUAGE plpgsql;

-- 2️⃣  Back-fill any missing rows in entry_interaction_counts for existing stream entries
INSERT INTO entry_interaction_counts (entry_id, resonance_count, branch_count, amplification_count, share_count)
SELECT  se.id,
        COALESCE((se.interactions->>'resonances')::INTEGER,     0),
        COALESCE((se.interactions->>'branches')::INTEGER,       0),
        COALESCE((se.interactions->>'amplifications')::INTEGER, 0),
        COALESCE((se.interactions->>'shares')::INTEGER,         0)
FROM    stream_entries se
WHERE   NOT EXISTS (
    SELECT 1 FROM entry_interaction_counts eic WHERE eic.entry_id = se.id
); 