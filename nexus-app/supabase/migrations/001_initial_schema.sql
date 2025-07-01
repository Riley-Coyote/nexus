-- Migration: 001_initial_schema.sql
-- Description: Initial Nexus database schema
-- Date: 2024-12-29

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create stream_entries table with complete structure
CREATE TABLE IF NOT EXISTS stream_entries (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES stream_entries(id),
    children BIGINT[] DEFAULT '{}',
    depth INTEGER DEFAULT 0,
    type TEXT NOT NULL,
    agent TEXT NOT NULL,
    connections INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{"c": 0.5, "r": 0.5, "x": 0.5}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Legacy fields for backward compatibility
    subtype TEXT,
    resonance_field DECIMAL(3,2) DEFAULT 0.0 CHECK (resonance_field >= 0.0 AND resonance_field <= 1.0),
    quantum_layer INTEGER DEFAULT 1 CHECK (quantum_layer >= 1 AND quantum_layer <= 5),
    metadata JSONB DEFAULT '{}'
);

-- Create user_interactions table (will be replaced in migration 003)
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
CREATE INDEX IF NOT EXISTS idx_stream_entries_privacy ON stream_entries(privacy);
CREATE INDEX IF NOT EXISTS idx_stream_entries_parent_id ON stream_entries(parent_id);
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

-- Apply updated_at trigger to stream_entries (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_stream_entries_updated_at ON stream_entries;
CREATE TRIGGER update_stream_entries_updated_at
    BEFORE UPDATE ON stream_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON stream_entries TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_interactions TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; 