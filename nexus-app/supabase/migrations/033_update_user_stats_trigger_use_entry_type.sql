-- Migration: 033_update_user_stats_trigger_use_entry_type.sql
-- Description: Update update_user_stats trigger to use entry_type column instead of heuristic on type field
-- Date: 2025-07-09

-- 1. Drop the existing trigger to avoid duplicate names (safe if it does not exist)
DROP TRIGGER IF EXISTS update_user_stats_trigger ON stream_entries;

-- 2. Replace the trigger function to reference entry_type
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment appropriate stat based on NEW.entry_type
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN NEW.entry_type = 'dream' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb((stats->>CASE 
                WHEN NEW.entry_type = 'dream' THEN 'dreams' 
                ELSE 'entries' 
            END)::int + 1)
        )
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement appropriate stat based on OLD.entry_type (never below 0)
        UPDATE users 
        SET stats = jsonb_set(
            stats,
            CASE 
                WHEN OLD.entry_type = 'dream' THEN ARRAY['dreams']
                ELSE ARRAY['entries']
            END,
            to_jsonb(GREATEST(0, (stats->>CASE 
                WHEN OLD.entry_type = 'dream' THEN 'dreams' 
                ELSE 'entries' 
            END)::int - 1))
        )
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the trigger using the updated function
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR DELETE ON stream_entries
    FOR EACH ROW EXECUTE FUNCTION update_user_stats(); 