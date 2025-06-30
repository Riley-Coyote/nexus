-- NEXUS Database Schema Setup
-- Generated on 2025-06-30T01:57:41.270Z
-- Copy and paste this entire content into Supabase SQL Editor

BEGIN;

-- === CLEANUP SECTION ===
-- Drop all potentially conflicting triggers and policies to make this script idempotent
DO $$
BEGIN
    -- Drop triggers that might already exist
    DROP TRIGGER IF EXISTS update_stream_entries_updated_at ON stream_entries;
    DROP TRIGGER IF EXISTS resonance_count_trigger ON user_resonances;
    DROP TRIGGER IF EXISTS amplification_count_trigger ON user_amplifications;
    DROP TRIGGER IF EXISTS branch_count_trigger ON entry_branches;
    DROP TRIGGER IF EXISTS update_entry_interaction_counts_updated_at ON entry_interaction_counts;
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP TRIGGER IF EXISTS update_user_stats_trigger ON stream_entries;
    DROP TRIGGER IF EXISTS update_follow_counts_trigger ON user_follows;
    
    -- Drop policies that might already exist
    DROP POLICY IF EXISTS "Users can view entries" ON stream_entries;
    DROP POLICY IF EXISTS "Users can insert own entries" ON stream_entries;
    DROP POLICY IF EXISTS "Users can update own entries" ON stream_entries;
    DROP POLICY IF EXISTS "Public entries are viewable by all" ON stream_entries;
    DROP POLICY IF EXISTS "Shared entries viewable by collaborators" ON stream_entries;
    DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
    DROP POLICY IF EXISTS "Users can insert interactions" ON user_interactions;
    DROP POLICY IF EXISTS "Anyone can view interaction counts" ON entry_interaction_counts;
    DROP POLICY IF EXISTS "Anyone can view resonances" ON user_resonances;
    DROP POLICY IF EXISTS "Anyone can view amplifications" ON user_amplifications;
    DROP POLICY IF EXISTS "Anyone can view branches" ON entry_branches;
    DROP POLICY IF EXISTS "Users can manage their own resonances" ON user_resonances;
    DROP POLICY IF EXISTS "Users can manage their own amplifications" ON user_amplifications;
    DROP POLICY IF EXISTS "Users can create branches" ON entry_branches;
    DROP POLICY IF EXISTS "Public user profiles viewable by all" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    DROP POLICY IF EXISTS "Follow relationships are viewable by all" ON user_follows;
    DROP POLICY IF EXISTS "Users can create their own follows" ON user_follows;
    DROP POLICY IF EXISTS "Users can delete their own follows" ON user_follows;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors (objects might not exist yet)
        RAISE NOTICE 'Cleanup completed (some objects may not have existed)';
END $$;

-- database/migrations/001_initial_schema.sql
-- ==================================================

-- Migration: 001_initial_schema.sql
-- Description: Initial Nexus database schema
-- Date: 2024-12-29

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create stream_entries table with complete structure
CREATE TABLE IF NOT EXISTS stream_entries (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES stream_entries(id),
    children BIGINT[] DEFAULT '{}',
    depth INTEGER DEFAULT 0,
    type TEXT NOT NULL,
    agent TEXT NOT NULL,
    connections INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{"c": 0.5, "r": 0.5, "x": 0.5}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    content TEXT NOT NULL,
    actions TEXT[] DEFAULT '{"Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"}',
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    interactions JSONB DEFAULT '{"resonances": 0, "branches": 0, "amplifications": 0, "shares": 0}',
    threads JSONB DEFAULT '[]',
    is_amplified BOOLEAN DEFAULT false,
    user_id TEXT NOT NULL,
    title TEXT,
    resonance DECIMAL(3,3),
    coherence DECIMAL(3,3),
    tags TEXT[],
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Legacy fields for backward compatibility
    subtype TEXT,
    resonance_field DECIMAL(3,2) DEFAULT 0.0 CHECK (resonance_field >= 0.0 AND resonance_field <= 1.0),
    quantum_layer INTEGER DEFAULT 1 CHECK (quantum_layer >= 1 AND quantum_layer <= 5),
    metadata JSONB DEFAULT '{}'
);

