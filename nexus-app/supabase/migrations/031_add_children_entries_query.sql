-- Migration: 031_add_children_entries_query.sql
-- Description: Optimized RPC to fetch first-level children of a post with interaction counts & user states (for deep-dive view)
-- Date: 2025-XX-XX

-- Ensure stream_entries.user_id is UUID for type consistency
ALTER TABLE stream_entries
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 1. Supporting index for fast parent lookup + time sort
-- Re-create covering index with id DESC as tie-breaker for true index-only scans
DROP INDEX IF EXISTS idx_se_parent_ts;
CREATE INDEX IF NOT EXISTS idx_se_parent_ts
  ON stream_entries(parent_id, timestamp DESC, id DESC);

-- -----------------------------------------------------------------------------
-- Updated FUNCTION: deterministic ORDER BY (no CASE) so planner can leverage
-- idx_se_parent_ts for timestamp sort. We branch on parameters instead of CASE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_children_entries_with_user_states(
    parent_entry_id bigint,
    target_user_id  uuid   DEFAULT NULL,
    page_offset     integer DEFAULT 0,
    page_limit      integer DEFAULT 20,
    sort_by         text    DEFAULT 'timestamp',   -- 'timestamp' | 'interactions'
    sort_order      text    DEFAULT 'asc'          -- 'asc' | 'desc'
) RETURNS TABLE(
    id bigint,
    parent_id bigint,
    children bigint[],
    depth integer,
    type text,
    agent text,
    connections integer,
    metrics jsonb,
    "timestamp" timestamptz,
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
    created_at timestamptz,
    updated_at timestamptz,
    subtype text,
    resonance_field numeric,
    quantum_layer integer,
    metadata jsonb,
    visibility text,
    collaborators text[],
    share_token text,
    entry_type text,

    resonance_count integer,
    branch_count integer,
    amplification_count integer,
    share_count integer,
    score integer,

    has_resonated boolean,
    has_amplified boolean
) LANGUAGE plpgsql VOLATILE PARALLEL SAFE SECURITY INVOKER AS $$
BEGIN
    IF page_limit < 1 OR page_limit > 100 THEN
        RAISE EXCEPTION 'page_limit % out of range (1-100)', page_limit;
    END IF;

    IF sort_by NOT IN ('timestamp','interactions') THEN
        RAISE EXCEPTION 'invalid sort_by %', sort_by;
    END IF;

    IF sort_order NOT IN ('asc','desc') THEN
        RAISE EXCEPTION 'invalid sort_order %', sort_order;
    END IF;

    -- ------------------------------------------------------------------
    -- TIMESTAMP sorting branch (leverages idx_se_parent_ts)
    -- ------------------------------------------------------------------
    IF sort_by = 'timestamp' THEN
        IF sort_order = 'desc' THEN
            RETURN QUERY
            SELECT
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
                COALESCE(eic.resonance_count,0),
                COALESCE(eic.branch_count,0),
                COALESCE(eic.amplification_count,0),
                COALESCE(eic.share_count,0),
                COALESCE(eic.score,0),
                (ur.user_id IS NOT NULL),
                (ua.user_id IS NOT NULL)
            FROM stream_entries se
            LEFT JOIN entry_interaction_counts eic ON eic.entry_id = se.id
            LEFT JOIN user_resonances ur        ON target_user_id IS NOT NULL AND ur.entry_id = se.id AND ur.user_id = target_user_id
            LEFT JOIN user_amplifications ua    ON target_user_id IS NOT NULL AND ua.entry_id = se.id AND ua.user_id = target_user_id
            WHERE se.parent_id = parent_entry_id
            ORDER BY se.timestamp DESC, se.id DESC
            OFFSET page_offset LIMIT page_limit;
        ELSE
            RETURN QUERY
            SELECT
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
                COALESCE(eic.resonance_count,0),
                COALESCE(eic.branch_count,0),
                COALESCE(eic.amplification_count,0),
                COALESCE(eic.share_count,0),
                COALESCE(eic.score,0),
                (ur.user_id IS NOT NULL),
                (ua.user_id IS NOT NULL)
            FROM stream_entries se
            LEFT JOIN entry_interaction_counts eic ON eic.entry_id = se.id
            LEFT JOIN user_resonances ur        ON target_user_id IS NOT NULL AND ur.entry_id = se.id AND ur.user_id = target_user_id
            LEFT JOIN user_amplifications ua    ON target_user_id IS NOT NULL AND ua.entry_id = se.id AND ua.user_id = target_user_id
            WHERE se.parent_id = parent_entry_id
            ORDER BY se.timestamp ASC, se.id ASC
            OFFSET page_offset LIMIT page_limit;
        END IF;

    -- ------------------------------------------------------------------
    -- INTERACTIONS sorting branch (filesort unavoidable for now)
    -- ------------------------------------------------------------------
    ELSE
        IF sort_order = 'desc' THEN
            RETURN QUERY
            SELECT
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
                COALESCE(eic.resonance_count,0),
                COALESCE(eic.branch_count,0),
                COALESCE(eic.amplification_count,0),
                COALESCE(eic.share_count,0),
                COALESCE(eic.score,0),
                (ur.user_id IS NOT NULL),
                (ua.user_id IS NOT NULL)
            FROM stream_entries se
            LEFT JOIN entry_interaction_counts eic ON eic.entry_id = se.id
            LEFT JOIN user_resonances ur        ON target_user_id IS NOT NULL AND ur.entry_id = se.id AND ur.user_id = target_user_id
            LEFT JOIN user_amplifications ua    ON target_user_id IS NOT NULL AND ua.entry_id = se.id AND ua.user_id = target_user_id
            WHERE se.parent_id = parent_entry_id
            ORDER BY eic.score DESC, se.timestamp DESC, se.id DESC
            OFFSET page_offset LIMIT page_limit;
        ELSE
            RETURN QUERY
            SELECT
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
                COALESCE(eic.resonance_count,0),
                COALESCE(eic.branch_count,0),
                COALESCE(eic.amplification_count,0),
                COALESCE(eic.share_count,0),
                COALESCE(eic.score,0),
                (ur.user_id IS NOT NULL),
                (ua.user_id IS NOT NULL)
            FROM stream_entries se
            LEFT JOIN entry_interaction_counts eic ON eic.entry_id = se.id
            LEFT JOIN user_resonances ur        ON target_user_id IS NOT NULL AND ur.entry_id = se.id AND ur.user_id = target_user_id
            LEFT JOIN user_amplifications ua    ON target_user_id IS NOT NULL AND ua.entry_id = se.id AND ua.user_id = target_user_id
            WHERE se.parent_id = parent_entry_id
            ORDER BY eic.score ASC, se.timestamp ASC, se.id ASC
            OFFSET page_offset LIMIT page_limit;
        END IF;
    END IF;
END;$$;

-- 3. Support indexes for user-state joins (user_id first)
CREATE INDEX IF NOT EXISTS idx_user_resonances_uid_eid ON user_resonances(user_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_user_amplifications_uid_eid ON user_amplifications(user_id, entry_id);

GRANT EXECUTE ON FUNCTION get_children_entries_with_user_states TO authenticated, anon;

COMMENT ON FUNCTION get_children_entries_with_user_states IS 'Fetches first-level children of a given entry with interaction counts and per-user states; optimised for deep-dive view.'; 