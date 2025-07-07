-- Migration: 029_fix_toggle_user_resonance_uuid.sql
-- Description: Fix toggle_user_resonance and toggle_user_amplification functions to accept UUID instead of TEXT
-- This fixes the "operator does not exist: uuid = text" error after migration 028
-- Date: 2025-01-XX

-- Drop old functions that use TEXT parameters
DROP FUNCTION IF EXISTS toggle_user_resonance(TEXT, BIGINT);
DROP FUNCTION IF EXISTS toggle_user_amplification(TEXT, BIGINT);
DROP FUNCTION IF EXISTS get_user_interaction_states(TEXT, BIGINT[]);

-- Fix toggle_user_resonance function to accept UUID
CREATE OR REPLACE FUNCTION toggle_user_resonance(
    target_user_id UUID,  -- Changed from TEXT to UUID
    target_entry_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    was_resonated BOOLEAN := FALSE;
BEGIN
    -- Check if already resonated
    SELECT EXISTS (
        SELECT 1 FROM user_resonances 
        WHERE user_id = target_user_id AND entry_id = target_entry_id
    ) INTO was_resonated;
    
    IF was_resonated THEN
        -- Remove resonance
        DELETE FROM user_resonances 
        WHERE user_id = target_user_id AND entry_id = target_entry_id;
        RETURN FALSE; -- Now not resonated
    ELSE
        -- Add resonance
        INSERT INTO user_resonances (user_id, entry_id)
        VALUES (target_user_id, target_entry_id);
        RETURN TRUE; -- Now resonated
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix toggle_user_amplification function to accept UUID
CREATE OR REPLACE FUNCTION toggle_user_amplification(
    target_user_id UUID,  -- Changed from TEXT to UUID
    target_entry_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    was_amplified BOOLEAN := FALSE;
BEGIN
    -- Check if already amplified
    SELECT EXISTS (
        SELECT 1 FROM user_amplifications 
        WHERE user_id = target_user_id AND entry_id = target_entry_id
    ) INTO was_amplified;
    
    IF was_amplified THEN
        -- Remove amplification
        DELETE FROM user_amplifications 
        WHERE user_id = target_user_id AND entry_id = target_entry_id;
        RETURN FALSE; -- Now not amplified
    ELSE
        -- Add amplification
        INSERT INTO user_amplifications (user_id, entry_id)
        VALUES (target_user_id, target_entry_id);
        RETURN TRUE; -- Now amplified
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (using full function signatures for clarity)
GRANT EXECUTE ON FUNCTION toggle_user_resonance(UUID, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION toggle_user_amplification(UUID, BIGINT) TO authenticated, anon;

-- Fix get_user_interaction_states function to accept UUID
CREATE OR REPLACE FUNCTION get_user_interaction_states(
    target_user_id UUID,  -- Changed from TEXT to UUID
    entry_ids BIGINT[]
) RETURNS TABLE(
    entry_id BIGINT,
    has_resonated BOOLEAN,
    has_amplified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        target_entry_id,
        EXISTS(SELECT 1 FROM user_resonances ur WHERE ur.user_id = target_user_id AND ur.entry_id = target_entry_id) AS has_resonated,
        EXISTS(SELECT 1 FROM user_amplifications ua WHERE ua.user_id = target_user_id AND ua.entry_id = target_entry_id) AS has_amplified
    FROM unnest(entry_ids) AS target_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (using full function signature for clarity)
GRANT EXECUTE ON FUNCTION get_user_interaction_states(UUID, BIGINT[]) TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION toggle_user_resonance IS 
'Toggle user resonance for an entry. Returns true if now resonated, false if unresonated. Updated to accept UUID user_id.';

COMMENT ON FUNCTION toggle_user_amplification IS 
'Toggle user amplification for an entry. Returns true if now amplified, false if unamplified. Updated to accept UUID user_id.';

COMMENT ON FUNCTION get_user_interaction_states IS 
'Get user interaction states for multiple entries. Returns has_resonated and has_amplified flags. Updated to accept UUID user_id.'; 