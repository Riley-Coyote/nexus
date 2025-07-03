-- Migration: 018_fix_rls_policies_interactions.sql
-- Description: Recreate interaction RLS policies with proper type casting (auth.uid()::text)
-- Date: 2025-07-03

-- Ensure RLS is enabled
ALTER TABLE user_resonances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_amplifications ENABLE ROW LEVEL SECURITY;

-- Drop any previous attempt policies
DROP POLICY IF EXISTS select_own_resonances      ON user_resonances;
DROP POLICY IF EXISTS select_own_amplifications  ON user_amplifications;
DROP POLICY IF EXISTS insert_own_resonances      ON user_resonances;
DROP POLICY IF EXISTS insert_own_amplifications  ON user_amplifications;

-- Recreate with correct casting (auth.uid()::text)
CREATE POLICY select_own_resonances ON user_resonances
  FOR SELECT USING ( user_id = auth.uid()::text OR auth.role() = 'service_role' );

CREATE POLICY select_own_amplifications ON user_amplifications
  FOR SELECT USING ( user_id = auth.uid()::text OR auth.role() = 'service_role' );

CREATE POLICY insert_own_resonances ON user_resonances
  FOR INSERT WITH CHECK ( user_id = auth.uid()::text );

CREATE POLICY insert_own_amplifications ON user_amplifications
  FOR INSERT WITH CHECK ( user_id = auth.uid()::text ); 