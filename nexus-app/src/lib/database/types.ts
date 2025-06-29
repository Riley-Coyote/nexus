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
  
  // User interactions
  addUserResonance(userId: string, entryId: string): Promise<void>;
  removeUserResonance(userId: string, entryId: string): Promise<void>;
  getUserResonances(userId: string): Promise<string[]>;
  
  addUserAmplification(userId: string, entryId: string): Promise<void>;
  removeUserAmplification(userId: string, entryId: string): Promise<void>;
  getUserAmplifications(userId: string): Promise<string[]>;
  
  // Entry interactions
  updateEntryInteractions(entryId: string, type: InteractionType, delta: number): Promise<void>;
  
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

export interface SupabaseUserInteraction {
  id: string;
  user_id: string;
  entry_id: string;
  interaction_type: 'resonance' | 'amplification';
  created_at: string;
} 