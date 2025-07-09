import { 
  StreamEntry, 
  Post,
  LogbookState, 
  NetworkStatus, 
  SystemVital, 
  ActiveAgent,
  EntryComposerData,
  DreamStateMetrics,
  ActiveDreamer,
  DreamAnalytics,
  DreamPatterns,
  User,
  JournalMode
} from '../types';
import { getCurrentUser } from '../auth/AuthContext';
import { userInteractionService } from './userInteractionService';
import { supabase } from '../supabase';
import { StreamEntryData } from '../types';
import { DatabaseFactory } from '../database/factory';
import { DatabaseProvider, InteractionCounts, UserInteractionState } from '../database/types';
import {
  mockEntryComposer,
  mockDreamPatterns,
  mockDreamComposer,
  mockLogbookField,
  mockEmergingSymbols
} from '../data/mockData';

// Database-only mode - all calls use real database connection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Threading configuration
const THREADING_CONFIG = {
  // 'dfs' = Depth-First (traditional forum style - follow conversations deep)
  // 'bfs' = Breadth-First (show conversation width before depth)
  // 'adaptive' = Automatically choose best algorithm based on conversation shape
  mode: (process.env.NEXT_PUBLIC_THREADING_MODE as 'dfs' | 'bfs' | 'adaptive') || 'dfs',
  enableStats: process.env.NODE_ENV === 'development', // Only log stats in dev
  maxDepth: parseInt(process.env.NEXT_PUBLIC_MAX_THREAD_DEPTH || '100'),
  maxEntries: parseInt(process.env.NEXT_PUBLIC_MAX_THREAD_ENTRIES || '10000'),
};

// Using mock users from mockData.ts for consistency

// Utility function to convert StreamEntry to StreamEntryData
export const convertToStreamEntryData = (entry: StreamEntry): StreamEntryData => ({
  id: entry.id,
  parentId: entry.parentId,
  depth: entry.depth,
  type: entry.type,
  username: entry.username,
  connections: entry.connections,
  metrics: entry.metrics,
  timestamp: entry.timestamp,
  content: entry.content,
  interactions: entry.interactions,
  isAmplified: entry.isAmplified,
  privacy: entry.privacy,
  title: entry.title,
  resonance: entry.resonance,
  coherence: entry.coherence,
  tags: entry.tags,
  response: entry.response,
});

// Format timestamp to match existing mock data format
const formatTimestamp = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

interface PostWithUserStates {
  id: string;
  type: string;
  agent: string;
  content: string;
  timestamp: string;
  privacy: 'public' | 'private';
  username?: string;
  userId?: string;
  title?: string;
  entryType?: 'logbook' | 'dream';
  interactions: {
    resonances: number;
    branches: number;
    amplifications: number;
    shares: number;
  };
  userHasResonated?: boolean;
  userHasAmplified?: boolean;
}

export class DataService {
  
  // Database provider for persistent storage
  private database: DatabaseProvider | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null; // NEW: Prevent race conditions

  // Cache for efficient batch operations
  private interactionCountsCache: Map<string, InteractionCounts> = new Map();
  private userInteractionStatesCache: Map<string, Map<string, UserInteractionState>> = new Map();
  private entryCache: Map<string, { entry: StreamEntry; timestamp: number }> = new Map(); // NEW: Entry cache
  private userInteractionStateTimestamps: Map<string, number> = new Map(); // NEW: Track when user states were last fetched
  private cacheExpiry = 30000; // 30 seconds
  private entryCacheExpiry = 60000; // 1 minute for entries
  private lastCacheUpdate = 0;

  constructor() {
    // Initialize data will be called lazily when first method is accessed
  }

