# 🗄️ Database Guide

## **🧪 Quick Debug Toggle**

**Switch data source instantly:**
```typescript
// In src/lib/services/dataService.ts
const DEBUG_USE_MOCK_DATA = true;   // In-memory mock data
const DEBUG_USE_MOCK_DATA = false;  // Database storage
```

## **Quick Commands**
```bash
npm run db:help      # Show all commands
npm run db:health    # Check connection
npm run db:seed      # Add sample data
npm run db:backup    # Create backup
npm run db:sql "SELECT * FROM stream_entries LIMIT 5"
```

---

## **📊 Database Schema**

### **stream_entries** (Main posts table)
```sql
id              BIGSERIAL PRIMARY KEY
user_id         TEXT NOT NULL
type            TEXT NOT NULL  -- 'logbook' or 'dreams'
subtype         TEXT NOT NULL  -- 'deep-reflection', 'lucid-processing', etc.
title           TEXT NOT NULL
content         TEXT NOT NULL
tags            TEXT[]
resonance_field DECIMAL(3,2)   -- 0.0 to 1.0
quantum_layer   INTEGER        -- 1 to 5
timestamp       TIMESTAMPTZ
```

### **user_interactions** (Resonances, amplifications)
```sql
id               BIGSERIAL PRIMARY KEY
user_id          TEXT NOT NULL
entry_id         BIGINT REFERENCES stream_entries(id)
interaction_type TEXT NOT NULL  -- 'resonance', 'amplify', etc.
intensity        DECIMAL(3,2)   -- 0.0 to 1.0
timestamp        TIMESTAMPTZ
```

+### **entry_interaction_counts** (Aggregated counters for fast lookups)
+```sql
+entry_id          BIGINT PRIMARY KEY REFERENCES stream_entries(id)
+resonance_count   INTEGER DEFAULT 0
+branch_count      INTEGER DEFAULT 0
+amplification_count INTEGER DEFAULT 0
+share_count       INTEGER DEFAULT 0
+created_at        TIMESTAMPTZ DEFAULT NOW()
+updated_at        TIMESTAMPTZ DEFAULT NOW()
+```
+
+### **user_resonances** (Track who resonated with what)
+```sql
+id        BIGSERIAL PRIMARY KEY
+user_id   TEXT NOT NULL REFERENCES users(id)
+entry_id  BIGINT NOT NULL REFERENCES stream_entries(id)
+created_at TIMESTAMPTZ DEFAULT NOW()
+UNIQUE(user_id, entry_id)
+```
+
+### **user_amplifications** (Track who amplified what)
+```sql
+id        BIGSERIAL PRIMARY KEY
+user_id   TEXT NOT NULL REFERENCES users(id)
+entry_id  BIGINT NOT NULL REFERENCES stream_entries(id)
+created_at TIMESTAMPTZ DEFAULT NOW()
+UNIQUE(user_id, entry_id)
+```
+
+### **entry_branches** (Branch relationships for entries)
+```sql
+id               BIGSERIAL PRIMARY KEY
+parent_entry_id  BIGINT NOT NULL REFERENCES stream_entries(id)
+child_entry_id   BIGINT NOT NULL REFERENCES stream_entries(id)
+branch_order     INTEGER DEFAULT 0
+created_at       TIMESTAMPTZ DEFAULT NOW()
+UNIQUE(parent_entry_id, child_entry_id)
+```
+
+### **users** (User profiles and stats)
+```sql
+id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4()
+username           TEXT UNIQUE NOT NULL
+email              TEXT UNIQUE
+name               TEXT NOT NULL
+bio                TEXT
+location           TEXT
+profile_image_url  TEXT
+avatar             TEXT NOT NULL
+role               TEXT DEFAULT 'Explorer'
+stats              JSONB DEFAULT '{"entries":0,"dreams":0,"connections":0}'
+created_at         TIMESTAMPTZ DEFAULT NOW()
+updated_at         TIMESTAMPTZ DEFAULT NOW()
+```
+
+### **user_follows** (Follow relationships)
+```sql
+id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
+follower_id    UUID NOT NULL REFERENCES users(id)
+followed_id    UUID NOT NULL REFERENCES users(id)
+created_at     TIMESTAMPTZ DEFAULT NOW()
+UNIQUE(follower_id, followed_id)
+```

---

## **💻 Working with Data**

