-- Migration: 022_add_banner_image_support.sql
-- Description: Add banner image support to user profiles with efficient image handling
-- Date: 2025-01-15

-- Add banner_image_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Create indexes for image fields for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image_url) WHERE profile_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_banner_image ON users(banner_image_url) WHERE banner_image_url IS NOT NULL;

-- Update the profile update function to handle banner images
DROP FUNCTION IF EXISTS update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    new_name TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL,
    new_location TEXT DEFAULT NULL,
    new_profile_image_url TEXT DEFAULT NULL,
    new_banner_image_url TEXT DEFAULT NULL
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
        banner_image_url = COALESCE(new_banner_image_url, banner_image_url),
        updated_at = NOW()
    WHERE id = user_id
    RETURNING row_to_json(users.*) INTO updated_user;
    
    RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with image URLs (optimized for posts)
CREATE OR REPLACE FUNCTION get_user_profile_images(
    target_user_id UUID
) RETURNS TABLE (
    profile_image_url TEXT,
    banner_image_url TEXT,
    avatar TEXT,
    name TEXT,
    username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.profile_image_url,
        u.banner_image_url,
        u.avatar,
        u.name,
        u.username
    FROM users u
    WHERE u.id = target_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk get user profile images for multiple users (efficient for feed)
CREATE OR REPLACE FUNCTION bulk_get_user_profile_images(
    target_user_ids UUID[]
) RETURNS TABLE (
    user_id UUID,
    profile_image_url TEXT,
    avatar TEXT,
    name TEXT,
    username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.profile_image_url,
        u.avatar,
        u.name,
        u.username
    FROM users u
    WHERE u.id = ANY(target_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update just profile image (for quick updates)
CREATE OR REPLACE FUNCTION update_user_profile_image(
    user_id UUID,
    new_profile_image_url TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        profile_image_url = new_profile_image_url,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update just banner image (for quick updates)
CREATE OR REPLACE FUNCTION update_user_banner_image(
    user_id UUID,
    new_banner_image_url TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        banner_image_url = new_banner_image_url,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_images TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bulk_get_user_profile_images TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_profile_image TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_banner_image TO authenticated;

-- Demo banner images removed - use actual users 