# Local Development & Database Workflow

This document outlines how to set up, manage, and test your local Supabase instance, perform schema migrations, and integrate with npm scripts.

## Prerequisites
- Docker installed and running
- Node.js (>=18) & npm
- Supabase CLI (install via `npm install -g supabase`)

## Environment Variables
Create a `.env.local` file in the `nexus-app/` directory with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_local_supabase>
NEXT_PUBLIC_SITE_URL=http://localhost:3002

# For server-side tools and migrations
database_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_local_supabase>
```

## Supabase CLI Workflow

### 1. Initialize Local Supabase (once)
**CLI:**
```bash
supabase init
```
**npm:**
```bash
npm run supabase:init
```

### 2. Start Supabase Services
**CLI:**
```bash
supabase start
```
**npm:**
```bash
npm run supabase:start
```
Studio is available at http://localhost:54323

### 3. Create a New Migration
**CLI:**
```bash
supabase migration new <migration_name>
```
This generates a new SQL file in `supabase/migrations/`.

### 4. Apply Pending Migrations
**CLI:**
```bash
supabase migration up
```
**npm:**
```bash
npm run supabase:migrate
```

### 5. Reset Database (Drop & Replay All Migrations)
**CLI:**
```bash
supabase db reset [--version <timestamp>]
```
**npm:**
```bash
npm run supabase:db:reset
```

### 6. Generate Diff Migration from Studio Edits
**CLI:**
```bash
supabase db diff -f <name>
```
**npm:**
```bash
npm run supabase:db:diff <name>
```

### 7. Push Migrations to Remote
**CLI:**
```bash
supabase db push
```
**npm:**
```bash
npm run supabase:db:push
```

## npm Database Helper Scripts
In `package.json`:
| Script               | Command                                                |
|----------------------|--------------------------------------------------------|
| `db:setup`           | `node -r ts-node/register src/lib/database/dbManager.ts setup`  |
| `db:seed`            | `node -r ts-node/register src/lib/database/dbManager.ts seed`   |
| `db:reset`           | `node -r ts-node/register src/lib/database/dbManager.ts reset`  |
| `db:health`          | `node -r ts-node/register src/lib/database/dbManager.ts health` |
| `db:backup`          | `node -r ts-node/register src/lib/database/dbManager.ts backup` |
| `db:sql`             | `node -r ts-node/register src/lib/database/dbManager.ts sql`    |
| `db:help`            | `node -r ts-node/register src/lib/database/dbManager.ts help`   |

Use these for manual or advanced database operations.

## Testing & Validation
- Inspect your schema and data in Supabase Studio.
- Run `npm run db:health` to verify database connectivity.
- Boot the app locally: `npm run dev` and exercise features to ensure migrations applied correctly.
- In CI, include:
  1. `supabase start`
  2. `supabase migration up`
  3. Your test suite (e.g., `npm test`)

## Best Practices & GitOps
1. **Commit** each migration file to Git.
2. **CI Pipeline**: on pull request, run `supabase start && supabase migration up && npm test`.
3. **Staging**: `supabase db reset` to verify a clean slate.
4. **Production**: share migrations and run `supabase db push` via your deployment process.

## Troubleshooting
- **Update CLI:** `supabase update`.
- **Port conflicts:** specify custom ports in `supabase/config.toml` or use `supabase start --local`.
- **Migration errors:** replay to a known good state with `supabase db reset --version <timestamp>`.
- **Docker issues:** ensure Docker Desktop is running and has sufficient resources.

---

Happy local development with Supabase! 