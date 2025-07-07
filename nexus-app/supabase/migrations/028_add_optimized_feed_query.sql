-- Migration: 028_add_optimized_feed_query.sql
-- Description: Add optimized query function that returns entries with interaction counts and user interaction states in one query
-- Date: 2025-01-XX

-- OPTIMIZED: Create covering, partial indexes for hot paths
-- Feed scan & time sort (public entries only)
CREATE INDEX IF NOT EXISTS idx_se_public_ts 
ON stream_entries (timestamp DESC) 
WHERE privacy = 'public';

-- Feed scan filtered by type (public entries only)
CREATE INDEX IF NOT EXISTS idx_se_public_type_ts 
ON stream_entries (entry_type, timestamp DESC) 
WHERE privacy = 'public';

-- User filter hot path (when filtering by author)
CREATE INDEX IF NOT EXISTS idx_se_public_user_ts
ON stream_entries (user_id, timestamp DESC)
WHERE privacy = 'public';

-- Make interaction counts table covering (include all count columns in index)
DROP INDEX IF EXISTS idx_entry_interaction_counts_entry_id;
CREATE INDEX IF NOT EXISTS idx_entry_interaction_counts_covering 
ON entry_interaction_counts (entry_id) 
INCLUDE (resonance_count, branch_count, amplification_count, share_count);

-- OPTIMIZED: Function to get entries with interaction counts and user interaction states in one query
-- Uses LANGUAGE sql for inlining, optimized JOIN predicates, and stable pagination
CREATE OR REPLACE FUNCTION get_entries_with_user_states(
    entry_type_filter text COLLATE "C" DEFAULT NULL,
    user_id_filter text COLLATE "C" DEFAULT NULL,
    target_user_id text COLLATE "C" DEFAULT NULL,  -- User whose interaction states we want
    page_offset integer DEFAULT 0,
    page_limit integer DEFAULT 20,
    sort_by text COLLATE "C" DEFAULT 'timestamp',
    sort_order text COLLATE "C" DEFAULT 'desc'
) RETURNS TABLE(
    -- All stream_entries columns
    id bigint,
    parent_id bigint,
    children bigint[],
    depth integer,
    type text,
    agent text,
    connections integer,
    metrics jsonb,
    timestamp timestamp with time zone,
    content text,
    actions text[],
    privacy text,
    interactions jsonb,
    threads bigint[],
    is_amplified boolean,
    user_id text,
    username text,
    title text,
    resonance numeric,
    coherence numeric,
    tags text[],
    response text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    subtype text,
    resonance_field text,
    quantum_layer text,
    metadata jsonb,
    entry_type text,
    
    -- Interaction counts
    resonance_count integer,
    branch_count integer,
    amplification_count integer,
    share_count integer,
    
    -- User interaction states
    has_resonated boolean,
    has_amplified boolean
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY INVOKER
AS $$
    -- Main query with optimized JOINs for index usage and input validation
    SELECT
        -- All stream_entries columns
        se.id,
        se.parent_id,
        se.children,
        se.depth,
        se.type,
        se.agent,
        se.connections,
        se.metrics,
        se.timestamp,
        se.content,
        se.actions,
        se.privacy,
        se.interactions,
        se.threads,
        se.is_amplified,
        se.user_id,
        se.username,
        se.title,
        se.resonance,
        se.coherence,
        se.tags,
        se.response,
        se.created_at,
        se.updated_at,
        se.subtype,
        se.resonance_field,
        se.quantum_layer,
        se.metadata,
        se.entry_type,
        
        -- Interaction counts
        COALESCE(eic.resonance_count, 0) as resonance_count,
        COALESCE(eic.branch_count, 0) as branch_count,
        COALESCE(eic.amplification_count, 0) as amplification_count,
        COALESCE(eic.share_count, 0) as share_count,
        
        -- User interaction states
        (ur.user_id IS NOT NULL) as has_resonated,
        (ua.user_id IS NOT NULL) as has_amplified
        
    FROM stream_entries se
    LEFT JOIN entry_interaction_counts eic ON se.id = eic.entry_id
    -- OPTIMIZED: Simple JOIN predicates for index usage with boolean short-circuit
    LEFT JOIN user_resonances ur ON 
        target_user_id IS NOT NULL           -- fast reject when null
        AND ur.entry_id = se.id              -- keeps index order  
        AND ur.user_id = target_user_id      -- exact match
    LEFT JOIN user_amplifications ua ON 
        target_user_id IS NOT NULL           -- fast reject when null
        AND ua.entry_id = se.id              -- keeps index order
        AND ua.user_id = target_user_id      -- exact match
    WHERE 
        -- Input validation (will cause empty result set if invalid)
        sort_by IN ('timestamp', 'interactions')
        AND sort_order IN ('asc', 'desc') 
        AND page_limit >= 1 AND page_limit <= 100
        AND page_offset >= 0
        -- Use explicit CASE blocks instead of OR IS NULL predicates for better index usage
        AND CASE WHEN entry_type_filter IS NULL THEN TRUE
             ELSE se.entry_type = entry_type_filter END
        AND CASE WHEN user_id_filter IS NULL THEN TRUE
                 ELSE se.user_id = user_id_filter END
        AND se.privacy = 'public'  -- Only public entries for feed
    ORDER BY
        -- OPTIMIZED: Simplified ORDER BY for guaranteed index usage
        CASE WHEN sort_by = 'interactions' AND sort_order = 'desc'
             THEN (COALESCE(eic.resonance_count, 0) + COALESCE(eic.amplification_count, 0))
             ELSE NULL END DESC,
        CASE WHEN sort_by = 'interactions' AND sort_order = 'asc'
             THEN (COALESCE(eic.resonance_count, 0) + COALESCE(eic.amplification_count, 0))
             ELSE NULL END ASC,
        -- Default to timestamp sort for 'timestamp' mode or as tie-breaker for interactions
        se.timestamp DESC,
        -- Final tie-breaker for stable pagination
        se.id DESC
    LIMIT page_limit
    OFFSET page_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_entries_with_user_states TO authenticated, anon;

-- Create optimized compound indexes for user interaction JOINs (already exist, but ensure they're there)
CREATE INDEX IF NOT EXISTS idx_user_resonances_compound ON user_resonances(entry_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_amplifications_compound ON user_amplifications(entry_id, user_id);

-- Add comments for documentation
COMMENT ON FUNCTION get_entries_with_user_states IS 
'Optimized function to fetch entries with interaction counts and user interaction states in a single query. 
Features: SQL inlining, optimized JOIN predicates for index usage, stable pagination with tie-breakers, input validation.';

COMMENT ON INDEX idx_se_public_ts IS 
'Covering index for public feed entries sorted by timestamp - optimized for feed queries';

COMMENT ON INDEX idx_se_public_type_ts IS 
'Covering index for public feed entries filtered by type and sorted by timestamp';

COMMENT ON INDEX idx_se_public_user_ts IS 
'Covering index for public feed entries filtered by user and sorted by timestamp - optimized for author filtering';

COMMENT ON INDEX idx_entry_interaction_counts_covering IS 
'Covering index for interaction counts - includes all count columns to avoid heap lookups'; 