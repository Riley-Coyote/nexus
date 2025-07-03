-- Migration: 015_grant_interaction_counts_permissions.sql
-- Description: Grant INSERT/UPDATE privileges on interaction counter tables so triggers work for authenticated users
-- Date: 2025-07-03

GRANT INSERT, UPDATE, SELECT ON entry_interaction_counts  TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, SELECT ON user_resonances           TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, SELECT ON user_amplifications       TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, SELECT ON entry_branches            TO anon, authenticated, service_role; 