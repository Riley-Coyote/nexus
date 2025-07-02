#!/usr/bin/env bash
# refresh-cache.sh ────────────────────────────────────────────────────────────
# A helper script that fully clears build caches for the local development
# workspace and reinstalls dependencies. Run this from the project root:
#
#     ./refresh-cache.sh
#
# It performs the following steps:
#   1. Navigates into the nexus-app package.
#   2. Removes Next.js output (.next/) and other node_modules caches.
#   3. Cleans npm's own cache.
#   4. Reinstalls dependencies.
#
# After it finishes, you can restart the dev server with `npm run dev`.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🔄 Removing Next.js and tooling caches..."
rm -rf .next node_modules/.cache || true

echo "🧹 Cleaning npm cache..."
npm cache clean --force

echo "📦 Re-installing dependencies..."
npm install

echo "✅ Cache refresh complete. You can now run 'npm run dev'." 