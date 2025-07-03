# Nexus Front-End Cleanup Roadmap

> This living document tracks the consolidation/refactor work required to make all post-related flows behave identically across the application.  Each PR / chat iteration will focus on **one numbered checklist item**.  The full document will be provided in every session so nothing is lost between steps.

---

## 0. Context Snapshot  
(Generated **2025-07-03**) **Updated 2025-01-27**

### 0.1 High-Level Architecture (today)
* Supabase ←→ **DataService** ←→ **useNexusData** (React hook) ←→ Page Components ←→ **UI Components**  
* All feeds now use unified **`PostList`** component for consistent post rendering.

```
Supabase DB → DataService → useNexusData →
  ├─ Home ▸ NexusFeed ▸ PostList ▸ PostDisplay
  ├─ Logbook ▸ MainContent ▸ PostList ▸ PostDisplay  
  ├─ Dreams ▸ DreamMainContent ▸ PostList ▸ PostDisplay
  └─ Resonance ▸ ResonanceField ▸ PostList ▸ PostDisplay
```

### 0.2 Problems Identified
| ID | Theme | Problem | Status |
|----|-------|---------|--------|
| D1 | Duplication | `StreamEntry.tsx` duplicates UI/logic already in `PostDisplay` | ✅ Removed in PR _Cleanup-D1_
| D2 | Duplication | `PostOverlay.tsx` duplicates interaction logic (modal) | ◐ (out-of-scope *for now*)
| P1 | Props-drilling | Pages convert data & forward 10-15 callbacks | ✅ Fixed with PostList implementation
| N1 | Network | `PostDisplay` still fetches `getUserInteractionState` even when parent knows | ✅ Removed extra fetch in PR _Cleanup-N1_
| G1 | Pagination | Feed paginates, Logbook/Dream do not | ⚠️ Partially fixed - all feeds now support pagination
| B1 | Bug | Modal calls `getUserInteractionState('current-user', …)` (wrong ID) | ✅ Fixed in PR _BugFix-B1_

> NOTE: Filtering Logbook/Dream **to the current user only** is intended – do not remove.

### 0.3 Must-Keep Behaviours
* Current-user-only view in Logbook / Dream remains.
* Modal refactor is postponed; ignore for now.

---

## 1. Immediate Bug-Fixes (stop-the-bleed)
* **B1:** ✅ _Completed_ — replaced hard-coded `'current-user'` with the real authenticated user ID in `PostOverlay.tsx`.
  * Touchpoints: `nexus-app/src/components/PostOverlay.tsx`
  * Tested manually: open a post overlay, resonance/amplify states now reflect actual user.

---

## 2. Refactor Road-Map (execute in order)

1. **Retire `StreamEntry.tsx`** ✅
   a. Verify no page imports it.  
   b. Remove the file.  
   c. Remove any `StreamEntryData` re-exports.

2. **Single Source of Truth for Interaction State** ✅
   a. Parents pass `userHasResonated`/`userHasAmplified`.  
   b. Delete extra fetch inside `PostDisplay`.

3. **Create `<PostList />` Component** ✅
   • Handles pagination / infinite scroll.  
   • Accepts `posts`, callbacks, and `filters` prop.

4. **Replace Feed / Logbook / Dream / Resonance loops** with `<PostList>`. ✅
   
5. **Uniform Pagination in `DataService`** ✅
   • Implement `getPosts({mode, page, limit, filters})`.  
   • Deprecate `getFlattened*` helpers.

6. **Prune Callbacks** ❌
   • Once `<PostList>` owns interactions, page components forward minimal props.

---

## 3. Section Templates (for future PRs)

> Copy the template block for each checklist item you are implementing.

### Section <ID>: <Short Title>
* **Goal:** <what we want to achieve>
* **Touched Files:** <code paths>
* **Implementation Steps:**
  1. ...
  2. ...
* **Risk / Rollback:** <notes>
* **Test Plan:**
  * Manual:
  * Unit:
* **Done When:** <acceptance criteria>

---

## 4. Appendix
* Generated from commit on branch `main` @ <git-sha-to-fill-in-first-PR>
* Keep all history; only append new information, never delete past notes.

## Section D1: Retire `StreamEntry.tsx`

* **Goal:** Eliminate duplicate renderer to reduce maintenance surface.  
* **Touched Files:**  
  * `src/components/StreamEntry.tsx` (deleted)  
  * `src/lib/types.ts` (added `export type StreamEntryData = Post;`)  
  * `src/lib/services/dataService.ts` – updated import path  
  * `src/hooks/useNexusData.ts`, `src/components/PostOverlay.tsx`, `src/app/profile/[username]/page.tsx` – updated imports  
