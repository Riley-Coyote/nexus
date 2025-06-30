-- Migration 006: Ensure users table is compatible with Supabase auth
-- This migration ensures the users table works properly with Supabase auth system

-- Note: We keep id as TEXT to maintain consistency with user_id fields in other tables
-- Supabase auth.uid() returns UUID but we'll convert to text for consistency

-- Ensure email and username are indexed for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add unique constraints to prevent duplicates (handle conflicts gracefully)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD CONSTRAINT unique_users_email UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
    
    BEGIN
        ALTER TABLE users ADD CONSTRAINT unique_users_username UNIQUE (username);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
END $$;

-- Ensure updated_at timestamp is maintained
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to automatically update updated_at (only if function doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 