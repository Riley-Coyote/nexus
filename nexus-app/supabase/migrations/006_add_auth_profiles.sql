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

-- === Row Level Security Setup ===

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_interaction_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resonances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_amplifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- stream_entries policies
DROP POLICY IF EXISTS "Users can view entries" ON stream_entries;
CREATE POLICY "Users can view entries" ON stream_entries
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid()::text);
DROP POLICY IF EXISTS "Users can insert own entries" ON stream_entries;
CREATE POLICY "Users can insert own entries" ON stream_entries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update own entries" ON stream_entries;
CREATE POLICY "Users can update own entries" ON stream_entries
  FOR UPDATE USING (auth.uid()::text = user_id);

-- entry_interaction_counts policies
DROP POLICY IF EXISTS "Anyone can view interaction counts" ON entry_interaction_counts;
CREATE POLICY "Anyone can view interaction counts" ON entry_interaction_counts
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create and update interaction counts" ON entry_interaction_counts;
CREATE POLICY "Users can create and update interaction counts" ON entry_interaction_counts
  FOR ALL USING (auth.role() = 'authenticated');

-- user_resonances policies
DROP POLICY IF EXISTS "Anyone can view resonances" ON user_resonances;
CREATE POLICY "Anyone can view resonances" ON user_resonances
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage their own resonances" ON user_resonances;
CREATE POLICY "Users can manage their own resonances" ON user_resonances
  FOR ALL USING (user_id = auth.uid()::text);

-- user_amplifications policies
DROP POLICY IF EXISTS "Anyone can view amplifications" ON user_amplifications;
CREATE POLICY "Anyone can view amplifications" ON user_amplifications
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage their own amplifications" ON user_amplifications;
CREATE POLICY "Users can manage their own amplifications" ON user_amplifications
  FOR ALL USING (user_id = auth.uid()::text);

-- entry_branches policies
DROP POLICY IF EXISTS "Anyone can view branches" ON entry_branches;
CREATE POLICY "Anyone can view branches" ON entry_branches
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create branches" ON entry_branches;
CREATE POLICY "Users can create branches" ON entry_branches
  FOR INSERT WITH CHECK (true);

-- user_follows policies
DROP POLICY IF EXISTS "Follow relationships are viewable by all" ON user_follows;
CREATE POLICY "Follow relationships are viewable by all" ON user_follows
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create their own follows" ON user_follows;
CREATE POLICY "Users can create their own follows" ON user_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own follows" ON user_follows;
CREATE POLICY "Users can delete their own follows" ON user_follows
  FOR DELETE USING (follower_id = auth.uid()); 