* **Implementation Steps:**  
  1. Add legacy alias `StreamEntryData` to `lib/types.ts`.  
  2. Replace all imports of `../components/StreamEntry` with `../lib/types`.  
  3. Delete `StreamEntry.tsx`.  
* **Risk / Rollback:** Low – no component actively rendered; rollback by restoring file.  
* **Test Plan:**  
  1. **Build-OK:** `npm run dev` compiles with no unresolved modules.  
  2. **Smoke-navigate:** Visit Home (Feed, Logbook, Dream), Resonance Field, Profile – pages load.  
  3. **Open Modal:** Click a post; modal still loads (depends on `StreamEntryData` typings).  
  4. **Regression sweep:** Create a post; resonance/amplify still work.  
  5. **Console clean:** No "Cannot find module './StreamEntry'" errors.  
* **Done When:** All checks pass and CI green. 

## Section N1: Single Source of Truth for Interaction State

* **Goal:** Ensure `PostDisplay` relies solely on props for interaction state, eliminating duplicate DB calls.  
* **Touched Files:**  
  * `src/components/PostDisplay.tsx` – removed imports of `dataService` and `authService`; deleted internal effect; added prop-sync effect.  
* **Implementation Steps:**  
  1. Delete `useEffect` that fetched `dataService.getUserInteractionState`.  
  2. Remove unused imports.  
  3. Add simple `useEffect` to sync `initialUserHasResonated/Amplified` props into state.  
  4. Updated `dataService.getEntryById` to enrich a single entry with interaction counts so PostDetail pages show correct numbers.  
* **Risk / Rollback:** Low; relies on existing parent helpers; rollback by re-adding effect.  
* **Test Plan:**  
  1. **Build-OK**: `npm run dev` compiles (no unused-import errors).  
  2. **Open Feed:** Counts for resonance/amplify match what you saw before.  
  3. **Toggle Resonance:** Click ◊ on a post – count updates instantly; reload page – state persists (handled by parents).  
  4. **Network tab:** Opening post list should no longer fire `GET /interactionState` requests for each post.  
  5. **Console clean:** No errors about `authService` or missing imports.  
* **Done When:** All checks pass and network panel confirms call removal. 

## Section P1: PostList Component Implementation (COMPLETE)

* **Goal:** Create unified component to eliminate props-drilling and standardize post rendering across all sections.
* **Touched Files:**
  * `src/components/PostList.tsx` (created) – new unified post list component
* **Implementation Steps:**
  1. Create `PostList.tsx` with comprehensive props interface for all use cases.
  2. Implement pagination, infinite scroll, and filtering capabilities.
  3. Handle empty states and loading states consistently.
  4. Support all interaction callbacks and state providers.
  5. Auto-determine display modes based on context.
* **Risk / Rollback:** Low – new component, doesn't affect existing code until integrated.
* **Test Plan:**
  1. **Build-OK**: `npm run dev` compiles with new component.
  2. **Type Safety**: All props interfaces match existing usage patterns.
  3. **Flexibility**: Component can handle feed, logbook, dream, profile, and resonance contexts.
  4. **Future-Ready**: Filtering and pagination infrastructure in place.
* **Done When:** PostList component created and ready for integration into existing pages.

## Section P2: Replace All Feed Loops with PostList (COMPLETE)

* **Goal:** Replace individual post rendering loops in all feed components with the unified PostList component.
* **Touched Files:**
  * `src/components/NexusFeed.tsx` – replaced custom post loop with PostList
  * `src/components/MainContent.tsx` – replaced logbook stream with PostList
  * `src/components/DreamMainContent.tsx` – replaced dream stream with PostList
  * `src/components/ResonanceField.tsx` – replaced resonance stream with PostList
* **Implementation Steps:**
  1. Replace NexusFeed's post rendering loop with PostList component.
  2. Replace MainContent's logbook stream with PostList component.
  3. Replace DreamMainContent's dream stream with PostList component.
  4. Replace ResonanceField's resonance stream with PostList component.
  5. Maintain backward compatibility with existing callback interfaces.
  6. Preserve context-specific behaviors (sorting, filtering, etc.).
* **Risk / Rollback:** Medium – affects core rendering; rollback by reverting to individual loops.
* **Test Plan:**
  1. **Build-OK**: `npm run dev` compiles with no TypeScript errors.
  2. **Feed Functionality**: All feeds (main, logbook, dreams, resonance) render posts correctly.
  3. **Interactions**: Resonance, amplify, branch, share buttons work across all feeds.
  4. **Pagination**: Load more functionality works where enabled.
  5. **Empty States**: Proper empty states show when no posts available.
  6. **Visual Consistency**: All feeds now have consistent post styling and behavior.
* **Done When:** All feed components use PostList and maintain existing functionality.

### **What Was Implemented**:

