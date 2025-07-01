-- Migration: 010_fix_update_user_stats_trigger.sql
-- Description: Fix update_user_stats trigger to use user_id instead of user_uuid
-- Date: 2025-07-01

-- Drop the old trigger that references user_uuid
DROP TRIGGER IF EXISTS update_user_stats_trigger ON stream_entries;

-- Replace the trigger function to reference user_id
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment stats for the new entry's user_id
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb((stats->>CASE 
                WHEN NEW.type ILIKE '%dream%' OR NEW.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int + 1)
        )
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement stats for the deleted entry's user_id
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb(GREATEST(0, (stats->>CASE 
                WHEN OLD.type ILIKE '%dream%' OR OLD.type ILIKE '%lucid%' THEN 'dreams'
                ELSE 'entries'
            END)::int - 1))
        )
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger using the updated function
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR DELETE ON stream_entries
    FOR EACH ROW EXECUTE FUNCTION update_user_stats(); 