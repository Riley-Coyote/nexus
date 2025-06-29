# 🌟 Nexus Project Guide

## **Quick Start (5 minutes)**

### 1. **Setup**
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Setup database
npm run db:setup
npm run db:seed
```

### 2. **Development**
```bash
npm run dev  # Start development server
```

---

## **🧪 Debug Mode Toggle**

**Quick switch between in-memory mock data and database:**

```typescript
// In src/lib/services/dataService.ts
const DEBUG_USE_MOCK_DATA = true;  // 👈 Change this for instant switching
```

**Options:**
- `true` = In-memory mock data (fast, predictable, resets on refresh)
- `false` = Database storage (persistent, multi-user)

**Console will show:** `🧪 Data Source: In-Memory Mock Data` or `🗄️ Data Source: Supabase Database`

---

## **🗄️ Database Commands**

```bash
npm run db:help     # Show all commands
npm run db:health   # Check database connection
npm run db:seed     # Add sample data
npm run db:backup   # Create backup
```

**Execute SQL directly:**
```bash
npm run db:sql "SELECT COUNT(*) FROM stream_entries"
```

---

## **📁 Project Structure**

```
nexus-app/
├── src/
│   ├── app/          # Next.js app router
│   ├── components/   # React components
│   ├── lib/          # Business logic & database
│   └── hooks/        # React hooks
├── database/         # Database schema & migrations
└── docs/            # Project documentation
```

---

## **🔑 Key Features**

- **Stream Entries**: Logbook & Dreams posts
- **Resonance Field**: Real-time interactions
- **Database**: Supabase with local development support
- **Authentication**: Ready for multi-user (when needed)

---

## **🛠️ Development Workflow**

### **Database Changes**
1. Make changes in `database/schema.sql`
2. Test with `npm run db:setup`
3. Create migration file in `database/migrations/`

### **Adding Features**
1. Components go in `src/components/`
2. Data logic goes in `src/lib/services/`
3. Database types in `src/lib/database/types.ts`

---

## **🚨 Need Help?**

- **Database issues**: Check `docs/DATABASE.md`
- **Setup problems**: Check `docs/SETUP.md`
- **Can't find something**: Ask the team!

---

**🎯 Goal**: Keep the codebase clean, documented, and easy for anyone to jump in and contribute. 