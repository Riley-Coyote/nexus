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