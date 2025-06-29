import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StreamEntry } from '../types';
import { 
  DatabaseProvider, 
  QueryOptions, 
  InteractionType, 
  SupabaseStreamEntry, 
  SupabaseUserInteraction 
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

    return (data || []).map(this.supabaseToStreamEntry);
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

    return data ? this.supabaseToStreamEntry(data) : null;
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

  async addUserResonance(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_interactions')
      .insert([{
        user_id: userId,
        entry_id: entryId,
        interaction_type: 'resonance'
      }]);

    if (error) {
      console.error('❌ Error adding resonance:', error);
      throw new Error(`Failed to add resonance: ${error.message}`);
    }
  }

  async removeUserResonance(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .eq('interaction_type', 'resonance');

    if (error) {
      console.error('❌ Error removing resonance:', error);
      throw new Error(`Failed to remove resonance: ${error.message}`);
    }
  }

  async getUserResonances(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_interactions')
      .select('entry_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'resonance');

    if (error) {
      console.error('❌ Error fetching user resonances:', error);
      throw new Error(`Failed to fetch user resonances: ${error.message}`);
    }

    return (data || []).map(row => row.entry_id);
  }

  async addUserAmplification(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_interactions')
      .insert([{
        user_id: userId,
        entry_id: entryId,
        interaction_type: 'amplification'
      }]);

    if (error) {
      console.error('❌ Error adding amplification:', error);
      throw new Error(`Failed to add amplification: ${error.message}`);
    }
  }

  async removeUserAmplification(userId: string, entryId: string): Promise<void> {
    const { error } = await this.client
      .from('user_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .eq('interaction_type', 'amplification');

    if (error) {
      console.error('❌ Error removing amplification:', error);
      throw new Error(`Failed to remove amplification: ${error.message}`);
    }
  }

  async getUserAmplifications(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_interactions')
      .select('entry_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'amplification');

    if (error) {
      console.error('❌ Error fetching user amplifications:', error);
      throw new Error(`Failed to fetch user amplifications: ${error.message}`);
    }

    return (data || []).map(row => row.entry_id);
  }

  async updateEntryInteractions(entryId: string, type: InteractionType, delta: number): Promise<void> {
    // Get current interactions
    const { data: entry, error: fetchError } = await this.client
      .from('stream_entries')
      .select('interactions')
      .eq('id', entryId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching entry for interaction update:', fetchError);
      throw new Error(`Failed to fetch entry: ${fetchError.message}`);
    }

    // Update interactions
    const newInteractions = { ...entry.interactions };
    newInteractions[type] = Math.max(0, newInteractions[type] + delta);

    const { error: updateError } = await this.client
      .from('stream_entries')
      .update({ interactions: newInteractions })
      .eq('id', entryId);

    if (updateError) {
      console.error('❌ Error updating entry interactions:', updateError);
      throw new Error(`Failed to update interactions: ${updateError.message}`);
    }
  }
} 