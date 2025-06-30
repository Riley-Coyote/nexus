#!/bin/bash

# NEXUS Supabase Setup Script
# This script helps you set up the NEXUS database schema in Supabase

echo "🚀 Starting NEXUS Supabase Setup..."
echo "===================================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials first."
    echo ""
    echo "Required format:"
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "NEXT_PUBLIC_SITE_URL=http://localhost:3002"
    exit 1
fi

# Load environment variables
source .env.local

# Verify required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Missing required environment variables in .env.local"
    echo ""
    echo "📋 Required environment variables:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_key (optional, for admin operations)"
    echo ""
    echo "📝 You can find these in your Supabase dashboard:"
    echo "   Go to Settings → API and copy the values"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "   URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "   Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."

echo ""
echo "📋 To complete the setup, you need to:"
echo ""
echo "1. Open your Supabase dashboard: https://app.supabase.com"
echo "2. Go to the SQL Editor"
echo "3. Copy and paste the SQL from these files IN ORDER:"
echo ""

# List migration files
migrations=(
    "database/migrations/000_add_exec_sql_function.sql"
    "database/migrations/001_initial_schema.sql"
    "database/migrations/002_add_collaboration_features.sql" 
    "database/migrations/003_efficient_interactions.sql"
    "database/migrations/004_add_users_table.sql"
    "database/migrations/005_add_follow_system.sql"
    "database/migrations/006_add_auth_profiles.sql"
)

for i in "${!migrations[@]}"; do
    migration="${migrations[$i]}"
    if [ -f "$migration" ]; then
        echo "   $((i+1)). $(basename $migration)"
    else
        echo "   $((i+1)). $(basename $migration) ⚠️ (file not found)"
    fi
done

echo ""
echo "4. After running the migrations, set up Row Level Security:"
echo "   Copy and paste this SQL in the SQL Editor:"
echo ""
echo "-- Enable RLS on users table"
echo "ALTER TABLE users ENABLE ROW LEVEL SECURITY;"
echo ""
echo "-- Policy: Users can read all profiles"
echo "CREATE POLICY \"Public profiles are viewable by everyone\" ON users"
echo "  FOR SELECT USING (true);"
echo ""
echo "-- Policy: Users can insert their own profile"
echo "CREATE POLICY \"Users can insert their own profile\" ON users"
echo "  FOR INSERT WITH CHECK (auth.uid() = id);"
echo ""
echo "-- Policy: Users can update their own profile"
echo "CREATE POLICY \"Users can update own profile\" ON users"
echo "  FOR UPDATE USING (auth.uid() = id);"
echo ""
echo "-- Enable RLS on stream_entries table"
echo "ALTER TABLE stream_entries ENABLE ROW LEVEL SECURITY;"
echo ""
echo "-- Policy: Anyone can read public entries"
echo "CREATE POLICY \"Public entries are viewable by everyone\" ON stream_entries"
echo "  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid());"
echo ""
echo "-- Policy: Authenticated users can insert entries"
echo "CREATE POLICY \"Authenticated users can insert entries\" ON stream_entries"
echo "  FOR INSERT WITH CHECK (auth.uid() = user_id);"
echo ""
echo "-- Policy: Users can update their own entries"
echo "CREATE POLICY \"Users can update own entries\" ON stream_entries"
echo "  FOR UPDATE USING (auth.uid() = user_id);"
echo ""
echo "5. Configure Authentication:"
echo "   - Go to Authentication → Settings"
echo "   - Enable 'Confirm email' under 'User Signups'"
echo "   - Add your site URL to 'Site URL': http://localhost:3002"
echo "   - Add redirect URLs: http://localhost:3002/auth/callback"
echo ""
echo "🎉 Once you complete these steps in Supabase dashboard:"
echo "   npm run dev"
echo ""
echo "📖 For detailed instructions, see: SUPABASE_SETUP.md" 