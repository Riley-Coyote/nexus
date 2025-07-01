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
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb((stats->>CASE 
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int + 1)
        )
        WHERE id = NEW.user_uuid;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement stats
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb(GREATEST(0, (stats->>CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int - 1))
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