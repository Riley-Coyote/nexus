-- Migration: 003_efficient_interactions.sql
-- Description: Efficient interaction tracking with atomic counters and proper branching
-- Date: 2025-01-15

-- Drop existing user_interactions table if it exists (we'll replace with better structure)
DROP TABLE IF EXISTS user_interactions CASCADE;

-- Entry Interactions Counter Table
-- Stores aggregated counts for fast lookups
CREATE TABLE IF NOT EXISTS entry_interaction_counts (
    entry_id BIGINT PRIMARY KEY REFERENCES stream_entries(id) ON DELETE CASCADE,
    resonance_count INTEGER DEFAULT 0 CHECK (resonance_count >= 0),
    branch_count INTEGER DEFAULT 0 CHECK (branch_count >= 0),
    amplification_count INTEGER DEFAULT 0 CHECK (amplification_count >= 0),
    share_count INTEGER DEFAULT 0 CHECK (share_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Resonances Table - efficient tracking of who resonated with what
CREATE TABLE IF NOT EXISTS user_resonances (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_id BIGINT NOT NULL REFERENCES stream_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one resonance per user per entry
    UNIQUE(user_id, entry_id)
);

-- User Amplifications Table - efficient tracking of who amplified what  
CREATE TABLE IF NOT EXISTS user_amplifications (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_id BIGINT NOT NULL REFERENCES stream_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one amplification per user per entry
    UNIQUE(user_id, entry_id)
);

-- Entry Branches Table - proper tree structure for branching
CREATE TABLE IF NOT EXISTS entry_branches (
    id BIGSERIAL PRIMARY KEY,
    parent_entry_id BIGINT NOT NULL REFERENCES stream_entries(id) ON DELETE CASCADE,
    child_entry_id BIGINT NOT NULL REFERENCES stream_entries(id) ON DELETE CASCADE,
    branch_order INTEGER DEFAULT 0, -- Order of branches under same parent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique parent-child relationships
    UNIQUE(parent_entry_id, child_entry_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_entry_interaction_counts_entry_id ON entry_interaction_counts(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_resonances_user_id ON user_resonances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resonances_entry_id ON user_resonances(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_amplifications_user_id ON user_amplifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_amplifications_entry_id ON user_amplifications(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_branches_parent ON entry_branches(parent_entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_branches_child ON entry_branches(child_entry_id);

-- Functions for Atomic Counter Updates
-- Function to increment/decrement resonance count atomically
CREATE OR REPLACE FUNCTION update_resonance_count(
    target_entry_id BIGINT,
    delta INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Insert or update counter
    INSERT INTO entry_interaction_counts (entry_id, resonance_count)
    VALUES (target_entry_id, GREATEST(0, delta))
    ON CONFLICT (entry_id)
    DO UPDATE SET 
        resonance_count = GREATEST(0, entry_interaction_counts.resonance_count + delta),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment/decrement amplification count atomically
CREATE OR REPLACE FUNCTION update_amplification_count(
    target_entry_id BIGINT,
    delta INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Insert or update counter
    INSERT INTO entry_interaction_counts (entry_id, amplification_count)
    VALUES (target_entry_id, GREATEST(0, delta))
    ON CONFLICT (entry_id)
    DO UPDATE SET 
        amplification_count = GREATEST(0, entry_interaction_counts.amplification_count + delta),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment/decrement branch count atomically
CREATE OR REPLACE FUNCTION update_branch_count(
    target_entry_id BIGINT,
    delta INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Insert or update counter
    INSERT INTO entry_interaction_counts (entry_id, branch_count)
    VALUES (target_entry_id, GREATEST(0, delta))
    ON CONFLICT (entry_id)
    DO UPDATE SET 
        branch_count = GREATEST(0, entry_interaction_counts.branch_count + delta),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update counters when interactions change

-- Trigger for resonance changes
CREATE OR REPLACE FUNCTION trigger_resonance_count_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_resonance_count(NEW.entry_id, 1);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_resonance_count(OLD.entry_id, -1);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for amplification changes
CREATE OR REPLACE FUNCTION trigger_amplification_count_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_amplification_count(NEW.entry_id, 1);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_amplification_count(OLD.entry_id, -1);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for branch changes
CREATE OR REPLACE FUNCTION trigger_branch_count_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_branch_count(NEW.parent_entry_id, 1);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_branch_count(OLD.parent_entry_id, -1);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS resonance_count_trigger ON user_resonances;
CREATE TRIGGER resonance_count_trigger
    AFTER INSERT OR DELETE ON user_resonances
    FOR EACH ROW EXECUTE FUNCTION trigger_resonance_count_update();

DROP TRIGGER IF EXISTS amplification_count_trigger ON user_amplifications;
CREATE TRIGGER amplification_count_trigger
    AFTER INSERT OR DELETE ON user_amplifications  
    FOR EACH ROW EXECUTE FUNCTION trigger_amplification_count_update();

DROP TRIGGER IF EXISTS branch_count_trigger ON entry_branches;
CREATE TRIGGER branch_count_trigger
    AFTER INSERT OR DELETE ON entry_branches
    FOR EACH ROW EXECUTE FUNCTION trigger_branch_count_update();

-- Function to toggle user resonance (efficient like/unlike)
CREATE OR REPLACE FUNCTION toggle_user_resonance(
    target_user_id TEXT,
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

-- Function to toggle user amplification
CREATE OR REPLACE FUNCTION toggle_user_amplification(
    target_user_id TEXT,
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

-- Function to create a branch relationship
CREATE OR REPLACE FUNCTION create_branch(
    parent_id BIGINT,
    child_id BIGINT
) RETURNS VOID AS $$
BEGIN
    -- Insert branch relationship
    INSERT INTO entry_branches (parent_entry_id, child_entry_id, branch_order)
    VALUES (
        parent_id, 
        child_id,
        COALESCE((
            SELECT MAX(branch_order) + 1 
            FROM entry_branches 
            WHERE parent_entry_id = parent_id
        ), 0)
    )
    ON CONFLICT (parent_entry_id, child_entry_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to get interaction counts for multiple entries (batch operation)
CREATE OR REPLACE FUNCTION get_interaction_counts(entry_ids BIGINT[])
RETURNS TABLE(
    entry_id BIGINT,
    resonance_count INTEGER,
    branch_count INTEGER,
    amplification_count INTEGER,
    share_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eic.entry_id,
        COALESCE(eic.resonance_count, 0) AS resonance_count,
        COALESCE(eic.branch_count, 0) AS branch_count,
        COALESCE(eic.amplification_count, 0) AS amplification_count,
        COALESCE(eic.share_count, 0) AS share_count
    FROM unnest(entry_ids) AS target_entry_id
    LEFT JOIN entry_interaction_counts eic ON eic.entry_id = target_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user interaction states for multiple entries
CREATE OR REPLACE FUNCTION get_user_interaction_states(
    target_user_id TEXT,
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

-- Function to get branch tree (recursive traversal)
CREATE OR REPLACE FUNCTION get_branch_tree(
    root_entry_id BIGINT,
    max_depth INTEGER DEFAULT 10
) RETURNS TABLE(
    entry_id BIGINT,
    parent_id BIGINT,
    depth INTEGER,
    branch_order INTEGER,
    path BIGINT[]
) AS $$
WITH RECURSIVE branch_tree AS (
    -- Base case: start with root entry
    SELECT 
        root_entry_id as entry_id,
        NULL::BIGINT as parent_id,
        0 as depth,
        0 as branch_order,
        ARRAY[root_entry_id] as path
    
    UNION ALL
    
    -- Recursive case: find children
    SELECT 
        eb.child_entry_id as entry_id,
        eb.parent_entry_id as parent_id,
        bt.depth + 1 as depth,
        eb.branch_order,
        bt.path || eb.child_entry_id as path
    FROM branch_tree bt
    JOIN entry_branches eb ON eb.parent_entry_id = bt.entry_id
    WHERE bt.depth < max_depth
      AND NOT (eb.child_entry_id = ANY(bt.path)) -- Prevent cycles
)
SELECT * FROM branch_tree
ORDER BY depth, branch_order;
$$ LANGUAGE SQL;

-- Add updated_at trigger to interaction counts table
DROP TRIGGER IF EXISTS update_entry_interaction_counts_updated_at ON entry_interaction_counts;
CREATE TRIGGER update_entry_interaction_counts_updated_at 
    BEFORE UPDATE ON entry_interaction_counts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE entry_interaction_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resonances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_amplifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_branches ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read interaction counts
CREATE POLICY "Anyone can view interaction counts" ON entry_interaction_counts
    FOR SELECT USING (true);

-- Allow everyone to read user interactions (for public data)
CREATE POLICY "Anyone can view resonances" ON user_resonances
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view amplifications" ON user_amplifications
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view branches" ON entry_branches
    FOR SELECT USING (true);

-- Users can only modify their own interactions
CREATE POLICY "Users can manage their own resonances" ON user_resonances
    FOR ALL USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can manage their own amplifications" ON user_amplifications
    FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Users can create branches for any entry (but entry ownership is checked at app level)
CREATE POLICY "Users can create branches" ON entry_branches
    FOR INSERT WITH CHECK (true);

-- Initialize counters for existing entries from the interactions JSONB column
INSERT INTO entry_interaction_counts (entry_id, resonance_count, branch_count, amplification_count, share_count)
SELECT 
    id,
    COALESCE((interactions->>'resonances')::INTEGER, 0),
    COALESCE((interactions->>'branches')::INTEGER, 0), 
    COALESCE((interactions->>'amplifications')::INTEGER, 0),
    COALESCE((interactions->>'shares')::INTEGER, 0)
FROM stream_entries
ON CONFLICT (entry_id) DO NOTHING; 