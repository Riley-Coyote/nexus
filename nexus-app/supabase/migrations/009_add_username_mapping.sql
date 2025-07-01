-- Migration: 009_add_username_mapping.sql
-- Description: Decouple usernames from user IDs with a mapping table
-- Date: 2025-01-20

-- Create username_mapping table for clean username -> UUID lookups
CREATE TABLE IF NOT EXISTS username_mapping (
    username TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_username_mapping_user_id ON username_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_username_mapping_created_at ON username_mapping(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_username_mapping_updated_at ON username_mapping;
CREATE TRIGGER update_username_mapping_updated_at 
    BEFORE UPDATE ON username_mapping 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing usernames to the mapping table
INSERT INTO username_mapping (username, user_id)
SELECT username, id FROM users
ON CONFLICT (username) DO NOTHING;

-- Remove the UNIQUE constraint from users.username (we'll keep the column for backward compatibility)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_users_username;

-- Function to get user by username (now uses mapping table)
CREATE OR REPLACE FUNCTION get_user_by_username_v2(lookup_username TEXT)
RETURNS TABLE (user_data JSON) AS $$
BEGIN
    RETURN QUERY
    SELECT row_to_json(u.*) as user_data
    FROM username_mapping um
    INNER JOIN users u ON um.user_id = u.id
    WHERE um.username = lookup_username
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update username (replaces the mapping)
CREATE OR REPLACE FUNCTION update_username(
    target_user_id UUID,
    new_username TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    old_username TEXT;
    username_exists BOOLEAN := FALSE;
BEGIN
    -- Check if new username already exists
    SELECT EXISTS(
        SELECT 1 FROM username_mapping WHERE username = new_username
    ) INTO username_exists;
    
    IF username_exists THEN
        RAISE EXCEPTION 'Username % already exists', new_username;
    END IF;
    
    -- Get the current username
    SELECT username INTO old_username 
    FROM username_mapping 
    WHERE user_id = target_user_id;
    
    IF old_username IS NULL THEN
        RAISE EXCEPTION 'User % not found', target_user_id;
    END IF;
    
    -- Update the mapping (this replaces the old username)
    UPDATE username_mapping 
    SET username = new_username, updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Also update the users table for backward compatibility
    UPDATE users 
    SET username = new_username, updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current username for a user ID
CREATE OR REPLACE FUNCTION get_username_by_user_id(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_username TEXT;
BEGIN
    SELECT username INTO current_username
    FROM username_mapping
    WHERE user_id = target_user_id;
    
    RETURN current_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON username_mapping TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 