-- Migration: 028_add_optimized_feed_query.sql
-- Description: Add universal optimized query function for all pages (feed, profile, logbook, dreams, resonance-field)
-- Date: 2025-01-XX

-- OPTIMIZED: Create covering, partial indexes for all hot paths
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

-- Private entries by user (for logbook/dreams)
CREATE INDEX IF NOT EXISTS idx_se_private_user_ts
ON stream_entries (user_id, timestamp DESC)
WHERE privacy = 'private';

-- All entries by user (for profile pages)
CREATE INDEX IF NOT EXISTS idx_se_user_ts
ON stream_entries (user_id, timestamp DESC);

-- Make interaction counts table covering (include all count columns in index)
DROP INDEX IF EXISTS idx_entry_interaction_counts_entry_id;
CREATE INDEX IF NOT EXISTS idx_entry_interaction_counts_covering 
ON entry_interaction_counts (entry_id) 
INCLUDE (resonance_count, branch_count, amplification_count, share_count);

-- UNIVERSAL: Function to get entries with interaction counts and user interaction states
-- Powers all pages: feed, profile, logbook, dreams, resonance-field
CREATE OR REPLACE FUNCTION get_entries_with_user_states(
    entry_type_filter text COLLATE "C" DEFAULT NULL,        -- 'logbook', 'dream', or NULL for both
    user_id_filter text COLLATE "C" DEFAULT NULL,           -- Filter by post author (for profile/logbook/dreams)
    privacy_filter text COLLATE "C" DEFAULT 'public',       -- 'public', 'private', or NULL for both
    target_user_id text COLLATE "C" DEFAULT NULL,           -- User whose interaction states we want
    user_has_resonated boolean DEFAULT NULL,                -- Only posts user has resonated with (resonance-field)
    user_has_amplified boolean DEFAULT NULL,                -- Only posts user has amplified
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
    -- Universal query with optimized JOINs for index usage and flexible filtering
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
        -- Input validation (causes empty result set if invalid)
        sort_by IN ('timestamp', 'interactions')
        AND sort_order IN ('asc', 'desc') 
        AND page_limit >= 1 AND page_limit <= 100
        AND page_offset >= 0
        AND CASE WHEN privacy_filter IS NOT NULL THEN privacy_filter IN ('public', 'private') ELSE TRUE END
        -- UNIVERSAL FILTERS: Use explicit CASE blocks for better index usage
        AND CASE WHEN entry_type_filter IS NULL THEN TRUE
             ELSE se.entry_type = entry_type_filter END
        AND CASE WHEN user_id_filter IS NULL THEN TRUE
             ELSE se.user_id = user_id_filter END
        AND CASE WHEN privacy_filter IS NULL THEN TRUE
             ELSE se.privacy = privacy_filter END
        -- INTERACTION-BASED FILTERS: For resonance-field and amplified pages
        AND CASE WHEN user_has_resonated IS NULL THEN TRUE
             WHEN user_has_resonated = TRUE THEN ur.user_id IS NOT NULL
             ELSE ur.user_id IS NULL END
        AND CASE WHEN user_has_amplified IS NULL THEN TRUE
             WHEN user_has_amplified = TRUE THEN ua.user_id IS NOT NULL
             ELSE ua.user_id IS NULL END
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
'Universal optimized function to fetch entries with interaction counts and user interaction states in a single query. 
Powers all pages: feed (privacy=public), profile (user_id_filter), logbook/dreams (user_id_filter + entry_type_filter + privacy), 
resonance-field (user_has_resonated=true), amplified (user_has_amplified=true).
Features: SQL inlining, optimized JOIN predicates for index usage, stable pagination with tie-breakers, flexible filtering.';

COMMENT ON INDEX idx_se_public_ts IS 
'Covering index for public feed entries sorted by timestamp - optimized for feed queries';

COMMENT ON INDEX idx_se_public_type_ts IS 
'Covering index for public feed entries filtered by type and sorted by timestamp';

COMMENT ON INDEX idx_se_public_user_ts IS 
'Covering index for public feed entries filtered by user and sorted by timestamp - optimized for author filtering';

COMMENT ON INDEX idx_se_private_user_ts IS 
'Covering index for private entries by user - optimized for logbook/dreams pages';

COMMENT ON INDEX idx_se_user_ts IS 
'Covering index for all entries by user - optimized for profile pages';

COMMENT ON INDEX idx_entry_interaction_counts_covering IS 
'Covering index for interaction counts - includes all count columns to avoid heap lookups'; 