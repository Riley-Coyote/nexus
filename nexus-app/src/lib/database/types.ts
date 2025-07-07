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
  getEntriesByIds(entryIds: string[]): Promise<StreamEntry[]>;
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
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Stream entries
  createStreamEntry(entry: Omit<StreamEntry, 'id'>): Promise<StreamEntry>;
  getStreamEntry(id: string): Promise<StreamEntry | null>;
  getUserPosts(userId: string, limit?: number): Promise<StreamEntry[]>;
  getUserPostsByUsername(username: string, limit?: number): Promise<StreamEntry[]>;
  
  // Follow system
  followUser?(followerId: string, followedId: string): Promise<boolean>;
  unfollowUser?(followerId: string, followedId: string): Promise<boolean>;
  isFollowing?(followerId: string, followedId: string): Promise<boolean>;
  getFollowers?(userId: string, limit?: number, offset?: number): Promise<FollowRelationship[]>;
  getFollowing?(userId: string, limit?: number, offset?: number): Promise<FollowRelationship[]>;
  getMutualFollows?(userId: string, limit?: number): Promise<User[]>;
  getFollowSuggestions?(userId: string, limit?: number): Promise<FollowSuggestion[]>;
  bulkCheckFollowing?(followerId: string, userIds: string[]): Promise<Map<string, boolean>>;
  
  // New username management methods
  updateUsername?(userId: string, newUsername: string): Promise<boolean>;
  getCurrentUsername?(userId: string): Promise<string | null>;
  
  // Resonated entries in one shot (optimized view)
  getResonatedEntries?(userId: string, options?: { page?: number; limit?: number }): Promise<StreamEntry[]>;
  
  // OPTIMIZED: Get entries with user interaction states in a single query (legacy signature)
  getEntriesWithUserStates?(
    entryType: 'logbook' | 'dream' | null,
    userId: string | null,
    targetUserId: string | null,
    options?: QueryOptions
  ): Promise<StreamEntryWithUserStates[]>;

  // UNIVERSAL: Flexible method for all page types
  getEntriesWithUserStatesFlexible?(options?: {
    entryType?: string;
    userIdFilter?: string;
    privacyFilter?: 'public' | 'private' | null;
    targetUserId?: string;
    userHasResonated?: boolean;
    userHasAmplified?: boolean;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  // CONVENIENCE METHODS for each page type
  getFeedEntries?(options?: {
    entryType?: string;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  getProfileEntries?(profileUserId: string, options?: {
    entryType?: string;
    targetUserId?: string;
    includePrivate?: boolean;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  getLogbookEntries?(userId: string, options?: {
    privacyFilter?: 'public' | 'private' | null;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  getDreamEntries?(userId: string, options?: {
    privacyFilter?: 'public' | 'private' | null;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  getResonanceFieldEntries?(userId: string, options?: {
    entryType?: string;
    privacyFilter?: 'public' | 'private' | null;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;

  getAmplifiedEntries?(userId: string, options?: {
    entryType?: string;
    privacyFilter?: 'public' | 'private' | null;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StreamEntryWithUserStates[]>;
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

// Extended StreamEntry with user interaction states and interaction counts for optimized queries
export interface StreamEntryWithUserStates extends StreamEntry {
  resonance_count: number;
  branch_count: number;
  amplification_count: number;
  share_count: number;
  has_resonated: boolean;
  has_amplified: boolean;
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
  username: string;
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
  entry_type: 'logbook' | 'dream';
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

// Follow system types
export interface FollowRelationship {
  user: User;
  followedAt: string;
}

export interface FollowSuggestion {
  user: User;
  mutualConnections: number;
}

export interface SupabaseUserFollow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
} 