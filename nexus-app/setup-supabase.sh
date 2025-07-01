#!/bin/bash
set -e

echo "🚀 Starting NEXUS Supabase local development..."

# Ensure Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install via 'npm install -g supabase' or your package manager."
  exit 1
fi

# Initialize project if supabase directory does not exist
if [ ! -d "supabase" ]; then
  echo "🔧 Initializing Supabase project..."
  supabase init
fi

echo "⚡ Starting Supabase services..."
supabase start

echo "📦 Applying pending migrations..."
supabase migration up

echo "✅ Migrations applied."

echo ""
echo "ℹ️ You can interact with local Supabase:"
echo "  • Studio: http://localhost:54323"
echo "  • Realtime: http://localhost:54321"
echo ""
echo "Next steps:"
echo "  - To create a new migration: supabase migration new <name>"
echo "  - To reset the database: supabase db reset [--db-url <url>]"
echo "  - To generate a migration from dashboard changes: supabase db diff -f <name>"
echo ""
echo "🎉 Setup complete! Run your app with 'npm run dev'."