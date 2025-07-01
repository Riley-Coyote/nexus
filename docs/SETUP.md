# 🚀 Setup Guide

## **Prerequisites**
- Node.js 18+
- npm or yarn
- Git

## **1. Clone & Install**
```bash
git clone [repository]
cd nexus/nexus-app
npm install
```

## **2. Environment Setup**

**🚩 Quick Start:** For instant testing without database setup, skip to **Option B** below!

### **Option A: Use Database (Recommended for real development)**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3002  # for email redirect/callback
```

**Get these from:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Your project → Settings → API
3. Copy the URL and anon key

### **Option B: Use Mock Data (Quick Testing)**

**For instant local testing without database setup:**

```typescript
// In src/lib/services/dataService.ts, change:
const DEBUG_USE_MOCK_DATA = true;  // 👈 Set to true for mock data
```

This gives you in-memory data that resets on refresh - perfect for quick testing!

## **3. Database Setup (Supabase CLI)**
```bash
# Initialize local Supabase project (run once)
supabase init

# Start local Supabase services
supabase start

# Apply all pending migrations
supabase migration up

# (Optional) Reset database to clean slate (replay all migrations + seeds)
supabase db reset

# (Optional) Create a migration from dashboard schema changes
supabase db diff -f <name>

# (Optional) Push migrations to remote
supabase db push
```

## **4. Start Development**
```bash
npm run dev
```

App runs on `http://localhost:3002` (or next available port configured in `.env.local`)

**Check console for data source:**
- `🧪 Data Source: In-Memory Mock Data` = Using debug mode
- `🗄️ Data Source: Supabase Database` = Using real database

---

## **🔧 Troubleshooting**

### **Database connection fails**
- Check your `.env.local` file
- Verify Supabase credentials
- Run `npm run db:health` to diagnose

### **Port already in use**
- Next.js will automatically find the next available port
- Check the terminal output for the correct URL

### **Dependencies issues**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## **🌐 Development URLs**

- **App**: http://localhost:3002 (or shown in terminal)
- **Supabase Dashboard**: https://supabase.com/dashboard

---

## **✅ Verify Setup**

1. ✅ App loads in browser
2. ✅ Can create logbook entries
3. ✅ Can create dream entries  
4. ✅ Database commands work: `npm run db:health`

**All good?** You're ready to develop! 🎉 