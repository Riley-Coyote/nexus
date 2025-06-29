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