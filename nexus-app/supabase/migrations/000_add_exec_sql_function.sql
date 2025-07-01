-- Migration: 000_add_exec_sql_function.sql
-- Description: Define exec_sql function for CLI migration runner (accepts text SQL)

-- This function allows running arbitrary SQL via Supabase RPC
CREATE OR REPLACE FUNCTION public.exec_sql(
    sql_query TEXT
) RETURNS JSONB AS $$
BEGIN
    EXECUTE sql_query;
    -- Return empty JSONB as placeholder
    RETURN '{}'::jsonb;
END;
$$ LANGUAGE plpgsql; 