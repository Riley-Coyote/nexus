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
| D1 | Duplication | `StreamEntry.tsx` duplicates UI/logic already in `PostDisplay` | ❌
| D2 | Duplication | `PostOverlay.tsx` duplicates interaction logic (modal) | ◐ (out-of-scope *for now*)
| P1 | Props-drilling | Pages convert data & forward 10-15 callbacks | ❌
| N1 | Network | `PostDisplay` still fetches `getUserInteractionState` even when parent knows | ❌
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