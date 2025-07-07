-- Migration: Create user_resonated_entries_v view (idempotent)
-- This migration safely creates the view if it doesn't exist
-- Can be run multiple times without errors

-- Drop view if it exists (idempotent approach)
DROP VIEW IF EXISTS public.user_resonated_entries_v;

-- Create the view that joins user resonances with stream entries and interaction counts
CREATE VIEW public.user_resonated_entries_v AS
SELECT
    -- All columns from stream_entries (actual schema)
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
    
    -- Interaction counts from entry_interaction_counts table
    COALESCE(eic.resonance_count, 0) as resonance_count,
    COALESCE(eic.branch_count, 0) as branch_count,
    COALESCE(eic.amplification_count, 0) as amplification_count,
    COALESCE(eic.share_count, 0) as share_count,
    
    -- Include the resonator user ID for filtering
    ur.user_id as resonator_id,
    
    -- Include when the resonance was created
    ur.created_at as resonated_at
    
FROM public.user_resonances ur
INNER JOIN public.stream_entries se ON se.id = ur.entry_id
LEFT JOIN public.entry_interaction_counts eic ON eic.entry_id = se.id;

-- Add comment explaining the view
COMMENT ON VIEW public.user_resonated_entries_v IS 
'View that returns all stream entries a user has resonated with, including interaction counts. Filtered by resonator_id.';

-- Grant appropriate permissions
-- Note: RLS will automatically apply from the underlying tables
GRANT SELECT ON public.user_resonated_entries_v TO authenticated;
GRANT SELECT ON public.user_resonated_entries_v TO anon; 