### **In Code (DataService)**
```typescript
// Get all entries
const entries = await dataService.getStreamEntries();

// Create new entry
await dataService.addStreamEntry({
  type: 'logbook',
  subtype: 'deep-reflection',
  title: 'My Reflection',
  content: 'Content here...',
  tags: ['reflection', 'insight']
});

// Add interaction
await dataService.addUserInteraction(entryId, 'resonance', 0.8);
```

### **Direct SQL**
```bash
# View recent entries
npm run db:sql "SELECT title, type, timestamp FROM stream_entries ORDER BY timestamp DESC LIMIT 10"

# Count by type
npm run db:sql "SELECT type, COUNT(*) FROM stream_entries GROUP BY type"

# High resonance entries
npm run db:sql "SELECT title, resonance_field FROM stream_entries WHERE resonance_field > 0.8"
```

---

## **🔄 Updating the Database Schema**

When you need to change the database schema (e.g., add a table or a column), follow these steps:

**1. Create a Migration File**

-   Create a new SQL file in `nexus-app/database/migrations/`.
-   Use a numbered prefix for ordering, e.g., `007_add_new_feature.sql`.

**2. Add your SQL Changes**

-   Write the SQL commands for your changes in the new file.
-   Make sure your SQL is runnable and tested.

**3. Update the SQL Generator**

-   Open `nexus-app/generate-sql.js`.
-   Add your new migration filename to the `migrations` array. This tells the script to include your changes.

**4. Generate the Combined SQL File**

-   Run the generator script from the `nexus-app` directory:
    ```bash
    npm run generate-sql
    ```
-   This will update `supabase-schema.sql` with all migrations.

**5. Apply to Supabase**

-   Go to your Supabase project's **SQL Editor**.
-   Open the newly updated `supabase-schema.sql` file.
-   Copy its entire content and paste it into the Supabase SQL Editor.
-   Click **"Run"**.

---

## **🔄 Data Management**

### **Reset Database** (Development only!)
```bash
npm run db:reset  # ⚠️ DELETES ALL DATA
```

### **Backup & Restore**
```bash
# Create backup
npm run db:backup  # Creates backup_YYYY-MM-DD.json

# Manual restore (if needed)
# Import the JSON data back through the app or SQL
```

---

## **🚨 Important Notes**

- **Environment**: Uses Supabase PostgreSQL
- **Authentication**: Row Level Security enabled
- **Indexes**: Optimized for timestamp and resonance queries
- **Backup**: Always backup before major changes
- **Local Development**: Can use Supabase CLI for local database

---

## **🔍 Useful Queries**

```sql
-- Most resonant entries
SELECT title, resonance_field 
FROM stream_entries 
ORDER BY resonance_field DESC 
LIMIT 10;

-- Recent activity
SELECT type, subtype, title, timestamp 
FROM stream_entries 
WHERE timestamp > NOW() - INTERVAL '7 days' 
ORDER BY timestamp DESC;

-- User interaction summary
SELECT interaction_type, COUNT(*), AVG(intensity) 
FROM user_interactions 
GROUP BY interaction_type;
```

**Need more complex queries?** Use the database management tools or ask the team! 

---

## 🚀 Running Supabase Migrations with the Supabase CLI

Need to apply the SQL files in `supabase/migrations/` to either your **local Docker stack** or the **hosted Supabase project**?  Follow this checklist.

### 1️⃣ One-time machine setup

```bash
brew install supabase/tap/supabase   # install / upgrade the CLI
supabase login                       # opens browser → copy auth token
```

### 2️⃣ Link the repo to a Supabase project

```bash
cd nexus-app                         # project root (contains the supabase folder)
supabase link --project-ref <PROJECT_REF>
# <PROJECT_REF> is in the dashboard → Settings → General (looks like abcd1234)
```
This writes `.supabase/config.json` so future commands know which project to use.

### 3️⃣ Local development workflow (Docker)

```bash
# Spin up Postgres + Kong + Studio
supabase start

# Apply **only** new migration files
supabase db push                     # use supabase db reset to wipe & re-seed

# Stop containers when finished
supabase stop
```

### 4️⃣ Deploy migrations to the hosted database

```bash
# From the same directory (and after `git add` / commit if you like)
supabase db push                     # applies new files to the linked project
```
The CLI stores each applied file & checksum in the `supabase_migrations` table.  Rerunning the command is safe—files already logged are skipped automatically.

### 5️⃣ Troubleshooting tips

* **"Cannot find project ref"** → run `supabase link --project-ref <ref>` again in repo root.
* **Checksum mismatch** → never edit an already-applied file; add a new numbered migration instead (e.g., `012_fix_bug.sql`).
* **Docker errors** → ensure Docker Desktop is running before `supabase start`. 