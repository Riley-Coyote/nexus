-- NEXUS Database Schema Setup
-- Generated on 2025-06-30T03:02:14.134Z
-- Copy and paste this entire content into Supabase SQL Editor

BEGIN;

-- === CLEANUP SECTION (Drop triggers and existing policies) ===
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
    
    -- Drop policies for stream_entries
    DROP POLICY IF EXISTS "Users can view entries" ON stream_entries;
    DROP POLICY IF EXISTS "Users can insert own entries" ON stream_entries;
    DROP POLICY IF EXISTS "Users can update own entries" ON stream_entries;
    DROP POLICY IF EXISTS "Public entries are viewable by all" ON stream_entries;
    DROP POLICY IF EXISTS "Shared entries viewable by collaborators" ON stream_entries;

    -- Drop policies for user_interactions
    DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
    DROP POLICY IF EXISTS "Users can insert interactions" ON user_interactions;

    -- Drop policies for users
    -- Legacy naming from migration 004
    DROP POLICY IF EXISTS "Public user profiles viewable by all" ON users;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;

    -- Drop policies for entry_interaction_counts
    DROP POLICY IF EXISTS "Anyone can view interaction counts" ON entry_interaction_counts;

    -- Drop policies for user_resonances
    DROP POLICY IF EXISTS "Anyone can view resonances" ON user_resonances;
    DROP POLICY IF EXISTS "Users can manage their own resonances" ON user_resonances;

    -- Drop policies for user_amplifications
    DROP POLICY IF EXISTS "Anyone can view amplifications" ON user_amplifications;
    DROP POLICY IF EXISTS "Users can manage their own amplifications" ON user_amplifications;

    -- Drop policies for entry_branches
    DROP POLICY IF EXISTS "Anyone can view branches" ON entry_branches;
    DROP POLICY IF EXISTS "Users can create branches" ON entry_branches;

    -- Drop policies for follow system (if exists)
    DROP POLICY IF EXISTS "Follow relationships are viewable by all" ON user_follows;
    DROP POLICY IF EXISTS "Users can create their own follows" ON user_follows;
    DROP POLICY IF EXISTS "Users can delete their own follows" ON user_follows;

EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors (objects might not exist yet)
        RAISE NOTICE 'Cleanup completed (some objects may not have existed)';
END $$;


COMMIT;
