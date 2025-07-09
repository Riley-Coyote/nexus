-- Migration: 030_fix_users_table_rls_policies.sql
-- Description: Fix RLS policies for users table to ensure proper UUID casting
-- Date: 2025-01-17

-- The users table has UUID id field, so auth.uid() should work directly without casting to text
-- Let's drop and recreate all users table policies with correct UUID handling

-- Drop existing users table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Recreate users table policies with proper UUID handling
-- 1. Anyone can view public profiles
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

-- 2. Users can insert their own profile (UUID to UUID comparison)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- 3. Users can update their own profile (UUID to UUID comparison)  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Add a debugging function to help troubleshoot auth issues
CREATE OR REPLACE FUNCTION debug_auth_state()
RETURNS TABLE (
  current_user_id UUID,
  is_authenticated BOOLEAN,
  current_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    (auth.uid() IS NOT NULL) as is_authenticated,
    auth.role() as current_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users for debugging
GRANT EXECUTE ON FUNCTION debug_auth_state() TO authenticated;

-- Also ensure the users table has proper permissions
GRANT SELECT ON users TO anon, authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Add an index on the id field if it doesn't exist (it should, but just in case)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Migration 030: Fixed users table RLS policies for proper UUID handling';
END $$; 