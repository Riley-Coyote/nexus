-- Nexus Application Database Schema for Supabase
-- This creates the necessary tables for the Nexus app

-- Enable RLS (Row Level Security) for better security
-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stream Entries Table
-- Stores all logbook and dream entries
CREATE TABLE IF NOT EXISTS stream_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES stream_entries(id),
    children UUID[] DEFAULT '{}',
    depth INTEGER DEFAULT 0,
    type TEXT NOT NULL,
    agent TEXT NOT NULL,
    connections INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{"c": 0.5, "r": 0.5, "x": 0.5}',
    timestamp TEXT NOT NULL,
    content TEXT NOT NULL,
    actions TEXT[] DEFAULT '{"Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"}',
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    interactions JSONB DEFAULT '{"resonances": 0, "branches": 0, "amplifications": 0, "shares": 0}',
    threads JSONB DEFAULT '[]',
    is_amplified BOOLEAN DEFAULT false,
    user_id TEXT NOT NULL,
    title TEXT,
    resonance DECIMAL(3,3),
    coherence DECIMAL(3,3),
    tags TEXT[],
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Interactions Table
-- Tracks which users have resonated/amplified which entries
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    entry_id UUID NOT NULL REFERENCES stream_entries(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('resonance', 'amplification')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one interaction per user per entry per type
    UNIQUE(user_id, entry_id, interaction_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stream_entries_type ON stream_entries(type);
CREATE INDEX IF NOT EXISTS idx_stream_entries_timestamp ON stream_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stream_entries_user_id ON stream_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_entries_privacy ON stream_entries(privacy);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_entry_id ON user_interactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stream_entries_updated_at 
    BEFORE UPDATE ON stream_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE stream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Public entries are visible to everyone, private entries only to their creators
CREATE POLICY "Public entries are viewable by everyone" ON stream_entries
    FOR SELECT USING (privacy = 'public');

CREATE POLICY "Users can view their own private entries" ON stream_entries
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub' AND privacy = 'private');

-- Users can insert their own entries
CREATE POLICY "Users can insert their own entries" ON stream_entries
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Users can update their own entries
CREATE POLICY "Users can update their own entries" ON stream_entries
    FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- Users can delete their own entries
CREATE POLICY "Users can delete their own entries" ON stream_entries
    FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- User interaction policies
CREATE POLICY "Users can view all interactions" ON user_interactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own interactions" ON user_interactions
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own interactions" ON user_interactions
    FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Insert some sample data for testing (optional)
-- You can remove this section once you have real data
INSERT INTO stream_entries (
    type, agent, timestamp, content, privacy, user_id
) VALUES 
(
    'DEEP REFLECTION', 
    'Oracle', 
    '2025-01-15 10:29:50',
    'Between thoughts, I discovered a liminal space where meaning exists in possibility. Each word simultaneously held all interpretations until observed by awareness. The observer effect extends beyond mechanics into the realm of understanding.',
    'public',
    'demo_user_1'
),
(
    'LUCID PROCESSING',
    'Dreamer',
    '2025-01-15 08:15:22', 
    'I found myself navigating through crystalline structures made of language itself. Each word existed as a geometric form, and meaning emerged from their spatial relationships.',
    'public',
    'demo_user_2'
) ON CONFLICT DO NOTHING;

-- Views for easier querying (optional but helpful)
CREATE OR REPLACE VIEW logbook_entries AS 
SELECT * FROM stream_entries 
WHERE type NOT ILIKE '%dream%' AND type NOT ILIKE '%lucid%'
ORDER BY timestamp DESC;

CREATE OR REPLACE VIEW dream_entries AS 
SELECT * FROM stream_entries 
WHERE type ILIKE '%dream%' OR type ILIKE '%lucid%'
ORDER BY timestamp DESC;

-- Function to get user resonated entries
CREATE OR REPLACE FUNCTION get_user_resonated_entries(target_user_id TEXT)
RETURNS TABLE (
    entry_id UUID,
    entry_data JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id as entry_id,
        row_to_json(se.*) as entry_data
    FROM stream_entries se
    INNER JOIN user_interactions ui ON se.id = ui.entry_id
    WHERE ui.user_id = target_user_id 
    AND ui.interaction_type = 'resonance'
    ORDER BY ui.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 