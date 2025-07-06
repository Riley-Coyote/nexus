-- Migration: 023_fix_username_mapping_trigger.sql
-- Description: Add missing trigger to auto-populate username_mapping table and backfill existing users
-- Date: 2025-01-20

-- This migration is safe to run multiple times (idempotent)

-- First, ensure the username_mapping table exists (in case migration 009 wasn't run)
CREATE TABLE IF NOT EXISTS username_mapping (
    username TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_username_mapping_user_id ON username_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_username_mapping_created_at ON username_mapping(created_at DESC);

-- Backfill any users missing from username_mapping table
-- This handles existing users who were created before the trigger was in place
INSERT INTO username_mapping (username, user_id)
SELECT username, id FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM username_mapping 
    WHERE username_mapping.user_id = users.id
)
ON CONFLICT (username) DO NOTHING;

-- Create function to auto-populate username_mapping when users are created
CREATE OR REPLACE FUNCTION auto_create_username_mapping()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically create username mapping when a user is created
    -- Use ON CONFLICT to handle any edge cases safely
    INSERT INTO username_mapping (username, user_id)
    VALUES (NEW.username, NEW.id)
    ON CONFLICT (username) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate username_mapping (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS auto_create_username_mapping_trigger ON users;
CREATE TRIGGER auto_create_username_mapping_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION auto_create_username_mapping();

-- Also create a trigger for username updates to keep mapping in sync
CREATE OR REPLACE FUNCTION sync_username_mapping_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the mapping when username changes in users table
    UPDATE username_mapping 
    SET username = NEW.username, updated_at = NOW()
    WHERE user_id = NEW.id;
    
    -- If no mapping exists, create one (safety fallback)
    IF NOT FOUND THEN
        INSERT INTO username_mapping (username, user_id)
        VALUES (NEW.username, NEW.id)
        ON CONFLICT (username) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS sync_username_mapping_on_update_trigger ON users;
CREATE TRIGGER sync_username_mapping_on_update_trigger
    AFTER UPDATE OF username ON users
    FOR EACH ROW EXECUTE FUNCTION sync_username_mapping_on_update();

-- Grant permissions (safe to repeat)
GRANT ALL ON username_mapping TO postgres, anon, authenticated, service_role;

-- Verify the fix by checking if any users are missing mappings
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM username_mapping um 
        WHERE um.user_id = u.id
    );
    
    IF missing_count > 0 THEN
        RAISE NOTICE 'Warning: % users still missing from username_mapping after backfill', missing_count;
    ELSE
        RAISE NOTICE 'Success: All users have username_mapping entries';
    END IF;
END $$; 