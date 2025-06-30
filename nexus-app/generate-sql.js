#!/usr/bin/env node

/**
 * SQL Generator for Supabase Setup
 * This generates a combined SQL file for easy copy-pasting into Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

const migrations = [
    'database/migrations/001_initial_schema.sql',
    'database/migrations/002_add_collaboration_features.sql',
    'database/migrations/003_efficient_interactions.sql',
    'database/migrations/004_add_users_table.sql',
    'database/migrations/005_add_follow_system.sql',
    'database/migrations/006_add_auth_profiles.sql'
];

const rlsPolicies = `
-- Row Level Security Setup
-- Run this after the migrations

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Policy: Users can insert their own profile (use string conversion for compatibility)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Policy: Users can update their own profile (use string conversion for compatibility)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Note: stream_entries RLS policies are already set up in migration 001
-- These policies allow users to view public entries and their own private entries

-- Additional policies for interaction tables (set up in migration 003)
-- These allow users to manage their own interactions while viewing all public data
`;

console.log('🔧 Generating SQL files for Supabase setup...\n');

// Generate combined migrations file
let combinedSql = `-- NEXUS Database Schema Setup
-- Generated on ${new Date().toISOString()}
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

`;

for (const migration of migrations) {
    if (fs.existsSync(migration)) {
        const content = fs.readFileSync(migration, 'utf8');
        combinedSql += `-- ${migration}\n`;
        combinedSql += `-- ${'='.repeat(50)}\n\n`;
        combinedSql += content;
        combinedSql += '\n\n';
    } else {
        console.log(`⚠️  Migration not found: ${migration}`);
    }
}

combinedSql += `
COMMIT;
`;

// Write combined migrations
fs.writeFileSync('supabase-schema.sql', combinedSql);
console.log('✅ Generated: supabase-schema.sql');

// Write RLS policies
fs.writeFileSync('supabase-rls.sql', rlsPolicies);
console.log('✅ Generated: supabase-rls.sql');

console.log('\n📋 Setup Instructions:');
console.log('1. Open your Supabase dashboard: https://app.supabase.com');
console.log('2. Go to SQL Editor');
console.log('3. Copy and paste the content of supabase-schema.sql');
console.log('4. Click "Run" to execute the schema');
console.log('5. Copy and paste the content of supabase-rls.sql');
console.log('6. Click "Run" to set up security policies');
console.log('\n🚀 Then run: npm run dev'); 