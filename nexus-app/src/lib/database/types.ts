import { StreamEntry, User } from '../types';

// Database abstraction interface - allows switching between Supabase, PostgreSQL, MySQL, etc.
export interface DatabaseProvider {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Stream entries
  createEntry(entry: Omit<StreamEntry, 'id'>): Promise<StreamEntry>;
  getEntries(type: 'logbook' | 'dream', options?: QueryOptions): Promise<StreamEntry[]>;
  getEntryById(id: string): Promise<StreamEntry | null>;
  updateEntry(id: string, updates: Partial<StreamEntry>): Promise<StreamEntry>;
  deleteEntry(id: string): Promise<boolean>;
  
  // Efficient interaction methods
  toggleUserResonance(userId: string, entryId: string): Promise<boolean>; // Returns new state
  toggleUserAmplification(userId: string, entryId: string): Promise<boolean>; // Returns new state
  createBranch(parentId: string, childId: string): Promise<void>;
  
  // Batch interaction data retrieval (optimized)
  getInteractionCounts(entryIds: string[]): Promise<Map<string, InteractionCounts>>;
  getUserInteractionStates(userId: string, entryIds: string[]): Promise<Map<string, UserInteractionState>>;
  
  // User interactions (legacy - keeping for compatibility)
  addUserResonance(userId: string, entryId: string): Promise<void>;
  removeUserResonance(userId: string, entryId: string): Promise<void>;
  getUserResonances(userId: string): Promise<string[]>;
  
  addUserAmplification(userId: string, entryId: string): Promise<void>;
  removeUserAmplification(userId: string, entryId: string): Promise<void>;
  getUserAmplifications(userId: string): Promise<string[]>;
  
  // Entry interactions (legacy)
  updateEntryInteractions(entryId: string, type: InteractionType, delta: number): Promise<void>;
  
  // Branch queries
  getBranchChildren(parentId: string): Promise<string[]>;
  getBranchParent(childId: string): Promise<string | null>;
  getBranchTree(rootId: string, maxDepth?: number): Promise<BranchNode[]>;
  
  // Users (if we want to store users in DB later)
  createUser?(user: Omit<User, 'id'>): Promise<User>;
  getUserById?(id: string): Promise<User | null>;
  updateUser?(id: string, updates: Partial<User>): Promise<User>;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export type InteractionType = 'resonances' | 'branches' | 'amplifications' | 'shares';

// New efficient interaction types
export interface InteractionCounts {
  resonanceCount: number;
  branchCount: number;
  amplificationCount: number;
  shareCount: number;
}

export interface UserInteractionState {
  hasResonated: boolean;
  hasAmplified: boolean;
}

export interface BranchNode {
  entryId: string;
  parentId: string | null;
  depth: number;
  branchOrder: number;
  children: BranchNode[];
}

export interface DatabaseConfig {
  provider: 'supabase' | 'postgresql' | 'mysql' | 'sqlite' | 'mock';
  connectionString?: string;
  options?: Record<string, any>;
}

// Supabase specific types
export interface SupabaseStreamEntry {
  id: string;
  parent_id: string | null;
  children: string[];
  depth: number;
  type: string;
  agent: string;
  connections: number;
  metrics: { c: number; r: number; x: number };
  timestamp: string;
  content: string;
  actions: string[];
  privacy: string;
  interactions: {
    resonances: number;
    branches: number;
    amplifications: number;
    shares: number;
  };
  threads: any[];
  is_amplified: boolean;
  user_id: string;
  title?: string;
  resonance?: number;
  coherence?: number;
  tags?: string[];
  response?: {
    agent: string;
    timestamp: string;
    content: string;
  };
  created_at: string;
  updated_at: string;
}

// New Supabase types for efficient interactions
export interface SupabaseInteractionCounts {
  entry_id: string;
  resonance_count: number;
  branch_count: number;
  amplification_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUserResonance {
  id: string;
  user_id: string;
  entry_id: string;
  created_at: string;
}

export interface SupabaseUserAmplification {
  id: string;
  user_id: string;
  entry_id: string;
  created_at: string;
}

export interface SupabaseEntryBranch {
  id: string;
  parent_entry_id: string;
  child_entry_id: string;
  branch_order: number;
  created_at: string;
}

// Legacy type for backward compatibility
export interface SupabaseUserInteraction {
  id: string;
  user_id: string;
  entry_id: string;
  interaction_type: 'resonance' | 'amplification';
  created_at: string;
} 