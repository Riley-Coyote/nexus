-- Migration: 017_add_rls_policies_interactions.sql
-- Description: Enable RLS and add policies for user_resonances / user_amplifications (fixed casting)
-- Date: 2025-07-03

-- Enable RLS for both tables
ALTER TABLE user_resonances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_amplifications ENABLE ROW LEVEL SECURITY;

-- Cleanup any existing policies so the migration is idempotent
DROP POLICY IF EXISTS select_own_resonances      ON user_resonances;
DROP POLICY IF EXISTS select_own_amplifications  ON user_amplifications;
DROP POLICY IF EXISTS insert_own_resonances      ON user_resonances;
DROP POLICY IF EXISTS insert_own_amplifications  ON user_amplifications;

-- Allow users (and service_role) to read their own rows
CREATE POLICY select_own_resonances ON user_resonances
  FOR SELECT USING ( user_id = auth.uid()::text OR auth.role() = 'service_role' );

CREATE POLICY select_own_amplifications ON user_amplifications
  FOR SELECT USING ( user_id = auth.uid()::text OR auth.role() = 'service_role' );

-- Allow users to insert rows for themselves
CREATE POLICY insert_own_resonances ON user_resonances
  FOR INSERT WITH CHECK ( user_id = auth.uid()::text );

CREATE POLICY insert_own_amplifications ON user_amplifications
  FOR INSERT WITH CHECK ( user_id = auth.uid()::text ); 