
-- Row Level Security Setup
-- Run this after the migrations

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Policy: Users can insert their own profile (use string conversion for compatibility)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Policy: Users can update their own profile (use string conversion for compatibility)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Note: stream_entries RLS policies are already set up in migration 001
-- These policies allow users to view public entries and their own private entries

-- Additional policies for interaction tables (set up in migration 003)
-- These allow users to manage their own interactions while viewing all public data
