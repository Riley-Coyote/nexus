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

## **🔄 Schema Changes**

### **1. Update Schema File**
Edit `database/schema.sql` with your changes

### **2. Test Locally**
```bash
npm run db:setup  # Apply changes
npm run db:seed   # Test with data
```

### **3. Create Migration** (for production)
```bash
# Create new migration file
touch database/migrations/003_your_change.sql

# Add your SQL changes to the file
# Apply when ready:
npm run db:sql "$(cat database/migrations/003_your_change.sql)"
```

---

## **🔧 Data Management**

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