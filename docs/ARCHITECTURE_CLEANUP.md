# Nexus Front-End Cleanup Roadmap

> This living document tracks the consolidation/refactor work required to make all post-related flows behave identically across the application.  Each PR / chat iteration will focus on **one numbered checklist item**.  The full document will be provided in every session so nothing is lost between steps.

---

## 0. Context Snapshot  
(Generated **2025-07-03**)

### 0.1 High-Level Architecture (today)
* Supabase ←→ **DataService** ←→ **useNexusData** (React hook) ←→ Page Components ←→ **UI Components**  
* All feeds eventually render **`PostDisplay`** except the legacy modal which still uses custom markup.

```
Supabase DB → DataService → useNexusData →
  ├─ Home ▸ NexusFeed ▸ PostDisplay
  ├─ Home ▸ (Logbook|Dream) ▸ MainContent ▸ PostDisplay
  ├─ /resonance-field ▸ ResonanceField ▸ PostDisplay
  └─ (Profile, etc.)
```

### 0.2 Problems Identified
| ID | Theme | Problem | Status |
|----|-------|---------|--------|
| D1 | Duplication | `StreamEntry.tsx` duplicates UI/logic already in `PostDisplay` | ✅ Removed in PR _Cleanup-D1_
| D2 | Duplication | `PostOverlay.tsx` duplicates interaction logic (modal) | ◐ (out-of-scope *for now*)
| P1 | Props-drilling | Pages convert data & forward 10-15 callbacks | ❌
| N1 | Network | `PostDisplay` still fetches `getUserInteractionState` even when parent knows | ✅ Removed extra fetch in PR _Cleanup-N1_
| G1 | Pagination | Feed paginates, Logbook/Dream do not | ❌
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

1. **Retire `StreamEntry.tsx`**  
   a. Verify no page imports it.  
   b. Remove the file.  
   c. Remove any `StreamEntryData` re-exports.

2. **Single Source of Truth for Interaction State**  
   a. Parents pass `userHasResonated`/`userHasAmplified`.  
   b. Delete extra fetch inside `PostDisplay`.

3. **Create `<PostList />` Component**  
   • Handles pagination / infinite scroll.  
   • Accepts `posts`, callbacks, and `filters` prop.

4. **Replace Feed / Logbook / Dream / Resonance loops** with `<PostList>`.

5. **Uniform Pagination in `DataService`**  
   • Implement `getPosts({mode, page, limit, filters})`.  
   • Deprecate `getFlattened*` helpers.

6. **Prune Callbacks**  
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