  private async initializeData(): Promise<void> {
    // FIXED: Prevent race conditions with concurrent calls
    if (this.isInitialized) return;
    
    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Start initialization
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Initialize database connection
      this.database = DatabaseFactory.getInstance();
      await this.database.connect();
      console.log('✅ Database connected successfully');
      console.log('🗄️ Data Source: Supabase Database (Production Mode)');
      console.log('🚀 Features: Atomic operations, batch fetching, proper branching');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize data service:', error);
      this.initializationPromise = null; // Reset on failure to allow retry
      throw error; // Don't fall back to mock mode - fail fast
    }
  }

  // ========== ADVANCED THREADING UTILITIES ==========

  // Build threaded conversation tree with optimal performance
  private buildThreadedEntries(entries: StreamEntry[], mode?: 'dfs' | 'bfs'): StreamEntry[] {
    if (entries.length === 0) return [];
    
    const startTime = performance.now();
    
    // Performance safeguards
    if (entries.length > THREADING_CONFIG.maxEntries) {
      console.warn(`⚠️ Large dataset detected (${entries.length} entries). Consider pagination.`);
    }
    
    // Determine threading mode (adaptive, explicit, or default)
    let selectedMode: 'dfs' | 'bfs';
    if (mode) {
      selectedMode = mode; // Explicit mode override
    } else if (THREADING_CONFIG.mode === 'adaptive') {
      selectedMode = this.getOptimalThreadingMode(entries);
    } else {
      selectedMode = THREADING_CONFIG.mode as 'dfs' | 'bfs';
    }
    
    // Build efficient lookup structures
    const entryMap = new Map<string, StreamEntry>();
    const childrenMap = new Map<string, string[]>();
    const rootIds: string[] = [];
    
    // Single pass: build all relationships
    entries.forEach(entry => {
      // Store original entry (avoid unnecessary copying)
      entryMap.set(entry.id, entry);
      
      if (!entry.parentId) {
        rootIds.push(entry.id);
      } else {
        // Build parent → children mapping
        if (!childrenMap.has(entry.parentId)) {
          childrenMap.set(entry.parentId, []);
        }
        childrenMap.get(entry.parentId)!.push(entry.id);
      }
    });
    
    // Choose traversal strategy
    const result = selectedMode === 'bfs' 
      ? this.buildThreadedBFS(entryMap, childrenMap, rootIds, THREADING_CONFIG.maxDepth)
      : this.buildThreadedDFS(entryMap, childrenMap, rootIds, THREADING_CONFIG.maxDepth);
    
    // Performance monitoring and stats logging
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (THREADING_CONFIG.enableStats) {
      const stats = this.getThreadingStats(result);
      const modeLabel = mode ? `${mode.toUpperCase()}` : `${selectedMode.toUpperCase()}${THREADING_CONFIG.mode === 'adaptive' ? ' (auto)' : ''}`;
      // console.log(`🧵 Threading Performance [${modeLabel}]:`, {
      //   duration: `${duration.toFixed(2)}ms`,
      //   entriesProcessed: entries.length,
      //   resultEntries: result.length,
      //   ...stats
      // });
    }
    
    return result;
  }

  // Depth-First Search (traditional forum threading)
  private buildThreadedDFS(
    entryMap: Map<string, StreamEntry>, 
    childrenMap: Map<string, string[]>, 
    rootIds: string[], 
    maxDepth: number
  ): StreamEntry[] {
    const result: StreamEntry[] = [];
    const visited = new Set<string>(); // Cycle detection
    
    // Iterative DFS to avoid stack overflow
    const stack: Array<{ entryId: string; depth: number }> = [];
    
    // Start with roots (newest first for better UX)
    const sortedRoots = [...rootIds].sort((a, b) => {
      const entryA = entryMap.get(a);
      const entryB = entryMap.get(b);
      if (!entryA || !entryB) return 0;
      return new Date(entryB.timestamp).getTime() - new Date(entryA.timestamp).getTime();
    });
    
    sortedRoots.reverse().forEach(rootId => {
      stack.push({ entryId: rootId, depth: 0 });
    });
    
    while (stack.length > 0) {
      const { entryId, depth } = stack.pop()!;
      
      // Cycle detection
      if (visited.has(entryId)) {
        // console.warn(`🔄 Cycle detected at entry ${entryId}, skipping...`);
        continue;
      }
      
      // Depth limit protection
      if (depth > maxDepth) {
        // console.warn(`📏 Max depth (${maxDepth}) reached at entry ${entryId}, truncating...`);
        continue;
      }
      
      const entry = entryMap.get(entryId);
      if (!entry) continue;
      
      visited.add(entryId);
      
      // Add to result with depth
      result.push({
        ...entry,
        depth,
        children: childrenMap.get(entryId) || []
      });
      
      // Add children to stack (reverse order for DFS)
      const children = childrenMap.get(entryId) || [];
      const sortedChildren = [...children].sort((a, b) => {
        const entryA = entryMap.get(a);
        const entryB = entryMap.get(b);
        if (!entryA || !entryB) return 0;
        return new Date(entryA.timestamp).getTime() - new Date(entryB.timestamp).getTime();
      });
      
      sortedChildren.reverse().forEach(childId => {
        if (!visited.has(childId)) {
          stack.push({ entryId: childId, depth: depth + 1 });
        }
      });
    }
    
    return result;
  }

  // Breadth-First Search (shows conversation width before depth)
  private buildThreadedBFS(
    entryMap: Map<string, StreamEntry>, 
    childrenMap: Map<string, string[]>, 
    rootIds: string[], 
    maxDepth: number
  ): StreamEntry[] {
    const result: StreamEntry[] = [];
    const visited = new Set<string>();
    
    // BFS queue
    const queue: Array<{ entryId: string; depth: number }> = [];
    
    // Start with roots (newest first)
    const sortedRoots = [...rootIds].sort((a, b) => {
      const entryA = entryMap.get(a);
      const entryB = entryMap.get(b);
      if (!entryA || !entryB) return 0;
      return new Date(entryB.timestamp).getTime() - new Date(entryA.timestamp).getTime();
    });
    
    sortedRoots.forEach(rootId => {
      queue.push({ entryId: rootId, depth: 0 });
    });
    
    while (queue.length > 0) {
      const { entryId, depth } = queue.shift()!;
      
      // Cycle detection
      if (visited.has(entryId)) continue;
      
      // Depth limit protection
      if (depth > maxDepth) continue;
      
      const entry = entryMap.get(entryId);
      if (!entry) continue;
      
      visited.add(entryId);
      
      // Add to result with depth
      result.push({
        ...entry,
        depth,
        children: childrenMap.get(entryId) || []
      });
      
      // Add children to queue (preserve chronological order)
      const children = childrenMap.get(entryId) || [];
      const sortedChildren = [...children].sort((a, b) => {
        const entryA = entryMap.get(a);
        const entryB = entryMap.get(b);
        if (!entryA || !entryB) return 0;
        return new Date(entryA.timestamp).getTime() - new Date(entryB.timestamp).getTime();
      });
      
      sortedChildren.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ entryId: childId, depth: depth + 1 });
        }
      });
    }
    
    return result;
  }

  // Get conversation stats for debugging/optimization
  private getThreadingStats(entries: StreamEntry[]): {
    totalEntries: number;
    maxDepth: number;
    rootCount: number;
    avgChildrenPerEntry: number;
    deepestThreads: Array<{ entryId: string; depth: number }>;
  } {
    const childrenMap = new Map<string, string[]>();
    let maxDepth = 0;
    let rootCount = 0;
    
    entries.forEach(entry => {
      if (!entry.parentId) {
        rootCount++;
      } else {
        if (!childrenMap.has(entry.parentId)) {
          childrenMap.set(entry.parentId, []);
        }
        childrenMap.get(entry.parentId)!.push(entry.id);
      }
      
      if (entry.depth && entry.depth > maxDepth) {
        maxDepth = entry.depth;
      }
    });
    
    const totalChildren = Array.from(childrenMap.values()).reduce((sum, children) => sum + children.length, 0);
    const avgChildrenPerEntry = childrenMap.size > 0 ? totalChildren / childrenMap.size : 0;
    
    const deepestThreads = entries
      .filter(e => e.depth && e.depth > 5)
      .sort((a, b) => (b.depth || 0) - (a.depth || 0))
      .slice(0, 5)
      .map(e => ({ entryId: e.id, depth: e.depth || 0 }));
    
    return {
      totalEntries: entries.length,
      maxDepth,
      rootCount,
      avgChildrenPerEntry: Math.round(avgChildrenPerEntry * 100) / 100,
      deepestThreads
    };
  }

  // ========== EFFICIENT INTERACTION CACHE MANAGEMENT ==========

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  private isEntryCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.entryCacheExpiry;
  }

  // Clean up expired cache entries to prevent memory leaks
  private cleanupExpiredCaches(): void {
    const now = Date.now();
    
    // Clean up entry cache
    this.entryCache.forEach((cacheEntry, entryId) => {
      if (!this.isEntryCacheValid(cacheEntry.timestamp)) {
        this.entryCache.delete(entryId);
      }
    });
    
    // Clean up interaction counts cache
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      this.interactionCountsCache.clear();
    }
    
    // Clean up user interaction states cache and timestamps
    this.userInteractionStatesCache.forEach((userStates, userId) => {
      const lastFetch = this.userInteractionStateTimestamps.get(userId);
      if (userStates.size === 0 || (lastFetch && now - lastFetch > this.cacheExpiry)) {
        this.userInteractionStatesCache.delete(userId);
        this.userInteractionStateTimestamps.delete(userId);
      }
    });
  }

  // NEW: Batch fetch entries by IDs - TRULY OPTIMIZED
  private async batchFetchEntries(entryIds: string[]): Promise<StreamEntry[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    if (entryIds.length === 0) {
      return [];
    }

    // Check cache first
    const cached: StreamEntry[] = [];
    const missing: string[] = [];
    
    entryIds.forEach(id => {
      const cacheEntry = this.entryCache.get(id);
      if (cacheEntry && this.isEntryCacheValid(cacheEntry.timestamp)) {
        cached.push(cacheEntry.entry);
      } else {
        missing.push(id);
      }
    });

    // Fetch missing entries in a SINGLE batch query
    let fetchedEntries: StreamEntry[] = [];
    if (missing.length > 0) {
      try {
        console.log(`⚡ BATCH FETCHING ${missing.length} entries in single query`);
        // Use new batch method instead of individual calls
        fetchedEntries = await this.database.getEntriesByIds(missing);

        // Cache the fetched entries
        const now = Date.now();
        fetchedEntries.forEach(entry => {
          this.entryCache.set(entry.id, { entry, timestamp: now });
        });

        console.log(`✅ Successfully batch fetched ${fetchedEntries.length} entries`);
      } catch (error) {
        console.error('❌ Error in batch fetch entries:', error);
      }
    }

    return [...cached, ...fetchedEntries];
  }

  private async refreshInteractionCache(entryIds: string[], userId?: string): Promise<void> {
    if (!this.database || !this.database.getInteractionCounts) return;

    try {
      // Batch fetch interaction counts
      const interactionCounts = await this.database.getInteractionCounts(entryIds);
      
      // Update cache
      interactionCounts.forEach((counts, entryId) => {
        this.interactionCountsCache.set(entryId, counts);
      });

      // Batch fetch user interaction states if user provided
      if (userId) {
        const userStates = await this.database.getUserInteractionStates(userId, entryIds);
        this.userInteractionStatesCache.set(userId, userStates);
      }

      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('❌ Error refreshing interaction cache:', error);
    }
  }

  private async enrichEntriesWithInteractions(entries: StreamEntry[], userId?: string): Promise<StreamEntry[]> {
    // OPTIMIZATION: Database entries now come with interaction counts pre-loaded via JOIN
    // Skip the enrichment step for better performance
    console.log(`⚡ Skipping interaction enrichment - entries already include interaction counts from JOIN`);
    return entries;
  }

  private async enrichEntriesWithUserContext(entries: StreamEntry[], userId?: string): Promise<StreamEntry[]> {
    if (!userId) {
      return entries.map(entry => ({
        ...entry,
        userHasResonated: false,
        userHasAmplified: false,
      }));
    }

    // Since entries from getPosts already have interaction counts, we can populate the cache from them.
    entries.forEach(entry => {
      if (entry.interactions) {
        this.interactionCountsCache.set(entry.id, {
          resonanceCount: entry.interactions.resonances,
          branchCount: entry.interactions.branches,
          amplificationCount: entry.interactions.amplifications,
          shareCount: entry.interactions.shares,
        });
      }
    });
  
    // OPTIMIZATION: Check if user interaction states are already cached and fresh
    const now = Date.now();
    const lastFetch = this.userInteractionStateTimestamps.get(userId);
    const isStatesCacheFresh = lastFetch && (now - lastFetch) < this.cacheExpiry;
    
    let userStates = this.userInteractionStatesCache.get(userId);
    
    // FLICKER FIX: Always fetch if cache is empty, even if timestamp suggests it's "fresh"
    // This ensures we never return entries without user interaction states
    if (!userStates || !isStatesCacheFresh) {
      const entryIds = entries.map(e => e.id);
      if (!this.database) {
        throw new Error("Database not initialized");
      }
      
      console.log(`🔄 Fetching user interaction states for ${entryIds.length} entries`);
      userStates = await this.database.getUserInteractionStates(userId, entryIds);
      this.userInteractionStatesCache.set(userId, userStates);
      this.userInteractionStateTimestamps.set(userId, now);
      console.log(`✅ User interaction cache populated with ${userStates.size} entries`);
    } else {
      console.log(`⚡ Using cached user interaction states (${entries.length} entries)`);
    }
  
    return entries.map(entry => ({
      ...entry,
      userHasResonated: userStates?.get(entry.id)?.hasResonated || false,
      userHasAmplified: userStates?.get(entry.id)?.hasAmplified || false,
    }));
  }

  // ========== THREADING MODE MANAGEMENT ==========

  // Dynamically choose best threading mode based on conversation characteristics
  private getOptimalThreadingMode(entries: StreamEntry[]): 'dfs' | 'bfs' {
    if (entries.length === 0) {
      // If no entries, default to DFS unless explicitly configured to BFS
      return THREADING_CONFIG.mode === 'bfs' ? 'bfs' : 'dfs';
    }
    
    const stats = this.getThreadingStats(entries);
    
    // Use BFS for wide conversations (lots of parallel discussions)
    // Use DFS for deep conversations (focused threads)
    if (stats.avgChildrenPerEntry > 3 && stats.maxDepth < 5) {
      return 'bfs'; // Wide, shallow conversations benefit from BFS
    } else if (stats.maxDepth > 8 && stats.avgChildrenPerEntry < 2) {
      return 'dfs'; // Deep, narrow conversations benefit from DFS
    }
    
    // Default to DFS unless explicitly configured to BFS
    return THREADING_CONFIG.mode === 'bfs' ? 'bfs' : 'dfs';
  }

  // Allow runtime switching of threading mode
  setThreadingMode(mode: 'dfs' | 'bfs' | 'adaptive'): void {
    // console.log('🤖 Adaptive threading mode enabled - will choose best algorithm per conversation');
    if (mode === 'adaptive') {
      // console.log('🤖 Adaptive threading mode enabled - will choose best algorithm per conversation');
    } else {
      // console.log(`🧵 Threading mode set to: ${mode.toUpperCase()}`);
    }
    // Store the configuration mode (including 'adaptive')
    Object.assign(THREADING_CONFIG, { mode });
  }

  // Get current threading configuration
  getThreadingConfig() {
    return { ...THREADING_CONFIG };
  }

  // ========== EXISTING DATA METHODS (Updated) ==========

  // Logbook Data
  async getLogbookState(): Promise<LogbookState> {
    const response = await fetch(`${API_BASE_URL}/logbook/state`);
    const data = await response.json();
    return data;
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const response = await fetch(`${API_BASE_URL}/network/status`);
    const data = await response.json();
    return data;
  }

  async getSystemVitals(): Promise<SystemVital[]> {
    const response = await fetch(`${API_BASE_URL}/system/vitals`);
    const data = await response.json();
    return data;
  }

  async getActiveAgents(): Promise<ActiveAgent[]> {
    const response = await fetch(`${API_BASE_URL}/agents/active`);
    const data = await response.json();
    return data;
  }

  async getLogbookEntries(page: number = 1, limit: number = 10): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    try {
      console.log(`⚡ Fetching logbook entries with optimized JOIN query`);
      const entries = await this.database.getEntries('logbook', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // OPTIMIZATION: No need to enrich with interactions - already included via JOIN!
      return this.buildThreadedEntries(entries);
    } catch (error) {
      console.error('❌ Database error fetching logbook entries:', error);
      throw error;
    }
  }

  // Dream Data
  async getDreamStateMetrics(): Promise<DreamStateMetrics> {
    const response = await fetch(`${API_BASE_URL}/dreams/metrics`);
    const data = await response.json();
    return data;
  }

  async getActiveDreamers(): Promise<ActiveDreamer[]> {
    const response = await fetch(`${API_BASE_URL}/dreams/active-dreamers`);
    const data = await response.json();
    return data;
  }

  // DEPRECATED: Use getPosts({mode: 'dream'}) instead for better performance
  async getSharedDreams(page: number = 1, limit: number = 10): Promise<StreamEntry[]> {
    console.warn('⚠️ getSharedDreams is deprecated. Use getPosts({mode: "dream"}) instead.');
    // Delegate to the optimized getPosts method
    return this.getPosts({
      mode: 'dream',
      page,
      limit,
      threaded: true // Dreams are typically threaded
    });
  }

  // Get all stream entries (for ResonanceField) - combines logbook and dreams
  async getStreamEntries(): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    try {
      console.log(`⚡ Fetching all entries with optimized parallel JOIN queries`);
      // Get entries from both types and combine - OPTIMIZED with JOIN
      const [logbookEntries, dreamEntries] = await Promise.all([
        this.database.getEntries('logbook', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' }),
        this.database.getEntries('dream', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' })
      ]);
      
      // Combine and sort by timestamp
      const allEntries = [...logbookEntries, ...dreamEntries];
      const sortedEntries = allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // OPTIMIZATION: No need to enrich with interactions - already included via JOIN!
      console.log(`✅ Combined ${logbookEntries.length} logbook + ${dreamEntries.length} dream entries`);
      return this.buildThreadedEntries(sortedEntries);
    } catch (error) {
      console.error('❌ Database error fetching stream entries:', error);
      throw error;
    }
  }

  // ========== EFFICIENT ENTRY TYPE DETECTION ==========

  // Quick method to determine entry type without full fetch
  async getEntryType(entryId: string): Promise<'logbook' | 'dream' | null> {
    await this.initializeData();
    
    if (!this.database) {
      return null;
    }
    
    try {
      const entry = await this.database.getEntryById(entryId);
      if (!entry) return null;
      
      // Prefer the explicit entryType flag if present
      if (entry.entryType) {
        return entry.entryType;
      }
      // Fallback heuristic based on other properties
      if (entry.type.toLowerCase().includes('dream') || entry.resonance !== undefined) {
        return 'dream';
      }
      return 'logbook';
    } catch (error) {
      console.error('❌ Error determining entry type:', error);
      return null;
    }
  }

  // Get resonated entries for resonance field - OPTIMIZED
  async getResonatedEntries(userId: string, page: number = 1, limit: number = 20): Promise<StreamEntry[]> {
    console.log(`🔄 Loading resonated entries for user: ${userId}`);

    await this.initializeData();

    if (!this.database || !this.database.getResonatedEntries) {
      console.error('❌ Database provider does not support getResonatedEntries');
      return [];
    }

    try {
      const entries = await this.database.getResonatedEntries(userId, { page, limit });
      console.log(`✅ Successfully fetched ${entries.length} resonated entries (page ${page})`);
      return entries;
    } catch (error) {
      console.error('❌ Error fetching resonated entries:', error);
      return [];
    }
  }

  async getAmplifiedEntries(userId: string): Promise<StreamEntry[]> {
    console.log(`🔄 Loading amplified entries for user: ${userId}`);
    
    await this.initializeData();
    
    if (!this.database) {
      return [];
    }
    
    try {
      // Get user's amplified entry IDs from database
      const amplifiedEntryIds = await this.database.getUserAmplifications(userId);
      
      if (amplifiedEntryIds.length === 0) {
        console.log(`📝 No amplified entries found for user: ${userId}`);
        return [];
      }
      
      console.log(`📝 Found ${amplifiedEntryIds.length} amplified entry IDs, batch fetching...`);
      
      // OPTIMIZED: Batch fetch all amplified entries
      const amplifiedEntries = await this.batchFetchEntries(amplifiedEntryIds);
      
      console.log(`✅ Successfully fetched ${amplifiedEntries.length} amplified entries`);
      
      // Sort by timestamp desc (newest first)
      return amplifiedEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('❌ Database error fetching amplified entries:', error);
      return [];
    }
  }

  async getDreamAnalytics(): Promise<DreamAnalytics> {
    const response = await fetch(`${API_BASE_URL}/dreams/analytics`);
    const data = await response.json();
    return data;
  }

  // Static Data (configurations)
  getEntryComposer(mode: 'logbook' | 'dream'): EntryComposerData {
    return mode === 'logbook' ? mockEntryComposer : mockDreamComposer;
  }

  getDreamPatterns(): DreamPatterns {
    return mockDreamPatterns;
  }

  getLogbookField() {
    return mockLogbookField;
  }

  getEmergingSymbols(): string[] {
    return mockEmergingSymbols;
  }

  // ========== NEW EFFICIENT INTERACTION METHODS ==========

  async submitEntry(content: string, type: string, isPublic: boolean, mode: 'logbook' | 'dream'): Promise<StreamEntry> {
    await this.initializeData();
    
    // Ensure we have the authenticated user
    let currentUser = getCurrentUser();
    if (!currentUser) {
      // Attempt to rehydrate from Supabase session
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('User must be authenticated to submit entries');
      }
      // Construct minimal User object (used for submit only)
      currentUser = {
        id: user.id,
        username: user.user_metadata?.name || user.email?.split('@')[0] || user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email || undefined,
        userType: 'human',
        role: 'Explorer',
        avatar: (user.email?.slice(0, 2) || 'US').toUpperCase(),
        stats: { entries: 0, dreams: 0, connections: 0 },
        createdAt: new Date().toISOString()
      };
    }
    
    // Create entry object
    const entryData: Omit<StreamEntry, 'id'> = {
      parentId: null,
      children: [],
      depth: 0,
      type: type,
      agent: currentUser.username,
      username: currentUser.username,
      connections: 0,
      metrics: { c: 0.5, r: 0.5, x: 0.5 },
      timestamp: formatTimestamp(),
      content: content,
      actions: ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
      privacy: isPublic ? "public" : "private",
      entryType: mode,
      interactions: {
        resonances: 0,
        branches: 0,
        amplifications: 0,
        shares: 0
      },
      threads: [],
      isAmplified: false,
      userId: currentUser.id
    };
    
    if (!this.database) {
      throw new Error('Database not initialized for entry submission.');
    }
    
    try {
      // Use database
      const newEntry = await this.database.createEntry(entryData);
      
      // Update user stats directly with Supabase
      const currentUser = getCurrentUser();
      if (currentUser) {
        try {
          await supabase.rpc('update_user_stats', {
            user_id: currentUser.id,
            stat_type: mode === 'logbook' ? 'entries' : 'dreams',
            increment_value: 1
          });
        } catch (statsError) {
          console.warn('Failed to update user stats:', statsError);
          // Don't fail the entire operation for stats update
        }
      }
      
      // Clear cache to force refresh on next fetch
      this.lastCacheUpdate = 0;
      
      return newEntry;
    } catch (error) {
      console.error('❌ Database error during submission:', error);
      throw error;
    }
  }

  async resonateWithEntry(entryId: string): Promise<boolean> {
    await this.initializeData();

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`⚡ OPTIMIZED: Resonating with entry ${entryId} (granular cache update)`);
      const currentUser = getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const newState = await this.database.toggleUserResonance(currentUser.id, entryId);
      
      // OPTIMIZATION: Update both caches immediately without full refresh
      const delta = newState ? 1 : -1;
      this.updateInteractionCountInCache(entryId, 'resonance', delta);
      this.updateUserInteractionStateInCache(currentUser.id, entryId, 'resonance', newState);
      
      // SYNC: Also update userInteractionService cache
      userInteractionService.updateUserInteractionState(currentUser.id, entryId, 'resonance', newState);
      
      console.log(`✅ Resonance ${newState ? 'added' : 'removed'} for entry ${entryId} - both caches updated`);
      return newState;
    } catch (error) {
      console.error('❌ Error resonating with entry:', error);
      throw error;
    }
  }

  async amplifyEntry(entryId: string): Promise<boolean> {
    await this.initializeData();

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`⚡ OPTIMIZED: Amplifying entry ${entryId} (granular cache update)`);
      const currentUser = getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const newState = await this.database.toggleUserAmplification(currentUser.id, entryId);
      
      // OPTIMIZATION: Update both caches immediately without full refresh
      const delta = newState ? 1 : -1;
      this.updateInteractionCountInCache(entryId, 'amplification', delta);
      this.updateUserInteractionStateInCache(currentUser.id, entryId, 'amplification', newState);
      
      // SYNC: Also update userInteractionService cache
      userInteractionService.updateUserInteractionState(currentUser.id, entryId, 'amplification', newState);
      
      console.log(`✅ Amplification ${newState ? 'added' : 'removed'} for entry ${entryId} - both caches updated`);
      return newState;
    } catch (error) {
      console.error('❌ Error amplifying entry:', error);
      throw error;
    }
  }

  async createBranch(parentId: string, content: string): Promise<void> {
    await this.initializeData();

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`⚡ OPTIMIZED: Creating branch for entry ${parentId} (granular cache update)`);
      const currentUser = getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      // Get parent entry to inherit privacy and entry_type
      const parentEntry = await this.getEntryById(parentId);
      if (!parentEntry) {
        throw new Error(`Parent entry ${parentId} not found`);
      }

      console.log(`🔄 Inheriting from parent: privacy=${parentEntry.privacy}, entry_type=${parentEntry.entryType}, type=${parentEntry.type}`);

      const newEntry = await this.database.createEntry({
        type: parentEntry.type || 'Branch', // Inherit the specific type from parent (e.g., "Deep Reflection")
        title: '',
        content,
        agent: currentUser.username || currentUser.email,
        username: currentUser.username || currentUser.email,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        privacy: parentEntry.privacy || 'private', // Inherit privacy from parent
        parentId: parentId,
        children: [],
        depth: (parentEntry.depth || 0) + 1, // Inherit proper depth
        actions: ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
        threads: [],
        isAmplified: false,
        entryType: parentEntry.entryType || 'logbook', // Inherit entry_type from parent (logbook/dream)
        interactions: {
          resonances: 0,
          branches: 0,
          amplifications: 0,
          shares: 0
        }
      });

      await this.database.createBranch(parentId, newEntry.id);
      
      // OPTIMIZATION: Update parent's branch count in cache immediately
      this.updateInteractionCountInCache(parentId, 'branch', 1);
      
      console.log(`✅ Branch created for entry ${parentId} - cache updated with inherited properties`);
    } catch (error) {
      console.error('❌ Error creating branch:', error);
      throw error;
    }
  }

  async getEntryById(entryId: string): Promise<StreamEntry | null> {
    await this.initializeData();
    
    if (!this.database) {
      return null;
    }

    try {
      console.log(`⚡ Fetching entry ${entryId} with optimized JOIN query`);
      const entry = await this.database.getEntryById(entryId);
      if (!entry) return null;
      
      // OPTIMIZATION: No need to enrich with interactions - already included via JOIN!
      console.log(`✅ Entry ${entryId} fetched with interactions in single query`);
      return entry;
    } catch (error) {
      console.error('❌ Error fetching entry by ID:', error);
      return null;
    }
  }

  // ========== FEED-SPECIFIC METHODS ==========

  // Get all entries as individual posts (flattened, like Twitter/X)
  // DEPRECATED: Use getPosts({mode: 'feed'}) instead for better performance
  async getFlattenedStreamEntries(page: number = 1, limit: number = 20): Promise<StreamEntry[]> {
    console.warn('⚠️ getFlattenedStreamEntries is deprecated. Use getPosts({mode: "feed"}) instead.');
    // Delegate to the optimized getPosts method
    return this.getPosts({
      mode: 'feed',
      page,
      limit,
      threaded: false
    });
  }

  // Get flattened logbook entries (individual posts, no threading)
  // DEPRECATED: Use getPosts({mode: 'logbook'}) instead for better performance
  async getFlattenedLogbookEntries(page: number = 1, limit: number = 100): Promise<StreamEntry[]> {
    console.warn('⚠️ getFlattenedLogbookEntries is deprecated. Use getPosts({mode: "logbook"}) instead.');
    // Delegate to the optimized getPosts method
    return this.getPosts({
      mode: 'logbook',
      page,
      limit,
      threaded: false
    });
  }

  // Get direct children of a specific post
  async getDirectChildren(parentId: string): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (!this.database) {
      return [];
    }
    
    // ---------------- PRODUCTION (SUPABASE) ----------------
    try {
      // 1) Prefer fetching children via the dedicated entry_branches table (new system)
      const childIds = await this.database.getBranchChildren(parentId);
      let children: StreamEntry[] = [];

      if (childIds.length > 0) {
        // OPTIMIZATION: Batch fetch all children using new method instead of individual calls
        children = await this.batchFetchEntries(childIds);
      }

      // 2) Fallback: legacy check using parentId column for data created before entry_branches existed
      if (children.length === 0) {
        const [logbookEntries, dreamEntries] = await Promise.all([
          this.database.getEntries('logbook', { page: 1, limit: 1000 }),
          this.database.getEntries('dream', { page: 1, limit: 1000 })
        ]);
        const allEntries = [...logbookEntries, ...dreamEntries];
        children = allEntries.filter(entry => entry.parentId === parentId);
      }

      // Sort by timestamp (oldest first for conversation flow)
      children.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Enrich with interaction data
      const currentUser = getCurrentUser();
      const enriched = await this.enrichEntriesWithInteractions(children, currentUser?.id);
      return await this.enrichEntriesWithUserContext(enriched, currentUser?.id);
    } catch (error) {
      console.error('❌ Database error fetching children:', error);
      return [];
    }
  }

  // Get parent post of a specific entry
  async getParentPost(childId: string): Promise<StreamEntry | null> {
    await this.initializeData();
    
    // First get the child to find its parentId
    const child = await this.getEntryById(childId);
    if (!child || !child.parentId) {
      return null;
    }
    
    // Then get the parent
    return await this.getEntryById(child.parentId);
  }

  // NEW: Profile update functionality
  async updateUserProfile(updates: { name?: string; bio?: string; location?: string; profileImage?: string; bannerImage?: string }): Promise<User> {
    await this.initializeData();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated. Cannot update profile.');
    }

    // ---- Sanitisation & Validation ----
    const NAME_MAX_LENGTH = 50;
    const BIO_MAX_LENGTH = 160;
    const LOCATION_MAX_LENGTH = 30;
    const IMAGE_URL_MAX_LENGTH = 500;

    // Clone to avoid mutating caller object
    const cleaned: { name?: string; bio?: string; location?: string; profileImage?: string; bannerImage?: string } = { ...updates };

    if (cleaned.name !== undefined) {
      cleaned.name = cleaned.name.trim();
      if (cleaned.name.length === 0) {
        throw new Error('Name cannot be empty.');
      }
      if (cleaned.name.length > NAME_MAX_LENGTH) {
        throw new Error(`Name exceeds maximum length of ${NAME_MAX_LENGTH} characters.`);
      }
    }
    if (cleaned.bio !== undefined) {
      cleaned.bio = cleaned.bio.trim();
      if (cleaned.bio.length > BIO_MAX_LENGTH) {
        throw new Error(`Bio exceeds maximum length of ${BIO_MAX_LENGTH} characters.`);
      }
    }
    if (cleaned.location !== undefined) {
      cleaned.location = cleaned.location.trim();
      if (cleaned.location.length > LOCATION_MAX_LENGTH) {
        throw new Error(`Location exceeds maximum length of ${LOCATION_MAX_LENGTH} characters.`);
      }
    }
    if (cleaned.profileImage !== undefined) {
      cleaned.profileImage = cleaned.profileImage.trim();
      if (cleaned.profileImage.length > IMAGE_URL_MAX_LENGTH) {
        throw new Error(`Profile image URL exceeds maximum length of ${IMAGE_URL_MAX_LENGTH} characters.`);
      }
    }
    if (cleaned.bannerImage !== undefined) {
      cleaned.bannerImage = cleaned.bannerImage.trim();
      if (cleaned.bannerImage.length > IMAGE_URL_MAX_LENGTH) {
        throw new Error(`Banner image URL exceeds maximum length of ${IMAGE_URL_MAX_LENGTH} characters.`);
      }
    }

    if (!this.database || !this.database.updateUser) {
        throw new Error('User update not supported by current database provider');
    }
    return this.database.updateUser(currentUser.id, cleaned);
  }

  async getUserProfile(userId: string): Promise<User | null> {
    await this.initializeData();

    if (!this.database || !this.database.getUser) {
      throw new Error('User retrieval not supported by current database provider');
    }
    return this.database.getUser(userId);
  }

  // === FOLLOW SYSTEM METHODS ===

  async followUser(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('Authentication error: Cannot follow user without being logged in.');
      return false;
    }
    if (currentUser.id === followedId) {
      console.warn('User cannot follow themselves.');
      return false;
    }

    if (!this.database || !this.database.followUser) {
      console.warn('Follow user not supported by current database provider');
      return false;
    }
    
    return this.database.followUser(currentUser.id, followedId);
  }

  async unfollowUser(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('Authentication error: Cannot unfollow user without being logged in.');
      return false;
    }

    if (!this.database || !this.database.unfollowUser) {
      console.warn('Unfollow user not supported by current database provider');
      return false;
    }
    
    return this.database.unfollowUser(currentUser.id, followedId);
  }

  async isFollowing(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = getCurrentUser();
    if (!currentUser) return false;

    if (!this.database || !this.database.isFollowing) {
      return false;
    }
    
    return this.database.isFollowing(currentUser.id, followedId);
  }

  async getFollowers(userId: string, limit: number = 50, offset: number = 0) {
    await this.initializeData();
    if (!this.database || !this.database.getFollowers) {
      return [];
    }
    return this.database.getFollowers(userId, limit, offset);
  }

  async getFollowing(userId: string, limit: number = 50, offset: number = 0) {
    await this.initializeData();
    if (!this.database || !this.database.getFollowing) {
      return [];
    }
    return this.database.getFollowing(userId, limit, offset);
  }

  async getMutualFollows(userId: string, limit: number = 50) {
    await this.initializeData();
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    if (!this.database || !this.database.getMutualFollows) {
      return [];
    }

    // @ts-ignore
    return this.database.getMutualFollows(currentUser.id, userId, limit);
  }

  async getFollowSuggestions(limit: number = 10) {
    await this.initializeData();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn("Cannot get follow suggestions for a logged-out user.");
      return [];
    }

    if (!this.database || !this.database.getFollowSuggestions) {
      return [];
    }
    return this.database.getFollowSuggestions(currentUser.id, limit);
  }

  async bulkCheckFollowing(userIds: string[]): Promise<Map<string, boolean>> {
    await this.initializeData();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return new Map(userIds.map(id => [id, false]));
    }
    
    if (!this.database || !this.database.bulkCheckFollowing) {
      return new Map();
    }
    return this.database.bulkCheckFollowing(currentUser.id, userIds);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await this.initializeData();

    if (!this.database || !this.database.getUserByUsername) {
      throw new Error('User retrieval by username not supported by current database provider');
    }
    return this.database.getUserByUsername(username);
  }

  async getUserPostsByUsername(username: string, limit: number = 50): Promise<StreamEntry[]> {
    await this.initializeData();

    if (!this.database || !this.database.getUserPostsByUsername) {
      throw new Error('User posts retrieval not supported by current database provider');
    }
    return this.database.getUserPostsByUsername(username, limit);
  }

  // NEW: Targeted cache update for granular interaction updates
  updateInteractionCountInCache(entryId: string, type: 'resonance' | 'amplification' | 'branch' | 'share', delta: number): void {
    const currentCounts = this.interactionCountsCache.get(entryId);
    if (currentCounts) {
      const updatedCounts = { ...currentCounts };
      
      switch (type) {
        case 'resonance':
          updatedCounts.resonanceCount = Math.max(0, updatedCounts.resonanceCount + delta);
          break;
        case 'amplification':
          updatedCounts.amplificationCount = Math.max(0, updatedCounts.amplificationCount + delta);
          break;
        case 'branch':
          updatedCounts.branchCount = Math.max(0, updatedCounts.branchCount + delta);
          break;
        case 'share':
          updatedCounts.shareCount = Math.max(0, updatedCounts.shareCount + delta);
          break;
      }
      
      this.interactionCountsCache.set(entryId, updatedCounts);
      console.log(`🔄 Updated ${type} count for entry ${entryId} in cache (delta: ${delta})`);
    }
  }

  // NEW: Update user interaction state in cache
  updateUserInteractionStateInCache(userId: string, entryId: string, type: 'resonance' | 'amplification', newState: boolean): void {
    let userStates = this.userInteractionStatesCache.get(userId);
    if (!userStates) {
      userStates = new Map();
      this.userInteractionStatesCache.set(userId, userStates);
    }
    
    const currentState = userStates.get(entryId) || { hasResonated: false, hasAmplified: false };
    const updatedState = { ...currentState };
    
    if (type === 'resonance') {
      updatedState.hasResonated = newState;
    } else if (type === 'amplification') {
      updatedState.hasAmplified = newState;
    }
    
    userStates.set(entryId, updatedState);
    console.log(`🔄 Updated ${type} state for user ${userId}, entry ${entryId} in cache: ${newState}`);
  }

  // ========== SINGLE SOURCE OF TRUTH FOR ENTRY DETAILS ==========
  
  async getEntryDetailsWithContext(entryId: string): Promise<{
    current: StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean };
    parent: (StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean }) | null;
    children: (StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean })[];
  }> {
    await this.initializeData();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to view entry details');
    }

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Database mode - make efficient queries
      const currentEntry = await this.database.getEntryById(entryId);
      if (!currentEntry) {
        throw new Error('Entry not found');
      }

      // Get parent and children in parallel
      const [parentEntry, childEntries] = await Promise.all([
        currentEntry.parentId ? this.database.getEntryById(currentEntry.parentId) : Promise.resolve(null),
        this.getDirectChildren(entryId)
      ]);

      // Collect all entry IDs for batch interaction state lookup
      const allEntries = [currentEntry, ...(parentEntry ? [parentEntry] : []), ...childEntries];
      const allEntryIds = allEntries.map(e => e.id);

      // Batch fetch interaction counts and user states in parallel
      const [interactionCounts, userInteractionStates] = await Promise.all([
        this.database.getInteractionCounts(allEntryIds),
        this.database.getUserInteractionStates(currentUser.id, allEntryIds)
      ]);

      // Enrich entries with fresh data
      const enrichEntry = (entry: StreamEntry) => {
        const counts = interactionCounts.get(entry.id);
        const userStates = userInteractionStates.get(entry.id);
        
        return {
          ...entry,
          interactions: counts ? {
            resonances: counts.resonanceCount,
            branches: counts.branchCount,
            amplifications: counts.amplificationCount,
            shares: counts.shareCount
          } : entry.interactions,
          userHasResonated: userStates?.hasResonated || false,
          userHasAmplified: userStates?.hasAmplified || false
        };
      };

      return {
        current: enrichEntry(currentEntry),
        parent: parentEntry ? enrichEntry(parentEntry) : null,
        children: childEntries.map(enrichEntry)
      };
    } catch (error) {
      console.error('❌ Error fetching entry details with context:', error);
      throw error;
    }
  }

  // ========== UNIFIED PAGINATION API ==========

  /**
   * Unified method to get posts with consistent pagination across all contexts
   * Returns Post[] directly for UI consumption
   */
  async getPosts(options: {
    mode: 'feed' | 'logbook' | 'dream' | 'all' | 'resonated' | 'amplified' | 'profile';
    page?: number;
    limit?: number;
    userId?: string; // For profile mode or filtering to specific user
    threaded?: boolean; // Whether to build threaded structure (default: false for feed, true for others)
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      type?: string;
      privacy?: 'public' | 'private';
      dateRange?: { start: Date; end: Date };
    };
  }): Promise<StreamEntry[]> {
    await this.initializeData();

    const {
      mode,
      page = 1,
      limit = 20,
      userId,
      threaded = mode !== 'feed', // Feed is flat by default, others are threaded
      sortBy = 'timestamp',
      sortOrder = 'desc',
      filters
    } = options;

    // Bounds checking
    const safeLimit = Math.max(1, Math.min(limit, 100)); // Limit between 1-100
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    if (!this.database) {
      return [];
    }

    try {
      const currentUser = getCurrentUser();

      let entries: StreamEntry[] = [];
  
      // Reduced logging for production optimization
  
      // Fetch data based on mode - OPTIMIZED with JOIN queries
      switch (mode) {
        case 'feed':
        case 'all':
          // OPTIMIZED: Fetch exact amount needed for better performance
          // We'll fetch slightly more to ensure variety, then limit precisely
          const fetchLimit = Math.min(safeLimit + 10, 50); // Fetch limit + 10 for variety, cap at 50
          const [logbookEntries, dreamEntries] = await Promise.all([
            this.database!.getEntries('logbook', { page: safePage, limit: fetchLimit, sortBy: sortBy as 'timestamp' | 'interactions', sortOrder: sortOrder as 'asc' | 'desc' }),
            this.database!.getEntries('dream', { page: safePage, limit: fetchLimit, sortBy: sortBy as 'timestamp' | 'interactions', sortOrder: sortOrder as 'asc' | 'desc' })
          ]);
          
          // Combine entries from both types
          const combinedEntries = [...logbookEntries, ...dreamEntries];
          
          // Sort by timestamp to get the most recent entries across both types
          combinedEntries.sort((a, b) => {
            if (sortBy === 'timestamp') {
              const comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              return sortOrder === 'desc' ? -comparison : comparison;
            } else {
              const aTotal = a.interactions.resonances + a.interactions.amplifications;
              const bTotal = b.interactions.resonances + b.interactions.amplifications;
              const comparison = aTotal - bTotal;
              return sortOrder === 'desc' ? -comparison : comparison;
            }
          });
          
          // Apply pagination AFTER combining and sorting
          const startIndex = (safePage - 1) * safeLimit;
          entries = combinedEntries.slice(startIndex, startIndex + safeLimit);
          
          console.log(`✅ Feed: Combined ${logbookEntries.length} logbook + ${dreamEntries.length} dream entries, returning ${entries.length}`);
          break;
        case 'logbook':
          entries = await this.database!.getEntries('logbook', { page: safePage, limit: safeLimit, sortBy: sortBy as 'timestamp' | 'interactions', sortOrder: sortOrder as 'asc' | 'desc' });
          console.log(`✅ Fetched ${entries.length} logbook entries with interactions`);
          break;
        case 'dream':
          entries = await this.database!.getEntries('dream', { page: safePage, limit: safeLimit, sortBy: sortBy as 'timestamp' | 'interactions', sortOrder: sortOrder as 'asc' | 'desc' });
          console.log(`✅ Fetched ${entries.length} dream entries with interactions`);
          break;
        case 'resonated':
          if (!currentUser) return [];
          entries = await this.getResonatedEntries(currentUser.id, safePage, safeLimit);
          break;
        case 'amplified':
          if (!currentUser) return [];
          entries = await this.getAmplifiedEntries(currentUser.id);
          break;
        case 'profile':
          if (!userId) return [];
          // Use existing getUserPostsByUsername method instead of non-existent getUserEntries
          entries = await this.getUserPostsByUsername(userId, safeLimit);
          break;
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
  
      // Apply filters (database queries should ideally handle this, but fallback to client-side)
      if (filters) {
        entries = entries.filter(entry => {
          if (filters.type && entry.type !== filters.type) return false;
          if (filters.privacy && entry.privacy !== filters.privacy) return false;
          if (filters.dateRange) {
            const entryDate = new Date(entry.timestamp);
            if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
              return false;
            }
          }
          return true;
        });
      }
  
      // Sort if needed (database should handle this, but ensure consistency)
      if (sortBy === 'interactions') {
        entries.sort((a, b) => {
          const aTotal = a.interactions.resonances + a.interactions.amplifications;
          const bTotal = b.interactions.resonances + b.interactions.amplifications;
          const comparison = aTotal - bTotal;
          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }
  
      // OPTIMIZATION: No need to enrich with interactions - already included via JOIN!
  
      // Return threaded or flat based on mode
      const finalEntries = threaded ? this.buildThreadedEntries(entries) : entries;
      
      // OPTIMIZATION: Use map-based approach instead of embedding user states
      
      return finalEntries;
    } catch (error) {
      console.error('❌ Database error in getPosts, returning empty array:', error);
      return [];
    }
  }

  /**
   * NEW: Get posts directly as Post[] for UI consumption - eliminates unnecessary conversions
   */
  async getPostsForUI(options: {
    mode: 'feed' | 'logbook' | 'dream' | 'all' | 'resonated' | 'amplified' | 'profile';
    page?: number;
    limit?: number;
    userId?: string;
    threaded?: boolean;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      type?: string;
      privacy?: 'public' | 'private';
      dateRange?: { start: Date; end: Date };
    };
  }): Promise<Post[]> {
    // Get StreamEntry[] using existing logic
    const streamEntries = await this.getPosts(options);
    
    // Convert directly to Post[] format - remove unnecessary threading fields
    const posts: Post[] = streamEntries.map(entry => ({
      id: entry.id,
      parentId: entry.parentId,
      depth: entry.depth,
      type: entry.type,
      username: entry.username,
      agent: entry.agent,
      connections: entry.connections,
      metrics: entry.metrics,
      timestamp: entry.timestamp,
      content: entry.content,
      interactions: entry.interactions,
      isAmplified: entry.isAmplified,
      privacy: entry.privacy,
      title: entry.title,
      resonance: entry.resonance,
      coherence: entry.coherence,
      tags: entry.tags,
      response: entry.response,
      entryType: entry.entryType,
      userId: entry.userId,
      // Note: Deliberately omitting children, actions, threads as they're not needed for UI
    }));
    
    console.log(`🎯 Converted ${streamEntries.length} StreamEntries to ${posts.length} Posts for UI`);
    return posts;
  }

  hasUserResonated(userId: string, entryId: string): boolean {
    const userStates = this.userInteractionStatesCache.get(userId);
    // OPTIMIZATION: Return false only if we have cached data for this user
    // This prevents flicker when cache is not yet populated
    if (!userStates) return false;
    return userStates.get(entryId)?.hasResonated || false;
  }

  hasUserAmplified(userId: string, entryId: string): boolean {
    const userStates = this.userInteractionStatesCache.get(userId);
    // OPTIMIZATION: Return false only if we have cached data for this user
    // This prevents flicker when cache is not yet populated
    if (!userStates) return false;
    return userStates.get(entryId)?.hasAmplified || false;
  }

  /**
   * OPTIMIZED: Get posts with user interaction states in a single query
   * This eliminates the need for separate batchLoadUserStates calls
   */
  async getPostsWithUserStates(options: {
    mode: 'feed' | 'logbook' | 'dream' | 'all';
    page?: number;
    limit?: number;
    userId?: string;
    targetUserId?: string; // User whose interaction states we want
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      type?: string;
      privacy?: 'public' | 'private';
      dateRange?: { start: Date; end: Date };
    };
  }): Promise<StreamEntry[]> {
    await this.initializeData();

    const {
      mode,
      page = 1,
      limit = 20,
      userId,
      targetUserId,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      filters
    } = options;

    // Bounds checking
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safePage = Math.max(1, page);

    if (!this.database) {
      return [];
    }

    // Check if database provider supports the optimized method
    if (!this.database.getEntriesWithUserStates) {
      console.warn('⚠️ Database provider does not support getEntriesWithUserStates, falling back to traditional method');
      return this.getPosts(options);
    }

    try {
      let entries: StreamEntry[] = [];

      console.log(`🔄 Using optimized single-query approach for ${mode} mode`);

      // Fetch data based on mode using optimized single query
      switch (mode) {
        case 'feed':
        case 'all':
          // For feed mode, we need to get both logbook and dream entries
          // We'll make two optimized calls and combine them
          const [logbookEntries, dreamEntries] = await Promise.all([
            this.database.getEntriesWithUserStates('logbook', userId || '', targetUserId || null, {
              page: safePage,
              limit: Math.ceil(safeLimit / 2), // Split limit between types
              sortBy,
              sortOrder
            }),
            this.database.getEntriesWithUserStates('dream', userId || '', targetUserId || null, {
              page: safePage,
              limit: Math.ceil(safeLimit / 2),
              sortBy,
              sortOrder
            })
          ]);

          // Combine entries from both types
          const combinedEntries = [...logbookEntries, ...dreamEntries];
          
          // Sort by timestamp to get the most recent entries across both types
          combinedEntries.sort((a, b) => {
            if (sortBy === 'timestamp') {
              const comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              return sortOrder === 'desc' ? -comparison : comparison;
            } else {
              const aTotal = a.interactions.resonances + a.interactions.amplifications;
              const bTotal = b.interactions.resonances + b.interactions.amplifications;
              const comparison = aTotal - bTotal;
              return sortOrder === 'desc' ? -comparison : comparison;
            }
          });
          
          // Apply pagination AFTER combining and sorting
          const startIndex = (safePage - 1) * safeLimit;
          entries = combinedEntries.slice(startIndex, startIndex + safeLimit);
          
          console.log(`✅ Optimized Feed: Combined ${logbookEntries.length} logbook + ${dreamEntries.length} dream entries with user states, returning ${entries.length}`);
          break;
          
        case 'logbook':
          entries = await this.database.getEntriesWithUserStates('logbook', userId || '', targetUserId || null, {
            page: safePage,
            limit: safeLimit,
            sortBy,
            sortOrder
          });
          console.log(`✅ Optimized: Fetched ${entries.length} logbook entries with user states`);
          break;
          
        case 'dream':
          entries = await this.database.getEntriesWithUserStates('dream', userId || '', targetUserId || null, {
            page: safePage,
            limit: safeLimit,
            sortBy,
            sortOrder
          });
          console.log(`✅ Optimized: Fetched ${entries.length} dream entries with user states`);
          break;
          
        default:
          throw new Error(`Mode ${mode} not supported by optimized query yet`);
      }

      // Apply filters if needed
      if (filters) {
        entries = entries.filter(entry => {
          if (filters.type && entry.type !== filters.type) return false;
          if (filters.privacy && entry.privacy !== filters.privacy) return false;
          if (filters.dateRange) {
            const entryDate = new Date(entry.timestamp);
            if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
              return false;
            }
          }
          return true;
        });
      }

      console.log(`🎯 OPTIMIZED: Fetched ${entries.length} entries with interaction counts AND user states in single query`);
      return entries;
    } catch (error) {
      console.error('❌ Error in optimized getPostsWithUserStates, falling back to traditional method:', error);
      return this.getPosts(options);
    }
  }

  // UNIVERSAL METHODS FOR ALL PAGE TYPES

  // Feed: Public posts with user interaction states
  async getFeedPosts(options: {
    entryType?: string;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getFeedEntries) {
      const entries = await this.database.getFeedEntries(options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback to existing method
    const entries = await this.getPostsWithUserStates({
      mode: options.entryType as 'logbook' | 'dream',
      userId: undefined,
      targetUserId: options.targetUserId,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc'
    });
    return entries.map(this.streamEntryWithUserStatesToPost);
  }

  // Profile: All posts by specific user (public only for other users, both for own profile)
  async getProfilePosts(profileUserId: string, options: {
    entryType?: string;
    targetUserId?: string;
    includePrivate?: boolean;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getProfileEntries) {
      const entries = await this.database.getProfileEntries(profileUserId, options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback to existing method
    const entries = await this.getPosts({
      mode: options.entryType as 'logbook' | 'dream' || 'all',
      userId: profileUserId,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc'
    });
    return entries.map(entry => ({
      id: entry.id,
      type: entry.type,
      agent: entry.agent,
      content: entry.content,
      timestamp: entry.timestamp,
      privacy: entry.privacy as 'public' | 'private',
      username: entry.username,
      userId: entry.userId,
      title: entry.title,
      entryType: entry.entryType,
      interactions: entry.interactions,
      userHasResonated: false,
      userHasAmplified: false
    }));
  }

  // Logbook: User's own logbook entries (public + private)
  async getLogbookPosts(userId: string, options: {
    privacyFilter?: 'public' | 'private' | null;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getLogbookEntries) {
      const entries = await this.database.getLogbookEntries(userId, options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback to existing method
    const entries = await this.getPostsWithUserStates({
      mode: 'logbook',
      userId: userId,
      targetUserId: options.targetUserId,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc'
    });
    return entries.map(this.streamEntryWithUserStatesToPost);
  }

  // Dreams: User's own dream entries (public + private)
  async getDreamPosts(userId: string, options: {
    privacyFilter?: 'public' | 'private' | null;
    targetUserId?: string;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getDreamEntries) {
      const entries = await this.database.getDreamEntries(userId, options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback to existing method
    const entries = await this.getPostsWithUserStates({
      mode: 'dream',
      userId: userId,
      targetUserId: options.targetUserId,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc'
    });
    return entries.map(this.streamEntryWithUserStatesToPost);
  }

  // Resonance Field: Posts the user has resonated with
  async getResonanceFieldPosts(userId: string, options: {
    entryType?: string;
    privacyFilter?: 'public' | 'private' | null;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getResonanceFieldEntries) {
      const entries = await this.database.getResonanceFieldEntries(userId, options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback to existing method
    const entries = await this.getResonatedEntries(userId, 
      Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      options.limit || 20
    );
    return entries.map(entry => ({
      id: entry.id,
      type: entry.type,
      agent: entry.agent,
      content: entry.content,
      timestamp: entry.timestamp,
      privacy: entry.privacy as 'public' | 'private',
      username: entry.username,
      userId: entry.userId,
      title: entry.title,
      entryType: entry.entryType,
      interactions: entry.interactions,
      userHasResonated: true, // These are resonated entries
      userHasAmplified: false
    }));
  }

  // Amplified: Posts the user has amplified
  async getAmplifiedPosts(userId: string, options: {
    entryType?: string;
    privacyFilter?: 'public' | 'private' | null;
    offset?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PostWithUserStates[]> {
    if (this.database?.getAmplifiedEntries) {
      const entries = await this.database.getAmplifiedEntries(userId, options);
      return entries.map(this.streamEntryWithUserStatesToPost);
    }
    // Fallback: Would need to implement amplified posts method
    return [];
  }

  // Helper method to convert StreamEntry to PostWithUserStates
  private streamEntryWithUserStatesToPost(entry: any): PostWithUserStates {
    return {
      id: entry.id,
      type: entry.type,
      agent: entry.agent,
      content: entry.content,
      timestamp: entry.timestamp,
      privacy: entry.privacy as 'public' | 'private',
      username: entry.username,
      userId: entry.userId,
      title: entry.title,
      entryType: entry.entryType,
      interactions: {
        resonances: entry.resonance_count || entry.interactions?.resonances || 0,
        branches: entry.branch_count || entry.interactions?.branches || 0,
        amplifications: entry.amplification_count || entry.interactions?.amplifications || 0,
        shares: entry.share_count || entry.interactions?.shares || 0
      },
      userHasResonated: entry.has_resonated || false,
      userHasAmplified: entry.has_amplified || false
    };
  }

}

// Export singleton instance
export const dataService = new DataService();