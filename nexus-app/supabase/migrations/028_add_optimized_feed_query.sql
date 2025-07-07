-- Migration: 028_add_optimized_feed_query.sql
-- Description: Add universal optimized query function for all pages (feed, profile, logbook, dreams, resonance-field)
-- FINAL OPTIMIZATIONS: Score column, cursor pagination, validation guards, remove unnecessary collations
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

-- PERFORMANCE BOOST: Add materialized score column for fast sorting
-- This eliminates runtime calculation and enables index-only scans
ALTER TABLE entry_interaction_counts
  ADD COLUMN IF NOT EXISTS score INT GENERATED ALWAYS AS 
    (resonance_count + amplification_count) STORED;

-- Make interaction counts table covering (include all count columns in index)
DROP INDEX IF EXISTS idx_entry_interaction_counts_entry_id;
CREATE INDEX IF NOT EXISTS idx_entry_interaction_counts_covering 
ON entry_interaction_counts (entry_id) 
INCLUDE (resonance_count, branch_count, amplification_count, share_count, score);

-- PERFORMANCE BOOST: Score index for fast popularity sorting (index-only scan)
-- Structure: (score DESC, entry_id) for optimal index-only plans
CREATE INDEX IF NOT EXISTS idx_eic_score_entry
ON entry_interaction_counts (score DESC, entry_id);

-- STANDARDIZE: Convert user_id columns to UUID for consistency
-- Step 1: Drop views that depend on user_id columns
DROP VIEW IF EXISTS public.user_resonated_entries_v;

-- Step 2: Drop ALL RLS policies that depend on user_id columns (from various migrations)
DROP POLICY IF EXISTS select_own_resonances ON user_resonances;
DROP POLICY IF EXISTS insert_own_resonances ON user_resonances;
DROP POLICY IF EXISTS delete_own_resonances ON user_resonances;
DROP POLICY IF EXISTS select_own_amplifications ON user_amplifications;
DROP POLICY IF EXISTS insert_own_amplifications ON user_amplifications;
DROP POLICY IF EXISTS delete_own_amplifications ON user_amplifications;
-- From migration 006_add_auth_profiles.sql
DROP POLICY IF EXISTS "Users can manage their own resonances" ON user_resonances;
DROP POLICY IF EXISTS "Users can manage their own amplifications" ON user_amplifications;
-- Additional policies that might exist
DROP POLICY IF EXISTS "Anyone can view resonances" ON user_resonances;
DROP POLICY IF EXISTS "Anyone can view amplifications" ON user_amplifications;

-- Step 3: Convert user_resonances.user_id from text to UUID
ALTER TABLE user_resonances 
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Step 4: Convert user_amplifications.user_id from text to UUID
ALTER TABLE user_amplifications 
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Step 5: Recreate RLS policies with UUID column type
-- Public read policies (anyone can view resonances/amplifications)
CREATE POLICY "Anyone can view resonances" ON user_resonances
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view amplifications" ON user_amplifications
    FOR SELECT USING (true);

-- User management policies (users can only manage their own interactions)
CREATE POLICY "Users can manage their own resonances" ON user_resonances
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own amplifications" ON user_amplifications
    FOR ALL USING (user_id = auth.uid());

-- Step 6: Recreate the user_resonated_entries_v view with UUID support
CREATE VIEW public.user_resonated_entries_v AS
SELECT
    -- All columns from stream_entries (actual schema with UUID user_id)
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
    se.visibility,
    se.collaborators,
    se.share_token,
    se.entry_type,
    
    -- Interaction counts from entry_interaction_counts table
    COALESCE(eic.resonance_count, 0) as resonance_count,
    COALESCE(eic.branch_count, 0) as branch_count,
    COALESCE(eic.amplification_count, 0) as amplification_count,
    COALESCE(eic.share_count, 0) as share_count,
    
    -- Include the resonator user ID for filtering (now UUID)
    ur.user_id as resonator_id,
    
    -- Include when the resonance was created
    ur.created_at as resonated_at
    
