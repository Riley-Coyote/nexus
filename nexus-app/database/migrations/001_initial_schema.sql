-- Migration: 001_initial_schema.sql
-- Description: Initial Nexus database schema
-- Date: 2024-12-29

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create stream_entries table
CREATE TABLE IF NOT EXISTS stream_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('logbook', 'dreams')),
    subtype TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    resonance_field DECIMAL(3,2) DEFAULT 0.0 CHECK (resonance_field >= 0.0 AND resonance_field <= 1.0),
    quantum_layer INTEGER DEFAULT 1 CHECK (quantum_layer >= 1 AND quantum_layer <= 5),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_interactions table
CREATE TABLE IF NOT EXISTS user_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_id BIGINT REFERENCES stream_entries(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('resonance', 'amplify', 'quantum_entangle')),
    intensity DECIMAL(3,2) DEFAULT 0.5 CHECK (intensity >= 0.0 AND intensity <= 1.0),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_entries_user_id ON stream_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_entries_type ON stream_entries(type);
CREATE INDEX IF NOT EXISTS idx_stream_entries_timestamp ON stream_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stream_entries_resonance ON stream_entries(resonance_field DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_entry_id ON user_interactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to stream_entries
CREATE TRIGGER update_stream_entries_updated_at
    BEFORE UPDATE ON stream_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE stream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own entries (for now)
CREATE POLICY "Users can view own entries" ON stream_entries
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own entries" ON stream_entries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own entries" ON stream_entries
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can interact with any entry but only see their own interactions
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert interactions" ON user_interactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON stream_entries TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_interactions TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 