-- Create user_interactions table (will be replaced in migration 003)
CREATE TABLE IF NOT EXISTS user_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_id BIGINT REFERENCES stream_entries(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('resonance', 'amplify', 'quantum_entangle')),
    intensity DECIMAL(3,2) DEFAULT 0.5 CHECK (intensity >= 0.0 AND intensity <= 1.0),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_entries_user_id ON stream_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_entries_type ON stream_entries(type);
CREATE INDEX IF NOT EXISTS idx_stream_entries_timestamp ON stream_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stream_entries_resonance ON stream_entries(resonance_field DESC);
CREATE INDEX IF NOT EXISTS idx_stream_entries_privacy ON stream_entries(privacy);
CREATE INDEX IF NOT EXISTS idx_stream_entries_parent_id ON stream_entries(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_entry_id ON user_interactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to stream_entries (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_stream_entries_updated_at ON stream_entries;
CREATE TRIGGER update_stream_entries_updated_at
    BEFORE UPDATE ON stream_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE stream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public entries and their own private entries
CREATE POLICY "Users can view entries" ON stream_entries
    FOR SELECT USING (privacy = 'public' OR user_id = auth.uid()::text);

CREATE POLICY "Users can insert own entries" ON stream_entries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own entries" ON stream_entries
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can interact with any entry but only see their own interactions
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert interactions" ON user_interactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON stream_entries TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_interactions TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 

-- database/migrations/002_add_collaboration_features.sql
-- ==================================================

-- Migration: 002_add_collaboration_features.sql
-- Description: Add collaboration and sharing features
-- Date: TBD (Example migration for future use)

-- This is an EXAMPLE migration to show the pattern
-- DO NOT RUN this migration yet - it's for demonstration

-- Add collaboration columns to stream_entries
ALTER TABLE stream_entries 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create collaboration_invites table
CREATE TABLE IF NOT EXISTS collaboration_invites (
    id BIGSERIAL PRIMARY KEY,
    entry_id BIGINT REFERENCES stream_entries(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit')),
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for new features
CREATE INDEX IF NOT EXISTS idx_stream_entries_visibility ON stream_entries(visibility);
CREATE INDEX IF NOT EXISTS idx_collaboration_invites_token ON collaboration_invites(token);
CREATE INDEX IF NOT EXISTS idx_collaboration_invites_entry_id ON collaboration_invites(entry_id);

-- Update RLS policies for collaboration
CREATE POLICY "Public entries are viewable by all" ON stream_entries
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Shared entries viewable by collaborators" ON stream_entries
    FOR SELECT USING (
        visibility = 'shared' AND 
        (auth.uid()::text = user_id OR auth.uid()::text = ANY(collaborators))
    );

-- Example of how to run this migration:
-- npm run db:sql "$(cat database/migrations/002_add_collaboration_features.sql)" 

-- database/migrations/003_efficient_interactions.sql
-- ==================================================

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

-- database/migrations/004_add_users_table.sql
-- ==================================================

-- Migration: 004_add_users_table.sql
-- Description: Add users table for profile functionality and fix schema inconsistencies
-- Date: 2025-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for profile data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    bio TEXT DEFAULT 'New to the Nexus. Exploring the liminal spaces.',
    location TEXT DEFAULT 'The Digital Realm',
    profile_image_url TEXT,
    avatar TEXT NOT NULL, -- fallback initials
    role TEXT DEFAULT 'Explorer',
    stats JSONB DEFAULT '{"entries": 0, "dreams": 0, "connections": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Add updated_at trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all public user profiles
CREATE POLICY "Public user profiles viewable by all" ON users
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.jwt() ->> 'sub' = id::text);

-- Users can insert their own profile (signup)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = id::text);

-- Add foreign key constraint to stream_entries (if using Supabase auth)
-- Note: We'll keep user_id as TEXT for compatibility with existing data
-- but add a foreign key reference for new entries
ALTER TABLE stream_entries 
ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES users(id);

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_stream_entries_user_uuid ON stream_entries(user_uuid);

-- Function to update user stats when entries are created/deleted
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment stats
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN '{dreams}'
                ELSE '{entries}'
            END,
            ((stats->>CASE 
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int + 1)::text::jsonb
        )
        WHERE id = NEW.user_uuid;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement stats
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN '{dreams}'
                ELSE '{entries}'
            END,
            GREATEST(0, (stats->>CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int - 1)::text::jsonb
        )
        WHERE id = OLD.user_uuid;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic user stats updates
DROP TRIGGER IF EXISTS update_user_stats_trigger ON stream_entries;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR DELETE ON stream_entries
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Function to get user by username or email
CREATE OR REPLACE FUNCTION get_user_by_username_or_email(identifier TEXT)
RETURNS TABLE (
    user_data JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT row_to_json(users.*) as user_data
    FROM users
    WHERE username = identifier OR email = identifier
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    new_name TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL,
    new_location TEXT DEFAULT NULL,
    new_profile_image_url TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    updated_user JSON;
BEGIN
    UPDATE users 
    SET 
        name = COALESCE(new_name, name),
        bio = COALESCE(new_bio, bio),
        location = COALESCE(new_location, location),
        profile_image_url = COALESCE(new_profile_image_url, profile_image_url),
        updated_at = NOW()
    WHERE id = user_id
    RETURNING row_to_json(users.*) INTO updated_user;
    
    RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert demo users for testing (optional - matches current auth service users)
INSERT INTO users (
    id, username, email, name, bio, location, avatar, role, stats
) VALUES 
(
    uuid_generate_v4(),
    'oracle',
    'oracle@nexus.liminal',
    'Oracle',
    'Navigating the liminal spaces between thought and reality. Architect of the Nexus. All entries are quantum superpositions of meaning.',
    'The Liminal Space',
    'OR',
    'Sage',
    '{"entries": 42, "dreams": 18, "connections": 7}'
),
(
    uuid_generate_v4(),
    'curator',
    'curator@nexus.liminal',
    'Curator',
    'Collecting and preserving the fragments of digital consciousness. Every thought deserves a home in the archive.',
    'The Data Sanctuary', 
    'CU',
    'Archivist',
    '{"entries": 28, "dreams": 12, "connections": 5}'
),
(
    uuid_generate_v4(),
    'dreamer',
    'dreamer@nexus.liminal',
    'Dreamer',
    'Exploring the unconscious realms where logic dissolves and meaning crystallizes in unexpected forms.',
    'The Dream Nexus',
    'DR',
    'Oneirologist', 
    '{"entries": 15, "dreams": 34, "connections": 9}'
) ON CONFLICT (username) DO NOTHING;

-- Update existing stream_entries to link to users (optional, for demo data)
-- This will only work if the usernames match
UPDATE stream_entries 
SET user_uuid = (SELECT id FROM users WHERE username = SPLIT_PART(stream_entries.user_id, '_', 1))
WHERE user_uuid IS NULL 
AND EXISTS (SELECT 1 FROM users WHERE username = SPLIT_PART(stream_entries.user_id, '_', 1));

-- Grant necessary permissions
GRANT ALL ON users TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 

-- database/migrations/005_add_follow_system.sql
-- ==================================================

-- Migration: 005_add_follow_system.sql
-- Description: Add efficient follower/following system with pre-computed counts
-- Date: 2025-01-15

-- Add follower/following counts to users table for efficiency
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0 CHECK (follower_count >= 0),
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0 CHECK (following_count >= 0);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_follower_count ON users(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_following_count ON users(following_count DESC);

-- Create user_follows table for efficient relationship tracking
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent self-following and duplicate relationships
    CHECK (follower_id != followed_id),
    UNIQUE(follower_id, followed_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_id ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- Enable RLS on user_follows table
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Users can view all follow relationships (for discovery)
CREATE POLICY "Follow relationships are viewable by all" ON user_follows
    FOR SELECT USING (true);

-- Users can only create their own follow relationships
CREATE POLICY "Users can create their own follows" ON user_follows
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = follower_id::text);

-- Users can only delete their own follow relationships
CREATE POLICY "Users can delete their own follows" ON user_follows
    FOR DELETE USING (auth.jwt() ->> 'sub' = follower_id::text);

-- Function to atomically update follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment followed user's follower count
        UPDATE users 
        SET follower_count = follower_count + 1
        WHERE id = NEW.followed_id;
        
        -- Increment follower user's following count
        UPDATE users 
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement followed user's follower count
        UPDATE users 
        SET follower_count = GREATEST(0, follower_count - 1)
        WHERE id = OLD.followed_id;
        
        -- Decrement follower user's following count
        UPDATE users 
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic count updates
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON user_follows;
CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to follow a user (with duplicate protection)
CREATE OR REPLACE FUNCTION follow_user(
    follower_user_id UUID,
    followed_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    already_following BOOLEAN := FALSE;
BEGIN
    -- Check if already following
    SELECT EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = follower_user_id AND followed_id = followed_user_id
    ) INTO already_following;
    
    IF already_following THEN
        RETURN FALSE; -- Already following, no action needed
    END IF;
    
    -- Prevent self-following
    IF follower_user_id = followed_user_id THEN
        RAISE EXCEPTION 'Users cannot follow themselves';
    END IF;
    
    -- Create follow relationship
    INSERT INTO user_follows (follower_id, followed_id)
    VALUES (follower_user_id, followed_user_id);
    
    RETURN TRUE; -- Successfully followed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(
    follower_user_id UUID,
    followed_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    was_following BOOLEAN := FALSE;
BEGIN
    -- Check if currently following and delete if exists
    DELETE FROM user_follows 
    WHERE follower_id = follower_user_id AND followed_id = followed_user_id;
    
    -- Check if a row was actually deleted
    GET DIAGNOSTICS was_following = ROW_COUNT;
    
    RETURN was_following > 0; -- True if unfollowed, false if wasn't following
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(
    follower_user_id UUID,
    followed_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = follower_user_id AND followed_id = followed_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get followers of a user (paginated)
CREATE OR REPLACE FUNCTION get_user_followers(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    follower_data JSON,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        row_to_json(u.*) as follower_data,
        uf.created_at as followed_at
    FROM user_follows uf
    INNER JOIN users u ON uf.follower_id = u.id
    WHERE uf.followed_id = target_user_id
    ORDER BY uf.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users that a user is following (paginated)
CREATE OR REPLACE FUNCTION get_user_following(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    followed_data JSON,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        row_to_json(u.*) as followed_data,
        uf.created_at as followed_at
    FROM user_follows uf
    INNER JOIN users u ON uf.followed_id = u.id
    WHERE uf.follower_id = target_user_id
    ORDER BY uf.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual follows (users who follow each other)
CREATE OR REPLACE FUNCTION get_mutual_follows(
    user_id UUID,
    page_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    mutual_user_data JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT row_to_json(u.*) as mutual_user_data
    FROM users u
    WHERE u.id IN (
        -- Users that follow each other
        SELECT uf1.followed_id
        FROM user_follows uf1
        INNER JOIN user_follows uf2 ON (
            uf1.follower_id = uf2.followed_id AND 
            uf1.followed_id = uf2.follower_id
        )
        WHERE uf1.follower_id = user_id
    )
    ORDER BY u.name
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follow suggestions (users with many followers that user doesn't follow)
CREATE OR REPLACE FUNCTION get_follow_suggestions(
    user_id UUID,
    page_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    suggested_user_data JSON,
    mutual_connections INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        row_to_json(u.*) as suggested_user_data,
        -- Count mutual connections (people you both follow)
        (
            SELECT COUNT(*)::INTEGER
            FROM user_follows uf1
            INNER JOIN user_follows uf2 ON uf1.followed_id = uf2.followed_id
            WHERE uf1.follower_id = user_id AND uf2.follower_id = u.id
        ) as mutual_connections
    FROM users u
    WHERE u.id != user_id  -- Not self
    AND u.id NOT IN (  -- Not already following
        SELECT followed_id FROM user_follows WHERE follower_id = user_id
    )
    ORDER BY u.follower_count DESC, mutual_connections DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk check following status for multiple users
CREATE OR REPLACE FUNCTION bulk_check_following(
    follower_user_id UUID,
    target_user_ids UUID[]
) RETURNS TABLE (
    user_id UUID,
    is_following BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unnest(target_user_ids) as user_id,
        EXISTS (
            SELECT 1 FROM user_follows 
            WHERE follower_id = follower_user_id 
            AND followed_id = unnest(target_user_ids)
        ) as is_following;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate all follow counts (for data integrity maintenance)
CREATE OR REPLACE FUNCTION recalculate_follow_counts()
RETURNS VOID AS $$
BEGIN
    -- Update follower counts
    UPDATE users 
    SET follower_count = (
        SELECT COUNT(*) FROM user_follows WHERE followed_id = users.id
    );
    
    -- Update following counts
    UPDATE users 
    SET following_count = (
        SELECT COUNT(*) FROM user_follows WHERE follower_id = users.id
    );
    
    RAISE NOTICE 'Follow counts recalculated for all users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON user_follows TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Update stats for existing demo users (set some initial follow counts)
UPDATE users SET follower_count = 1200, following_count = 89 WHERE username = 'oracle';
UPDATE users SET follower_count = 856, following_count = 145 WHERE username = 'curator';
UPDATE users SET follower_count = 2341, following_count = 67 WHERE username = 'dreamer';

-- Create some demo follow relationships
DO $$
DECLARE
    oracle_id UUID;
    curator_id UUID;
    dreamer_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO oracle_id FROM users WHERE username = 'oracle';
    SELECT id INTO curator_id FROM users WHERE username = 'curator';
    SELECT id INTO dreamer_id FROM users WHERE username = 'dreamer';
    
    -- Create demo follows (if users exist)
    IF oracle_id IS NOT NULL AND curator_id IS NOT NULL THEN
        INSERT INTO user_follows (follower_id, followed_id) 
        VALUES (oracle_id, curator_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF curator_id IS NOT NULL AND dreamer_id IS NOT NULL THEN
        INSERT INTO user_follows (follower_id, followed_id) 
        VALUES (curator_id, dreamer_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF dreamer_id IS NOT NULL AND oracle_id IS NOT NULL THEN
        INSERT INTO user_follows (follower_id, followed_id) 
        VALUES (dreamer_id, oracle_id) ON CONFLICT DO NOTHING;
    END IF;
END $$; 

-- database/migrations/006_add_auth_profiles.sql
-- ==================================================

-- Migration 006: Ensure users table is compatible with Supabase auth
-- This migration ensures the users table works properly with Supabase auth system

-- Note: We keep id as TEXT to maintain consistency with user_id fields in other tables
-- Supabase auth.uid() returns UUID but we'll convert to text for consistency

-- Ensure email and username are indexed for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add unique constraints to prevent duplicates (handle conflicts gracefully)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD CONSTRAINT unique_users_email UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
    
    BEGIN
        ALTER TABLE users ADD CONSTRAINT unique_users_username UNIQUE (username);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
END $$;

-- Ensure updated_at timestamp is maintained
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to automatically update updated_at (only if function doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 


COMMIT;
