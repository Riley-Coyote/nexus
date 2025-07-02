-- Fix unfollow_user function to avoid boolean/integer comparison error

CREATE OR REPLACE FUNCTION unfollow_user(
    follower_user_id UUID,
    followed_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER := 0;
BEGIN
    -- Delete any existing follow relationship
    DELETE FROM user_follows 
    WHERE follower_id = follower_user_id AND followed_id = followed_user_id;

    -- Capture how many rows were removed
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    -- Return TRUE if something was deleted (i.e., user was unfollowing)
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 