import { supabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StreamEntry, User } from '../types';
import { 
  DatabaseProvider, 
  QueryOptions, 
  InteractionType, 
  InteractionCounts,
  UserInteractionState,
  BranchNode,
  SupabaseStreamEntry, 
  SupabaseInteractionCounts,
  SupabaseUserResonance,
  SupabaseUserAmplification,
  SupabaseEntryBranch,
  FollowRelationship,
  FollowSuggestion,
  SupabaseUserFollow
} from './types';

export class SupabaseProvider implements DatabaseProvider {
  private client: SupabaseClient = supabase;
  private isConnected = true;

  constructor() {
    // Using shared Supabase client instance from src/lib/supabase.ts
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple query
      const { error } = await this.client.from('stream_entries').select('count').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      console.log('✅ Connected to Supabase');
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Supabase doesn't need explicit disconnection
    this.isConnected = false;
  }

  // Convert between our StreamEntry type and Supabase format
  private streamEntryToSupabase(entry: StreamEntry): Omit<SupabaseStreamEntry, 'id' | 'created_at' | 'updated_at'> {
    return {
      parent_id: entry.parentId ?? null,
      children: entry.children,
      depth: entry.depth,
      type: entry.type,
      agent: entry.agent,
      username: entry.username,
      connections: entry.connections || 0,
      metrics: entry.metrics || { c: 0.5, r: 0.5, x: 0.5 },
      timestamp: entry.timestamp,
      content: entry.content,
      actions: entry.actions ?? [],
      privacy: entry.privacy,
      interactions: entry.interactions,
      threads: entry.threads ?? [],
      is_amplified: entry.isAmplified,
      user_id: entry.userId || '',
      title: entry.title,
      resonance: entry.resonance,
      coherence: entry.coherence,
      tags: entry.tags,
      response: entry.response,
      entry_type: (entry.entryType ?? (
        entry.type.toLowerCase().includes('dream') || entry.resonance !== undefined ? 'dream' : 'logbook'
      ))
    };
  }

  private supabaseToStreamEntry(supabaseEntry: SupabaseStreamEntry): StreamEntry {
    // Ensure IDs are strings for consistent comparisons
    const id = supabaseEntry.id.toString();
    const parentId = supabaseEntry.parent_id !== null ? supabaseEntry.parent_id.toString() : null;
    return {
      id,
      parentId,
      children: supabaseEntry.children,
      depth: supabaseEntry.depth,
      type: supabaseEntry.type,
      agent: supabaseEntry.agent,
      username: supabaseEntry.username,
      connections: supabaseEntry.connections,
      metrics: supabaseEntry.metrics,
      timestamp: supabaseEntry.timestamp,
      content: supabaseEntry.content,
      actions: supabaseEntry.actions,
      privacy: supabaseEntry.privacy,
      interactions: supabaseEntry.interactions,
      threads: supabaseEntry.threads,
      isAmplified: supabaseEntry.is_amplified,
      userId: supabaseEntry.user_id,
      title: supabaseEntry.title,
      resonance: supabaseEntry.resonance,
      coherence: supabaseEntry.coherence,
      tags: supabaseEntry.tags,
      response: supabaseEntry.response,
      entryType: supabaseEntry.entry_type as 'logbook' | 'dream'
    };
  }

  async createEntry(entry: Omit<StreamEntry, 'id'>): Promise<StreamEntry> {
    const supabaseEntry = this.streamEntryToSupabase(entry as StreamEntry);
    
    const { data, error } = await this.client
      .from('stream_entries')
      .insert([supabaseEntry])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating entry:', error);
      throw new Error(`Failed to create entry: ${error.message}`);
    }

