# Database Schema & Relationships

This document provides an in-depth overview of all database tables, how they relate to one another, how counts (followers, resonances/likes, amplifications, branches) are maintained, and performance considerations.

---

## Tables & Relationships

### 1. users
- **id** UUID PRIMARY KEY
- **username**, **email**, **name**, **bio**, **location**, **avatar**, **role**, **stats** JSONB
- **follower_count**, **following_count** INTEGER counters
- **created_at**, **updated_at** timestamps

**Purpose:** Stores user profiles and pre-aggregated follow counts.

### 2. stream_entries
- **id** BIGSERIAL PRIMARY KEY
- **user_id** UUID NOT NULL → FOREIGN KEY to `users.id` (after migration)
- **parent_id**, **children** array for threading
- **type**, **agent**, **content**, **title**, **privacy**, **tags**, **metrics**, **interactions**, etc.
- **resonance_field**, **quantum_layer**, **metadata** legacy fields
- **created_at**, **updated_at** timestamps

**Purpose:** Core table for all posts (logbook + dreams), tracking content and hierarchical threads.

### 3. entry_interaction_counts
- **entry_id** BIGINT PRIMARY KEY → FOREIGN KEY to `stream_entries.id`
- **resonance_count**, **branch_count**, **amplification_count**, **share_count** INTEGER counters
- **created_at**, **updated_at** timestamps

**Purpose:** Pre-aggregated counters for fast UI loads and analytics.

### 4. user_resonances
- **id** BIGSERIAL PRIMARY KEY
- **user_id** TEXT (auth uid) or UUID linking to `users.id`
- **entry_id** BIGINT NOT NULL → FOREIGN KEY to `stream_entries.id`
- **created_at** timestamp
- **UNIQUE(user_id, entry_id)** ensures one "like" per user per entry

**Purpose:** Tracks which users have "resonated" (liked) which entries.

### 5. user_amplifications
- **id** BIGSERIAL PRIMARY KEY
- **user_id** TEXT/UUID
- **entry_id** BIGINT NOT NULL → FOREIGN KEY to `stream_entries.id`
- **created_at** timestamp
- **UNIQUE(user_id, entry_id)**

**Purpose:** Tracks which users have amplified (shared/emphasized) which entries.

### 6. entry_branches
- **id** BIGSERIAL PRIMARY KEY
- **parent_entry_id**, **child_entry_id** BIGINT NOT NULL → FOREIGN KEYs to `stream_entries.id`
- **branch_order** INTEGER for ordering under a parent
- **created_at** timestamp
- **UNIQUE(parent_entry_id, child_entry_id)**

**Purpose:** Maintains explicit parent→child relationships for reply threads.

### 7. user_follows
- **id** UUID PRIMARY KEY
- **follower_id**, **followed_id** UUID NOT NULL → FOREIGN KEYs to `users.id`
- **created_at** timestamp
- **UNIQUE(follower_id, followed_id)** prevents duplicates

**Purpose:** Models the follow graph and precomputes follower/following counts.

---

## Counting Mechanisms

### Followers & Following
1. **Table:** `user_follows`
2. **Triggers:** `update_follow_counts_trigger` fires AFTER INSERT/DELETE
3. **Logic:**
   - On **INSERT**, increment:
     - `users.follower_count` for `followed_id`
     - `users.following_count` for `follower_id`
   - On **DELETE**, decrement with `GREATEST(0, count - 1)`.
4. **Indexes:**
   - `idx_user_follows_follower_id`, `idx_user_follows_followed_id`

### Resonances (Likes)
1. **Table:** `user_resonances`
2. **Triggers:** `resonance_count_trigger` AFTER INSERT/DELETE on `user_resonances`
3. **Function:** `update_resonance_count` updates `entry_interaction_counts.resonance_count`
4. **UNIQUE** constraint prevents double-likes.
5. **Index:** `idx_user_resonances_entry_id` for fast lookup.

### Amplifications & Branches
- Similar pattern using `user_amplifications` + `trigger_amplification_count_update`
- `entry_branches` + `trigger_branch_count_update` maintain `branch_count`

---

## Performance & Efficiency Considerations

1. **Pre-Aggregated Counters:**
   - Avoid expensive `COUNT(*)` queries by storing counters in dedicated tables/columns.
2. **Atomic Updates:**
   - Use `INSERT ... ON CONFLICT DO UPDATE` + trigger functions to handle concurrent updates safely.
3. **Database Indexes:**
   - Index all foreign keys and count columns for quick sorting/filtering.
4. **Unique Constraints:**
   - Enforce one-to-one relationships (e.g., one like per user per entry).
5. **Partitioning & Sharding (Future):**
   - If scale demands, consider partitioning `user_resonances` and `user_follows` by time or user range.
6. **Materialized Views:**
   - For analytics-heavy queries, build precomputed views on `entry_interaction_counts`.

---

## Summary
This schema is designed for high read performance and real-time updates. All relational integrity is enforced via foreign keys and unique constraints, while triggers and atomic functions keep counters accurate without manual aggregation. For extreme scale, partitioning and materialized aggregates can be added. 