#!/bin/bash

# NEXUS Database Setup Script
# This script sets up the complete NEXUS database with all features

echo "🚀 Starting NEXUS Database Setup..."
echo "=================================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials first."
    echo ""
    echo "Required variables:"
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    exit 1
fi

# Load environment variables
source .env.local

# Verify required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Missing required environment variables in .env.local"
    echo "Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Environment variables loaded"

# Define exec_sql RPC helper before any schema/apply steps
echo ""
echo "🔨 Defining exec_sql RPC helper..."
npm run db:sql -- "$(cat database/migrations/000_add_exec_sql_function.sql)"
if [ $? -ne 0 ]; then
    echo "⚠️ rpc(exec_sql) failed. Attempting direct psql fallback..."
    if [ -n "$DATABASE_URL" ]; then
        echo "🔨 Applying migration via psql using DATABASE_URL"
        psql "$DATABASE_URL" -f database/migrations/000_add_exec_sql_function.sql
        if [ $? -ne 0 ]; then
            echo "❌ psql fallback failed. Cannot define exec_sql function."
            exit 1
        fi
    else
        echo "❌ DATABASE_URL not set. Please set DATABASE_URL for psql fallback."
        exit 1
    fi
fi

# Step 1: Setup main schema
echo ""
echo "📋 Step 1: Setting up main database schema..."
npm run db:setup
if [ $? -ne 0 ]; then
    echo "❌ Failed to setup main schema"
    exit 1
fi

# Step 2: Run migrations in order
echo ""
echo "🔄 Step 2: Running database migrations..."

migrations=(
    "database/migrations/001_initial_schema.sql"
    "database/migrations/002_add_collaboration_features.sql" 
    "database/migrations/003_efficient_interactions.sql"
    "database/migrations/004_add_users_table.sql"
    "database/migrations/005_add_follow_system.sql"
    "database/migrations/007_rename_user_uuid_to_user_id.sql"
    "database/migrations/008_add_username_to_stream_entries.sql"
)

for migration in "${migrations[@]}"; do
    if [ -f "$migration" ]; then
        echo "📄 Running: $(basename $migration)"
        npm run db:sql -- "$(cat $migration)"
        if [ $? -ne 0 ]; then
            echo "❌ Failed to run migration: $migration"
            exit 1
        fi
    else
        echo "⚠️  Migration file not found: $migration"
    fi
done

# Step 3: Seed initial data
echo ""
echo "🌱 Step 3: Seeding initial data..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "❌ Failed to seed data"
    exit 1
fi

# Step 4: Health check
echo ""
echo "🏥 Step 4: Running health check..."
npm run db:health
if [ $? -ne 0 ]; then
    echo "❌ Health check failed"
    exit 1
fi

# Step 5: Verify tables exist
echo ""
echo "🔍 Step 5: Verifying database structure..."

tables=(
    "stream_entries"
    "user_interactions" 
    "entry_interaction_counts"
    "user_resonances"
    "user_amplifications"
    "entry_branches"
    "users"
    "user_follows"
)

for table in "${tables[@]}"; do
    echo "  Checking table: $table"
    npm run db:sql "SELECT COUNT(*) FROM $table LIMIT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "  ✅ $table exists"
    else
        echo "  ❌ $table missing or inaccessible"
    fi
done

echo ""
echo "🎉 NEXUS Database Setup Complete!"
echo "=================================="
echo ""
echo "✅ Database schema established"
echo "✅ All interaction tables created"
echo "✅ User and follow system ready"
echo "✅ Efficient branching system active"
echo "✅ Sample data loaded"
echo ""
echo "🚀 Next steps:"
echo "1. Make sure DEBUG_USE_MOCK_DATA = false in dataService.ts"
echo "2. Restart your development server: npm run dev"
echo "3. Your app should now use the live database!"
echo ""
echo "🔧 Useful commands:"
echo "  npm run db:health  - Check database connection"
echo "  npm run db:backup  - Create data backup"
echo "  npm run db:sql \"SELECT * FROM stream_entries LIMIT 5\" - Run custom SQL"
echo "" 