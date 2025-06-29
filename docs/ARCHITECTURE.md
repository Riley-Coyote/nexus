# 🏗️ Architecture Overview

## **High-Level Flow**

```
User → Components → Hooks → DataService → Database
```

## **🧩 Key Components**

### **Frontend (React/Next.js)**
```
src/app/page.tsx           # Main app layout
src/components/
├── MainContent.tsx        # Logbook page
├── DreamMainContent.tsx   # Dreams page  
├── ResonanceField.tsx     # Home/feed page
├── EntryComposer.tsx      # Post creation
└── StreamEntry.tsx        # Individual posts
```

### **Data Layer**
```
src/hooks/useNexusData.ts      # React hook for data
src/lib/services/dataService.ts # Business logic
src/lib/database/              # Database abstraction
```

### **Database (Supabase)**
```
stream_entries        # All posts (logbook + dreams)
user_interactions     # Resonances, amplifications
```

---

## **📊 Data Flow**

### **Creating a Post**
1. User types in `EntryComposer`
2. Component calls `useNexusData.submitEntry()`
3. Hook calls `dataService.addStreamEntry()`
4. DataService saves to database
5. Hook updates React state
6. Components re-render with new data

### **Loading Posts**
1. Component mounts
2. `useNexusData` hook fetches data
3. DataService queries database  
4. Data flows back through hooks to components

---

## **🔄 State Management**

- **Database**: Persistent storage (Supabase)
- **DataService**: In-memory cache + database sync
- **useNexusData**: React state + real-time updates
- **Components**: UI state (forms, modals, etc.)

---

## **🎯 Key Patterns**

### **Database Abstraction**
```typescript
DatabaseProvider → SupabaseProvider | MockProvider
```
Easy to switch database providers or use mock data

### **Debug Mode Toggle**
```typescript
// In src/lib/services/dataService.ts
const DEBUG_USE_MOCK_DATA = true;   // In-memory mock data
const DEBUG_USE_MOCK_DATA = false;  // Database storage
```
Instant switching between mock and real data for development

### **Hook-Based Architecture**
```typescript
useNexusData() // Single source of truth for app data
```
All components use the same hook for consistency

### **Type Safety**
```typescript
StreamEntry, UserInteraction // Shared types across app
```

---

## **🚀 Adding New Features**

1. **Database**: Add tables/fields in `database/schema.sql`
2. **Types**: Update `src/lib/database/types.ts`
3. **DataService**: Add business logic methods
4. **Hook**: Add methods to `useNexusData`
5. **Components**: Build UI components
6. **Integration**: Connect components to hooks

---

## **🛠️ Development Principles**

- **Separation of Concerns**: UI ≠ Business Logic ≠ Database
- **Type Safety**: TypeScript everywhere
- **Single Source of Truth**: One hook for all data
- **Database Agnostic**: Can switch from Supabase easily
- **Progressive Enhancement**: Works with/without database
- **Debug-Friendly**: One-line toggle between mock and real data

**Questions?** Check the code or ask the team! The architecture is designed to be simple and predictable. 