-- Migration: 000_add_exec_sql_function.sql
-- Description: Define exec_sql function for CLI migration runner

-- This function allows running arbitrary SQL via Supabase RPC
CREATE OR REPLACE FUNCTION public.exec_sql(
    payload JSONB
) RETURNS JSONB AS $$
DECLARE
    sql TEXT;
BEGIN
    -- Extract SQL string from JSON payload
    sql := payload->> 'sql_query';
    EXECUTE sql;
    -- Return empty JSONB as placeholder
    RETURN '{}'::jsonb;
END;
$$ LANGUAGE plpgsql; 