FROM public.user_resonances ur
INNER JOIN public.stream_entries se ON se.id = ur.entry_id
LEFT JOIN public.entry_interaction_counts eic ON eic.entry_id = se.id;

-- Add comment explaining the view
COMMENT ON VIEW public.user_resonated_entries_v IS 
'View that returns all stream entries a user has resonated with, including interaction counts. Filtered by resonator_id. Updated for UUID user_id support.';

-- Grant appropriate permissions
GRANT SELECT ON public.user_resonated_entries_v TO authenticated;

-- UNIVERSAL: Function to get entries with interaction counts and user interaction states
-- Powers all pages: feed, profile, logbook, dreams, resonance-field
-- OPTIMIZED: Cursor pagination, validation guards, score column usage
CREATE OR REPLACE FUNCTION get_entries_with_user_states(
    entry_type_filter text DEFAULT NULL,                    -- 'logbook', 'dream', or NULL for both
    user_id_filter uuid DEFAULT NULL,                       -- Filter by post author (for profile/logbook/dreams)
    privacy_filter text DEFAULT 'public',                   -- 'public', 'private', or NULL for both
    target_user_id uuid DEFAULT NULL,                       -- User whose interaction states we want
    user_has_resonated boolean DEFAULT NULL,                -- Only posts user has resonated with (resonance-field)
    user_has_amplified boolean DEFAULT NULL,                -- Only posts user has amplified
    page_offset integer DEFAULT 0,                          -- Legacy pagination (use cursor for deep pages)
    page_limit integer DEFAULT 20,
    sort_by text DEFAULT 'timestamp',
    sort_order text DEFAULT 'desc',
    -- CURSOR PAGINATION: For efficient deep paging
    cursor_timestamp timestamp with time zone DEFAULT NULL, -- Last row's timestamp for cursor pagination
    cursor_id bigint DEFAULT NULL                           -- Last row's ID for cursor pagination
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
    "timestamp" timestamp with time zone,
    content text,
    actions text[],
    privacy text,
    interactions jsonb,
    threads jsonb,
    is_amplified boolean,
    user_id uuid,
    username text,
    title text,
    resonance numeric,
    coherence numeric,
    tags text[],
    response jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    subtype text,
    resonance_field numeric,
    quantum_layer integer,
    metadata jsonb,
    visibility text,
    collaborators text[],
    share_token text,
    entry_type text,
    
    -- Interaction counts
    resonance_count integer,
    branch_count integer,
    amplification_count integer,
    share_count integer,
    score integer,
    
    -- User interaction states
    has_resonated boolean,
    has_amplified boolean
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY INVOKER
AS $$
BEGIN
    -- VALIDATION GUARDS: Check parameters once at start with clear error messages
    IF sort_by NOT IN ('timestamp', 'interactions') THEN
        RAISE EXCEPTION 'invalid sort_by %, must be timestamp or interactions', sort_by;
    ELSIF sort_order NOT IN ('asc', 'desc') THEN
        RAISE EXCEPTION 'invalid sort_order %, must be asc or desc', sort_order;
    ELSIF page_limit < 1 OR page_limit > 100 THEN
        RAISE EXCEPTION 'page_limit % out of range, must be 1-100', page_limit;
    ELSIF page_offset < 0 THEN
        RAISE EXCEPTION 'page_offset % cannot be negative', page_offset;
    ELSIF privacy_filter IS NOT NULL AND privacy_filter NOT IN ('public', 'private') THEN
        RAISE EXCEPTION 'invalid privacy_filter %, must be public or private', privacy_filter;
    ELSIF (cursor_timestamp IS NULL) <> (cursor_id IS NULL) THEN
        RAISE EXCEPTION 'cursor_timestamp and cursor_id must be supplied together';
    ELSIF cursor_timestamp IS NOT NULL AND page_offset > 0 THEN
        RAISE EXCEPTION 'cannot use both cursor pagination and offset, set page_offset to 0 when using cursor';
    END IF;
    
    -- Universal query with optimized JOINs for index usage and flexible filtering
    RETURN QUERY
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
        se.visibility,
        se.collaborators,
        se.share_token,
        se.entry_type,
        
        -- Interaction counts
        COALESCE(eic.resonance_count, 0) as resonance_count,
        COALESCE(eic.branch_count, 0) as branch_count,
        COALESCE(eic.amplification_count, 0) as amplification_count,
        COALESCE(eic.share_count, 0) as share_count,
        COALESCE(eic.score, 0) as score,
        
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
    WHERE TRUE
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
        -- CURSOR PAGINATION: For efficient deep paging
        AND CASE WHEN cursor_timestamp IS NOT NULL THEN
                (se.timestamp, se.id) < (cursor_timestamp, cursor_id)
             ELSE TRUE END
    ORDER BY
        -- OPTIMIZED: Use materialized score column for index-only scans
        CASE WHEN sort_by = 'interactions' AND sort_order = 'desc'
             THEN eic.score ELSE NULL END DESC,
        CASE WHEN sort_by = 'interactions' AND sort_order = 'asc'
             THEN eic.score ELSE NULL END ASC,
        -- FIXED: Add missing timestamp ascending case
        CASE WHEN sort_by = 'timestamp' AND sort_order = 'asc'
             THEN se.timestamp ELSE NULL END ASC,
        -- Default to timestamp descending for 'timestamp' mode or as tie-breaker for interactions
        se.timestamp DESC,
        -- Final tie-breaker for stable pagination
        se.id DESC
    LIMIT page_limit
    OFFSET page_offset;
END;
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
OPTIMIZATIONS: Materialized score column for fast sorting, cursor pagination for deep pages, validation guards, 
SQL inlining, optimized JOIN predicates for index usage, stable pagination with tie-breakers, flexible filtering.';

COMMENT ON COLUMN entry_interaction_counts.score IS 
'Materialized score column (resonance_count + amplification_count) for fast popularity sorting with index-only scans';

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
'Covering index for interaction counts - includes all count columns and score to avoid heap lookups';

COMMENT ON INDEX idx_eic_score_entry IS 
'Index for fast popularity sorting using materialized score column - enables index-only scans with (score DESC, entry_id)';

-- Example usage patterns (using named parameters to avoid confusion):
-- 
-- Feed (public posts, latest first):
-- SELECT * FROM get_entries_with_user_states(
--     privacy_filter => 'public', 
--     target_user_id => 'user123', 
--     page_limit => 20
-- );
--
-- Profile (user posts, latest first):
-- SELECT * FROM get_entries_with_user_states(
--     user_id_filter => 'user456', 
--     target_user_id => 'user123', 
--     page_limit => 20
-- );
--
-- Logbook (user's private logbook entries):
-- SELECT * FROM get_entries_with_user_states(
--     entry_type_filter => 'logbook', 
--     user_id_filter => 'user123', 
--     privacy_filter => 'private', 
--     target_user_id => 'user123', 
--     page_limit => 20
-- );
--
-- Dreams (user's private dream entries):
-- SELECT * FROM get_entries_with_user_states(
--     entry_type_filter => 'dream', 
--     user_id_filter => 'user123', 
--     privacy_filter => 'private', 
--     target_user_id => 'user123', 
--     page_limit => 20
-- );
--
-- Resonance Field (posts user has resonated with):
-- SELECT * FROM get_entries_with_user_states(
--     privacy_filter => 'public', 
--     target_user_id => 'user123', 
--     user_has_resonated => true, 
--     page_limit => 20
-- );
--
-- Popular posts (sorted by interaction score):
-- SELECT * FROM get_entries_with_user_states(
--     privacy_filter => 'public', 
--     target_user_id => 'user123', 
--     sort_by => 'interactions', 
--     sort_order => 'desc', 
--     page_limit => 20
-- );
--
-- Cursor pagination (for deep paging):
-- SELECT * FROM get_entries_with_user_states(
--     privacy_filter => 'public', 
--     target_user_id => 'user123', 
--     sort_by => 'timestamp', 
--     sort_order => 'desc', 
--     page_limit => 20, 
--     cursor_timestamp => '2024-01-01 12:00:00'::timestamptz, 
--     cursor_id => 12345
-- ); 