import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StreamEntry } from '../types';
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
  SupabaseEntryBranch
} from './types';

export class SupabaseProvider implements DatabaseProvider {
  private client: SupabaseClient;
  private isConnected = false;

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string
  ) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple query
      const { error } = await this.client.from('stream_entries').select('count').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      this.isConnected = true;
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
      parent_id: entry.parentId,
      children: entry.children,
      depth: entry.depth,
      type: entry.type,
      agent: entry.agent,
      connections: entry.connections || 0,
      metrics: entry.metrics || { c: 0.5, r: 0.5, x: 0.5 },
      timestamp: entry.timestamp,
      content: entry.content,
      actions: entry.actions,
      privacy: entry.privacy,
      interactions: entry.interactions,
      threads: entry.threads,
      is_amplified: entry.isAmplified,
      user_id: entry.userId || '',
      title: entry.title,
      resonance: entry.resonance,
      coherence: entry.coherence,
      tags: entry.tags,
      response: entry.response
    };
  }

  private supabaseToStreamEntry(supabaseEntry: SupabaseStreamEntry): StreamEntry {
    return {
      id: supabaseEntry.id,
      parentId: supabaseEntry.parent_id,
      children: supabaseEntry.children,
      depth: supabaseEntry.depth,
      type: supabaseEntry.type,
      agent: supabaseEntry.agent,
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
      response: supabaseEntry.response
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
      .select('*');

    // Filter by type
    if (type === 'logbook') {
      query = query.not('type', 'ilike', '%dream%').not('type', 'ilike', '%lucid%');
    } else {
      query = query.or('type.ilike.%dream%,type.ilike.%lucid%');
    }

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
    const { data, error } = await this.client
      .from('stream_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('❌ Error fetching entry:', error);
      throw new Error(`Failed to fetch entry: ${error.message}`);
    }

    if (!data) return null;

    const entry = this.supabaseToStreamEntry(data);
    
    // Update with latest interaction counts
    const interactionCounts = await this.getInteractionCounts([id]);
    const counts = interactionCounts.get(id);
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
      const { error } = await this.client.rpc('create_branch', {
        parent_id: parentId,
        child_id: childId
      });

      if (error) {
        console.error('❌ Error creating branch:', error);
        throw new Error(`Failed to create branch: ${error.message}`);
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
          countsMap.set(row.entry_id, {
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
      const { data, error } = await this.client.rpc('get_user_interaction_states', {
        target_user_id: userId,
        entry_ids: entryIds
      });

      if (error) {
        console.error('❌ Error fetching user interaction states:', error);
        throw new Error(`Failed to fetch user interaction states: ${error.message}`);
      }

      const statesMap = new Map<string, UserInteractionState>();
      
      if (data) {
        data.forEach((row: any) => {
          statesMap.set(row.entry_id, {
            hasResonated: row.has_resonated || false,
            hasAmplified: row.has_amplified || false
          });
        });
      }

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

      return (data || []).map(row => row.child_entry_id);
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

      return data?.parent_entry_id || null;
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
        entryId: childId,
        parentId: rootId,
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

    return (data || []).map(row => row.entry_id);
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

    return (data || []).map(row => row.entry_id);
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
} 