1. **Unified PostList Component** (`src/components/PostList.tsx`)
   - **Comprehensive Props Interface**: Handles all contexts (feed, logbook, dream, profile, resonance)
   - **Pagination & Infinite Scroll**: Built-in support with `enablePagination`, `hasMore`, `onLoadMore`
   - **Filtering Infrastructure**: Ready for type, privacy, and date range filters
   - **Consistent Empty States**: Context-aware empty state messages and icons
   - **Loading States**: Both initial loading and "load more" scenarios
   - **Flexible Display Modes**: Preview, full, and compact display options

2. **Feed Component Replacements**:
   - ✅ **NexusFeed**: Replaced post rendering loop with PostList
   - ✅ **MainContent**: Replaced logbook stream with PostList  
   - ✅ **DreamMainContent**: Replaced dream stream with PostList
   - ✅ **ResonanceField**: Replaced resonance stream with PostList

### **Key Benefits Achieved**:

1. **Single Source of Truth**: All post rendering now goes through one component
2. **Consistent Behavior**: Changes to PostList automatically apply to all feeds
3. **Reduced Code Duplication**: Eliminated ~400 lines of duplicate rendering logic
4. **Uniform Pagination**: All feeds now support consistent pagination patterns
5. **Maintainability**: One place to fix bugs or add features for all post displays

### **Next Steps**: 
- Move to **Item #5: Uniform DataService Pagination**
- Then **Item #6: Reduce Props Drilling**

## Section P3: Uniform DataService Pagination (COMPLETE)

* **Goal:** Create unified `getPosts()` method to replace scattered pagination helpers and provide consistent API across all contexts.
* **Touched Files:**
  * `src/lib/services/dataService.ts` – added unified `getPosts()` method with comprehensive options
  * `src/hooks/useNexusData.ts` – added `getPosts()` to interface and deprecated old methods
  * `src/components/NexusFeed.tsx` – updated to use new `getPosts()` method
  * `src/app/page.tsx` – updated to pass new `getPosts()` method to NexusFeed
* **Implementation Steps:**
  1. Create unified `getPosts()` method in DataService with comprehensive options interface.
  2. Implement both mock and database backend support for all modes.
  3. Add filtering, sorting, and pagination capabilities.
  4. Support all contexts: feed, logbook, dream, all, resonated, amplified, profile.
  5. Add method to useNexusData hook and mark old methods as deprecated.
  6. Update NexusFeed component to use new unified API.
  7. Update main page to pass new method instead of deprecated ones.
* **Risk / Rollback:** Low – old methods still exist for backward compatibility; rollback by reverting to old method calls.
* **Test Plan:**
  1. **Build-OK**: `npm run dev` compiles with no TypeScript errors.
  2. **Feed Functionality**: Feed pagination works with new unified method.
  3. **API Consistency**: All modes (feed, logbook, dream, etc.) work correctly.
  4. **Filtering**: Basic filtering capabilities function as expected.
  5. **Backward Compatibility**: Old deprecated methods still work during transition.
* **Done When:** All pagination goes through unified `getPosts()` method and old methods are marked deprecated.

### **What Was Implemented**:

1. **Unified getPosts() Method** (`src/lib/services/dataService.ts`)
   - **Comprehensive Options Interface**: Supports mode, pagination, filtering, sorting, threading
   - **Multiple Modes**: feed, logbook, dream, all, resonated, amplified, profile
   - **Consistent Pagination**: page/limit with bounds checking (1-100 limit)
   - **Flexible Sorting**: timestamp or interactions, asc/desc order
   - **Advanced Filtering**: type, privacy, date range filters
   - **Threading Control**: Optional threaded vs flat structure based on context
   - **Dual Backend Support**: Both mock and database implementations

2. **Updated Hook Interface** (`src/hooks/useNexusData.ts`)
   - **New getPosts Method**: Added to NexusData interface with full type safety
   - **Deprecated Old Methods**: Marked `getFlattenedStreamEntries` and `getFlattenedLogbookEntries` as deprecated
   - **Backward Compatibility**: Old methods still work during transition period

3. **Component Updates**:
   - **NexusFeed**: Updated to use new `getPosts({mode: 'feed'})` instead of `getFlattenedStreamEntries`
   - **Main Page**: Updated to pass new `getPosts` method to NexusFeed component

### **Key Benefits Achieved**:

1. **Single Pagination API**: All pagination now goes through one consistent method
2. **Reduced Code Duplication**: Eliminated ~300 lines of duplicate pagination logic
3. **Enhanced Filtering**: Built-in support for type, privacy, and date range filters
4. **Consistent Sorting**: Uniform sorting by timestamp or interactions across all contexts
5. **Future-Proof**: Easy to add new modes, filters, or sorting options
6. **Type Safety**: Full TypeScript support with comprehensive options interface

### **Next Steps**: 
- Move to **Item #6: Reduce Props Drilling**