    return this.supabaseToStreamEntry(data);
  }

  async getEntries(type: 'logbook' | 'dream', options: QueryOptions = {}): Promise<StreamEntry[]> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    let query = this.client
      .from('stream_entries')
      .select('*')
      .eq('entry_type', type);

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching entries:', error);
      throw new Error(`Failed to fetch entries: ${error.message}`);
    }

    const entries = (data || []).map(this.supabaseToStreamEntry);
    
    // Batch fetch interaction counts and update entries
    const entryIds = entries.map(e => e.id);
    if (entryIds.length > 0) {
      const interactionCounts = await this.getInteractionCounts(entryIds);
      
      // Update entries with latest interaction counts
      entries.forEach(entry => {
        const counts = interactionCounts.get(entry.id);
        if (counts) {
          entry.interactions = {
            resonances: counts.resonanceCount,
            branches: counts.branchCount,
            amplifications: counts.amplificationCount,
            shares: counts.shareCount
          };
        }
      });
    }

    return entries;
  }

  async getEntryById(id: string): Promise<StreamEntry | null> {
    const entryId = parseInt(id as any, 10);

    // Normalised string version for subsequent look-ups
    const idStr = String(id);

    const { data, error } = await this.client
      .from('stream_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('❌ Error fetching entry:', error);
      throw new Error(`Failed to fetch entry: ${error.message}`);
    }

    if (!data) return null;

    const entry = this.supabaseToStreamEntry(data);
    
    // Update with latest interaction counts
    const interactionCounts = await this.getInteractionCounts([idStr]);
    const counts = interactionCounts.get(idStr);
    if (counts) {
      entry.interactions = {
        resonances: counts.resonanceCount,
        branches: counts.branchCount,
        amplifications: counts.amplificationCount,
        shares: counts.shareCount
      };
    }

    return entry;
  }

  async updateEntry(id: string, updates: Partial<StreamEntry>): Promise<StreamEntry> {
    const supabaseUpdates = this.streamEntryToSupabase(updates as StreamEntry);
    
    const { data, error } = await this.client
      .from('stream_entries')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating entry:', error);
      throw new Error(`Failed to update entry: ${error.message}`);
    }

    return this.supabaseToStreamEntry(data);
  }

  async deleteEntry(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('stream_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting entry:', error);
      throw new Error(`Failed to delete entry: ${error.message}`);
    }

    return true;
  }

  // ========== NEW EFFICIENT INTERACTION METHODS ==========

  async toggleUserResonance(userId: string, entryId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.rpc('toggle_user_resonance', {
        target_user_id: userId,
        target_entry_id: entryId
      });

      if (error) {
        console.error('❌ Error toggling resonance:', error);
        throw new Error(`Failed to toggle resonance: ${error.message}`);
      }

      return data as boolean; // Returns true if now resonated, false if unresonated
    } catch (error) {
      console.error('❌ Error in toggleUserResonance:', error);
      throw error;
    }
  }

  async toggleUserAmplification(userId: string, entryId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.rpc('toggle_user_amplification', {
        target_user_id: userId,
        target_entry_id: entryId
      });

      if (error) {
        console.error('❌ Error toggling amplification:', error);
        throw new Error(`Failed to toggle amplification: ${error.message}`);
      }

      return data as boolean; // Returns true if now amplified, false if unamplified
    } catch (error) {
      console.error('❌ Error in toggleUserAmplification:', error);
      throw error;
    }
  }

  async createBranch(parentId: string, childId: string): Promise<void> {
    try {
      // 1) Create the branch relationship row (also fires branch_count_trigger)
      const { error } = await this.client.rpc('create_branch', {
        parent_id: parentId,
        child_id: childId
      });

      if (error) {
        console.error('❌ Error creating branch:', error);
        throw new Error(`Failed to create branch: ${error.message}`);
      }

      // ────────────────────────────────────────────────────────────
      // Fallback safety: if for any reason the trigger did NOT bump
      // the branch counter, detect it and increment manually once.
      // This avoids the previous double-increment bug while still
      // ensuring the count is correct when the trigger is missing.
      // ────────────────────────────────────────────────────────────
      try {
        const countsMap = await this.getInteractionCounts([String(parentId)]);
        const current = countsMap.get(String(parentId));
        const branchCount = current?.branchCount ?? 0;
        if (branchCount === 0) {
          await this.client.rpc('update_branch_count', {
            target_entry_id: parentId,
            delta: 1,
          });
        }
      } catch (countErr: any) {
        console.warn('⚠️  Branch count fallback check failed:', countErr?.message || countErr);
      }
    } catch (error) {
      console.error('❌ Error in createBranch:', error);
      throw error;
    }
  }

  async getInteractionCounts(entryIds: string[]): Promise<Map<string, InteractionCounts>> {
    try {
      const { data, error } = await this.client.rpc('get_interaction_counts', {
        entry_ids: entryIds
      });

      if (error) {
        console.error('❌ Error fetching interaction counts:', error);
        throw new Error(`Failed to fetch interaction counts: ${error.message}`);
      }

      const countsMap = new Map<string, InteractionCounts>();
      
      if (data) {
        data.forEach((row: any) => {
          countsMap.set(String(row.entry_id), {
            resonanceCount: row.resonance_count || 0,
            branchCount: row.branch_count || 0,
            amplificationCount: row.amplification_count || 0,
            shareCount: row.share_count || 0
          });
        });
      }

      return countsMap;
    } catch (error) {
      console.error('❌ Error in getInteractionCounts:', error);
      return new Map(); // Return empty map on error
    }
  }

  async getUserInteractionStates(userId: string, entryIds: string[]): Promise<Map<string, UserInteractionState>> {
    try {
      // Preferred path: call the RPC (requires the database function to exist)
      const { data, error } = await this.client.rpc('get_user_interaction_states', {
        target_user_id: userId,
        entry_ids: entryIds
      });

      if (!error && data) {
        const statesMap = new Map<string, UserInteractionState>();
        data.forEach((row: any) => {
          statesMap.set(String(row.entry_id), {
            hasResonated: row.has_resonated || false,
            hasAmplified: row.has_amplified || false
          });
        });
        return statesMap;
      }

      // ────────────────────────────────────────────────────────────
      // Fallback path: query individual tables if RPC is missing or
      // returns an error (e.g. not yet deployed to Supabase project).
      // This is less efficient but keeps the UI correct.
      // ────────────────────────────────────────────────────────────
      console.warn('ℹ️ Falling back to manual user interaction lookup');

      const [resonancesResp, amplificationsResp] = await Promise.all([
        this.client
          .from('user_resonances')
          .select('entry_id')
          .eq('user_id', userId)
          .in('entry_id', entryIds),
        this.client
          .from('user_amplifications')
          .select('entry_id')
          .eq('user_id', userId)
          .in('entry_id', entryIds)
      ]);

      if (resonancesResp.error) {
        console.error('❌ Error fetching resonances fallback:', resonancesResp.error);
      }
      if (amplificationsResp.error) {
        console.error('❌ Error fetching amplifications fallback:', amplificationsResp.error);
      }

      const resonatedIds = new Set<string>((resonancesResp.data || []).map(r => r.entry_id));
      const amplifiedIds = new Set<string>((amplificationsResp.data || []).map(r => r.entry_id));

      const statesMap = new Map<string, UserInteractionState>();
      entryIds.forEach(id => {
        statesMap.set(String(id), {
          hasResonated: resonatedIds.has(id),
          hasAmplified: amplifiedIds.has(id)
        });
      });

      return statesMap;
    } catch (error) {
      console.error('❌ Error in getUserInteractionStates:', error);
      return new Map(); // Return empty map on error
    }
  }

  // ========== BRANCH QUERY METHODS ==========

  async getBranchChildren(parentId: string): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from('entry_branches')
        .select('child_entry_id')
        .eq('parent_entry_id', parentId)
        .order('branch_order', { ascending: true });

      if (error) {
        console.error('❌ Error fetching branch children:', error);
        throw new Error(`Failed to fetch branch children: ${error.message}`);
      }

      return (data || []).map(row => String(row.child_entry_id));
    } catch (error) {
      console.error('❌ Error in getBranchChildren:', error);
      return [];
    }
  }

  async getBranchParent(childId: string): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from('entry_branches')
        .select('parent_entry_id')
        .eq('child_entry_id', childId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('❌ Error fetching branch parent:', error);
        throw new Error(`Failed to fetch branch parent: ${error.message}`);
      }

      return data ? String(data.parent_entry_id) : null;
    } catch (error) {
      console.error('❌ Error in getBranchParent:', error);
      return null;
    }
  }

  async getBranchTree(rootId: string, maxDepth: number = 10): Promise<BranchNode[]> {
    try {
      // Recursive CTE query to build tree structure
      const { data, error } = await this.client.rpc('get_branch_tree', {
        root_id: rootId,
        max_depth: maxDepth
      });

      if (error) {
        console.error('❌ Error fetching branch tree:', error);
        // Fallback to manual tree building if function doesn't exist
        return this.buildBranchTreeManually(rootId, maxDepth);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getBranchTree:', error);
      return this.buildBranchTreeManually(rootId, maxDepth);
    }
  }

  private async buildBranchTreeManually(rootId: string, maxDepth: number, currentDepth = 0): Promise<BranchNode[]> {
    if (currentDepth >= maxDepth) return [];

    const children = await this.getBranchChildren(rootId);
    const nodes: BranchNode[] = [];

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const childNodes = await this.buildBranchTreeManually(childId, maxDepth, currentDepth + 1);
      
      nodes.push({
        entryId: String(childId),
        parentId: String(rootId),
        depth: currentDepth + 1,
        branchOrder: i,
        children: childNodes
      });
    }

    return nodes;
  }

  // ========== LEGACY METHODS (for backward compatibility) ==========

  async addUserResonance(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_resonances')
      .insert([{
        user_id: userId,
        entry_id: entryId
      }]);

    if (error && error.code !== '23505') { // Ignore unique constraint violations
      console.error('❌ Error adding resonance:', error);
      throw new Error(`Failed to add resonance: ${error.message}`);
    }
  }

  async removeUserResonance(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_resonances')
      .delete()
      .eq('user_id', userId)
      .eq('entry_id', entryId);

    if (error) {
      console.error('❌ Error removing resonance:', error);
      throw new Error(`Failed to remove resonance: ${error.message}`);
    }
  }

  async getUserResonances(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_resonances')
      .select('entry_id')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error fetching user resonances:', error);
      throw new Error(`Failed to fetch user resonances: ${error.message}`);
    }

    // Convert to string to keep type consistency across the app
    return (data || []).map(row => String(row.entry_id));
  }

  async addUserAmplification(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_amplifications')
      .insert([{
        user_id: userId,
        entry_id: entryId
      }]);

    if (error && error.code !== '23505') { // Ignore unique constraint violations
      console.error('❌ Error adding amplification:', error);
      throw new Error(`Failed to add amplification: ${error.message}`);
    }
  }

  async removeUserAmplification(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_amplifications')
      .delete()
      .eq('user_id', userId)
      .eq('entry_id', entryId);

    if (error) {
      console.error('❌ Error removing amplification:', error);
      throw new Error(`Failed to remove amplification: ${error.message}`);
    }
  }

  async getUserAmplifications(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_amplifications')
      .select('entry_id')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error fetching user amplifications:', error);
      throw new Error(`Failed to fetch user amplifications: ${error.message}`);
    }

    // Convert to string to keep type consistency across the app
    return (data || []).map(row => String(row.entry_id));
  }

  async updateEntryInteractions(entryId: string, type: InteractionType, delta: number): Promise<void> {
    // Legacy method - now using atomic counter functions
    console.warn('⚠️ Using legacy updateEntryInteractions - consider migrating to new atomic methods');
    
    try {
      if (type === 'resonances') {
        await this.client.rpc('update_resonance_count', {
          target_entry_id: entryId,
          delta: delta
        });
      } else if (type === 'amplifications') {
        await this.client.rpc('update_amplification_count', {
          target_entry_id: entryId,
          delta: delta
        });
      } else if (type === 'branches') {
        await this.client.rpc('update_branch_count', {
          target_entry_id: entryId,
          delta: delta
        });
      }
    } catch (error) {
      console.error('❌ Error updating entry interactions:', error);
      throw new Error(`Failed to update entry interactions: ${error}`);
    }
  }

  // NEW: User management operations
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const userData = {
      username: user.username,
      email: user.email,
      name: user.name,
      bio: user.bio || 'New to the Nexus. Exploring the liminal spaces.',
      location: user.location || 'The Digital Realm',
      profile_image_url: user.profileImage,
      avatar: user.avatar,
      role: user.role || 'Explorer',
      stats: user.stats || { entries: 0, dreams: 0, connections: 0 }
    };

    const { data, error } = await this.client
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return this.supabaseToUser(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('❌ Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data ? this.supabaseToUser(data) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      // Use the new username mapping table for lookup
      const { data, error } = await this.client
        .from('username_mapping')
        .select(`
          user_id,
          users!inner (
            id,
            username,
            email,
            name,
            bio,
            location,
            profile_image_url,
            avatar,
            role,
            stats,
            follower_count,
            following_count,
            created_at,
            updated_at
          )
        `)
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching user by username:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      // Return null if no mapping found, or map the user data
      return data ? this.supabaseToUser(data.users) : null;
    } catch (error) {
      console.error('❌ Error in getUserByUsername:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.profileImage !== undefined) updateData.profile_image_url = updates.profileImage;
    if (updates.role) updateData.role = updates.role;
    if (updates.stats) updateData.stats = updates.stats;

    const { data, error } = await this.client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return this.supabaseToUser(data);
  }

  async updateUsername(userId: string, newUsername: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .rpc('update_username', {
          target_user_id: userId,
          new_username: newUsername
        });

      if (error) {
        console.error('❌ Error updating username:', error);
        if (error.message.includes('already exists')) {
          throw new Error('Username already taken');
        }
        throw new Error(`Failed to update username: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error in updateUsername:', error);
      throw error;
    }
  }

  async getCurrentUsername(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .rpc('get_username_by_user_id', {
          target_user_id: userId
        });

      if (error) {
        console.error('❌ Error getting current username:', error);
        return null;
      }

      // Ensure we return only a string or null
      if (typeof data === 'string') {
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error in getCurrentUsername:', error);
      return null;
    }
  }

  async getUserPosts(userId: string, limit: number = 50): Promise<StreamEntry[]> {
    const { data, error } = await this.client
      .from('stream_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching user posts:', error);
      throw new Error(`Failed to fetch user posts: ${error.message}`);
    }

    const entries = (data || []).map(this.supabaseToStreamEntry);
    
    // Batch fetch interaction counts and update entries
    const entryIds = entries.map(e => e.id);
    if (entryIds.length > 0) {
      const interactionCounts = await this.getInteractionCounts(entryIds);
      
      entries.forEach(entry => {
        const counts = interactionCounts.get(entry.id);
        if (counts) {
          entry.interactions = {
            resonances: counts.resonanceCount,
            branches: counts.branchCount,
            amplifications: counts.amplificationCount,
            shares: counts.shareCount
          };
        }
      });
    }

    return entries;
  }

  async getUserPostsByUsername(username: string, limit: number = 50): Promise<StreamEntry[]> {
    try {
      // First get the user to get their ID
      const user = await this.getUserByUsername(username);
      if (!user) {
        console.log(`👤 User ${username} not found`);
        return [];
      }

      // Then get their posts using their ID
      return await this.getUserPosts(user.id, limit);
    } catch (error) {
      console.error('❌ Error fetching user posts by username:', error);
      return [];
    }
  }

  // Helper method to convert Supabase user to our User type
  private supabaseToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      username: supabaseUser.username,
      name: supabaseUser.name,
      email: supabaseUser.email,
      userType: supabaseUser.user_type || 'human', // Default to 'human' if not specified
      role: supabaseUser.role,
      avatar: supabaseUser.avatar,
      profileImage: supabaseUser.profile_image_url,
      bio: supabaseUser.bio,
      location: supabaseUser.location,
      stats: {
        ...(supabaseUser.stats || { entries: 0, dreams: 0, connections: 0 }),
        connections: supabaseUser.follower_count ?? 0
      },
      followerCount: supabaseUser.follower_count || 0,
      followingCount: supabaseUser.following_count || 0,
      createdAt: supabaseUser.created_at
    };
  }

  // === FOLLOW SYSTEM METHODS ===

  async followUser(followerId: string, followedId: string): Promise<boolean> {
    const { data, error } = await this.client
      .rpc('follow_user', {
        follower_user_id: followerId,
        followed_user_id: followedId
      });

    if (error) {
      console.error('❌ Error following user:', error);
      if (error.message.includes('cannot follow themselves')) {
        throw new Error('Users cannot follow themselves');
      }
      throw new Error(`Failed to follow user: ${error.message}`);
    }

    return true;
  }

  async unfollowUser(followerId: string, followedId: string): Promise<boolean> {
    const { data, error } = await this.client
      .rpc('unfollow_user', {
        follower_user_id: followerId,
        followed_user_id: followedId
      });

    if (error) {
      console.error('❌ Error unfollowing user:', error);
      throw new Error(`Failed to unfollow user: ${error.message}`);
    }

    return true;
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const { data, error } = await this.client
      .rpc('is_following', {
        follower_user_id: followerId,
        followed_user_id: followedId
      });

    if (error) {
      console.error('❌ Error checking follow status:', error);
      return false;
    }

    return data || false;
  }

  async getFollowers(userId: string, limit: number = 50, offset: number = 0): Promise<FollowRelationship[]> {
    const { data, error } = await this.client
      .rpc('get_user_followers', {
        target_user_id: userId,
        page_limit: limit,
        page_offset: offset
      });

    if (error) {
      console.error('❌ Error fetching followers:', error);
      throw new Error(`Failed to fetch followers: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      user: this.supabaseToUser(row.follower_data),
      followedAt: row.followed_at
    }));
  }

  async getFollowing(userId: string, limit: number = 50, offset: number = 0): Promise<FollowRelationship[]> {
    const { data, error } = await this.client
      .rpc('get_user_following', {
        target_user_id: userId,
        page_limit: limit,
        page_offset: offset
      });

    if (error) {
      console.error('❌ Error fetching following:', error);
      throw new Error(`Failed to fetch following: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      user: this.supabaseToUser(row.followed_data),
      followedAt: row.followed_at
    }));
  }

  async getMutualFollows(userId: string, limit: number = 50): Promise<User[]> {
    const { data, error } = await this.client
      .rpc('get_mutual_follows', {
        user_id: userId,
        page_limit: limit
      });

    if (error) {
      console.error('❌ Error fetching mutual follows:', error);
      throw new Error(`Failed to fetch mutual follows: ${error.message}`);
    }

    return (data || []).map((row: any) => this.supabaseToUser(row.mutual_user_data));
  }

  async getFollowSuggestions(userId: string, limit: number = 10): Promise<FollowSuggestion[]> {
    const { data, error } = await this.client
      .rpc('get_follow_suggestions', {
        user_id: userId,
        page_limit: limit
      });

    if (error) {
      console.error('❌ Error fetching follow suggestions:', error);
      throw new Error(`Failed to fetch follow suggestions: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      user: this.supabaseToUser(row.suggested_user_data),
      mutualConnections: row.mutual_connections
    }));
  }

  async bulkCheckFollowing(followerId: string, userIds: string[]): Promise<Map<string, boolean>> {
    try {
      const { data, error } = await this.client.rpc('bulk_check_following', {
        follower_user_id: followerId,
        target_user_ids: userIds
      });

      if (error) throw error;

      const result = new Map<string, boolean>();
      if (data) {
        data.forEach((item: { user_id: string; is_following: boolean }) => {
          result.set(item.user_id, item.is_following);
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to bulk check following status:', error);
      return new Map(); // Return empty map on error
    }
  }

  // Alias methods to match interface requirements
  async getUser(id: string): Promise<User | null> {
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete user:', error);
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
      throw error;
    }
  }

  async createStreamEntry(entry: Omit<StreamEntry, 'id'>): Promise<StreamEntry> {
    return this.createEntry(entry);
  }

  async getStreamEntry(id: string): Promise<StreamEntry | null> {
    return this.getEntryById(id);
  }
}
