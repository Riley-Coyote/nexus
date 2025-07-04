import { 
  StreamEntry, 
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
import { authService } from './supabaseAuthService';
import { supabase } from '../supabase';
import { StreamEntryData } from '../types';
import { DatabaseFactory } from '../database/factory';
import { DatabaseProvider, InteractionCounts, UserInteractionState } from '../database/types';
import {
  mockLogbookState,
  mockNetworkStatus,
  mockSystemVitals,
  mockActiveAgents,
  mockEntryComposer,
  mockLogbookEntries,
  mockDreamStateMetrics,
  mockActiveDreamers,
  mockDreamPatterns,
  mockDreamComposer,
  mockSharedDreams,
  mockDreamAnalytics,
  mockEmergingSymbols,
  mockLogbookField,
  mockUsers,
  getUserByUsername as getMockUserByUsername
} from '../data/mockData';

// ─────────────────────────────────────────────────────────────
// MOCK MODE DISABLED
// ----------------------------------------------------------------
// Set both flags to `false` so *all* calls use the real database.
// Keeping the variables (now constant) prevents widespread refactor
// while ensuring the mock branches are never entered.
// ----------------------------------------------------------------
const DEBUG_USE_MOCK_DATA = false;
const USE_MOCK_DATA = false; // ← single source of truth
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

// Simulated API delay for development
const simulateApiDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

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

class DataService {
  // In-memory storage for user-specific data (fallback/mock mode)
  private logbookEntries: StreamEntry[] = [];
  private sharedDreams: StreamEntry[] = [];
  private userResonances: Map<string, Set<string>> = new Map(); // userId -> Set of entryIds
  private userAmplifications: Map<string, Set<string>> = new Map(); // userId -> Set of entryIds
  
  // Branch relationship tracking for mock mode
  private branchRelationships: Map<string, string[]> = new Map(); // parentId -> childIds[]
  
  // Database provider for persistent storage
  private database: DatabaseProvider | null = null;
  private isInitialized = false;

  // Cache for efficient batch operations
  private interactionCountsCache: Map<string, InteractionCounts> = new Map();
  private userInteractionStatesCache: Map<string, Map<string, UserInteractionState>> = new Map();
  private cacheExpiry = 30000; // 30 seconds
  private lastCacheUpdate = 0;

  constructor() {
    // Initialize data will be called lazily when first method is accessed
  }

  private async initializeData() {
    if (this.isInitialized) return;
    
    try {
      if (!USE_MOCK_DATA) {
        // Initialize database connection
        this.database = DatabaseFactory.getInstance();
        await this.database.connect();
        // console.log('✅ Database connected successfully');
        // console.log('🗄️ Data Source: Supabase Database (New Efficient System)');
        // console.log('🚀 Features: Atomic operations, batch fetching, proper branching');
      } else {
        // Initialize with mock data if no entries exist (mock mode)
        if (this.logbookEntries.length === 0) {
          this.logbookEntries = [...mockLogbookEntries];
        }
        if (this.sharedDreams.length === 0) {
          this.sharedDreams = [...mockSharedDreams];
        }
        // Initialize branch relationships from existing parent-child data
        this.initializeMockBranchRelationships();
        // Initialize test resonances for demo
        this.initializeTestResonances();
        // console.log('📝 Using mock data mode');
        // console.log('🧪 Data Source: In-Memory Mock Data');
        if (DEBUG_USE_MOCK_DATA) {
          // console.log('🚩 Debug flag enabled: Change DEBUG_USE_MOCK_DATA in dataService.ts to switch');
        }
      }
      
      // Load persisted interaction state (mock mode only)
      if (USE_MOCK_DATA) {
        this.loadInteractionStateFromStorage();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize data service:', error);
      // Fallback to mock mode if database fails
      if (!USE_MOCK_DATA) {
        // console.log('⚠️ Database failed, falling back to in-memory mock data');
        // console.log('🧪 Data Source: In-Memory Mock Data (Fallback)');
        if (this.logbookEntries.length === 0) {
          this.logbookEntries = [...mockLogbookEntries];
        }
        if (this.sharedDreams.length === 0) {
          this.sharedDreams = [...mockSharedDreams];
        }
        this.initializeMockBranchRelationships();
      }
      this.isInitialized = true;
    }
  }

  // Initialize branch relationships from existing parent-child data (mock mode)
  private initializeMockBranchRelationships() {
    const allEntries = [...this.logbookEntries, ...this.sharedDreams];
    
    allEntries.forEach(entry => {
      if (entry.parentId) {
        if (!this.branchRelationships.has(entry.parentId)) {
          this.branchRelationships.set(entry.parentId, []);
        }
        const children = this.branchRelationships.get(entry.parentId)!;
        if (!children.includes(entry.id)) {
          children.push(entry.id);
        }
      }
    });
  }

  // NEW: Helper to enforce privacy rules in mock mode
  private filterEntriesByPrivacy(entries: StreamEntry[], currentUserId?: string): StreamEntry[] {
    return entries.filter(entry =>
      entry.privacy === 'public' || (currentUserId && entry.userId === currentUserId)
    );
  }

  // Method to initialize test resonances after user login
  initializeUserResonances(userId: string) {
    if (!USE_MOCK_DATA && !DEBUG_USE_MOCK_DATA) return;
    
    // Check if user already has resonances
    if (this.userResonances.has(userId) && this.userResonances.get(userId)!.size > 0) {
      return; // User already has resonances, don't overwrite
    }
    
    if (!this.userResonances.has(userId)) {
      this.userResonances.set(userId, new Set());
    }
    
    const userResonances = this.userResonances.get(userId)!;
    const allEntries = [...this.logbookEntries, ...this.sharedDreams];
    
    // Add the first 2-3 entries as resonated for demo purposes
    const entriesToResonate = allEntries.slice(0, 3);
    entriesToResonate.forEach(entry => {
      userResonances.add(entry.id);
      // Update interaction count
      entry.interactions.resonances = (entry.interactions.resonances || 0) + 1;
    });
    
    // console.log(`🧪 Initialized ${entriesToResonate.length} test resonances for user: ${userId}`);
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

  private async refreshInteractionCache(entryIds: string[], userId?: string): Promise<void> {
    if (!this.database || USE_MOCK_DATA) return;

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
    if (USE_MOCK_DATA || !this.database) {
      return entries; // Mock data already has interactions
    }

    const entryIds = entries.map(e => e.id);
    
    // Refresh cache if needed
    if (!this.isCacheValid() || entryIds.some(id => !this.interactionCountsCache.has(id))) {
      await this.refreshInteractionCache(entryIds, userId);
    }

    // Enrich entries with cached interaction data
    return entries.map(entry => {
      const counts = this.interactionCountsCache.get(entry.id);
      if (counts) {
        entry.interactions = {
          resonances: counts.resonanceCount,
          branches: counts.branchCount,
          amplifications: counts.amplificationCount,
          shares: counts.shareCount
        };
      }
      return entry;
    });
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
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockLogbookState;
    }
    
    const response = await fetch(`${API_BASE_URL}/logbook/state`);
    const data = await response.json();
    return data;
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockNetworkStatus;
    }
    
    const response = await fetch(`${API_BASE_URL}/network/status`);
    const data = await response.json();
    return data;
  }

  async getSystemVitals(): Promise<SystemVital[]> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockSystemVitals;
    }
    
    const response = await fetch(`${API_BASE_URL}/system/vitals`);
    const data = await response.json();
    return data;
  }

  async getActiveAgents(): Promise<ActiveAgent[]> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockActiveAgents;
    }
    
    const response = await fetch(`${API_BASE_URL}/agents/active`);
    const data = await response.json();
    return data;
  }

  async getLogbookEntries(page: number = 1, limit: number = 10): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Sort by timestamp desc (newest first) and build threaded structure
      const sortedEntries = [...this.logbookEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
    
    try {
      const entries = await this.database.getEntries('logbook', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // Enrich with interaction data and build threaded structure
      const currentUser = authService.getCurrentUser();
      const enrichedEntries = await this.enrichEntriesWithInteractions(entries, currentUser?.id);
      return this.buildThreadedEntries(enrichedEntries);
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Sort fallback data too
      const sortedEntries = [...this.logbookEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
  }

  // Dream Data
  async getDreamStateMetrics(): Promise<DreamStateMetrics> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockDreamStateMetrics;
    }
    
    const response = await fetch(`${API_BASE_URL}/dreams/metrics`);
    const data = await response.json();
    return data;
  }

  async getActiveDreamers(): Promise<ActiveDreamer[]> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockActiveDreamers;
    }
    
    const response = await fetch(`${API_BASE_URL}/dreams/active-dreamers`);
    const data = await response.json();
    return data;
  }

  async getSharedDreams(page: number = 1, limit: number = 10): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Sort by timestamp desc (newest first) and build threaded structure
      const sortedEntries = [...this.sharedDreams].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
    
    try {
      const entries = await this.database.getEntries('dream', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // Enrich with interaction data and build threaded structure
      const currentUser = authService.getCurrentUser();
      const enrichedEntries = await this.enrichEntriesWithInteractions(entries, currentUser?.id);
      return this.buildThreadedEntries(enrichedEntries);
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Sort fallback data too
      const sortedEntries = [...this.sharedDreams].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
  }

  // Get all stream entries (for ResonanceField) - combines logbook and dreams
  async getStreamEntries(): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Combine both arrays, apply privacy filter, and sort by timestamp desc (newest first)
      const currentUser = authService.getCurrentUser();
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const visibleEntries = this.filterEntriesByPrivacy(allEntries, currentUser?.id);
      const sortedEntries = visibleEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
    
    try {
      // Get entries from both types and combine
      const [logbookEntries, dreamEntries] = await Promise.all([
        this.database.getEntries('logbook', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' }),
        this.database.getEntries('dream', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' })
      ]);
      
      // Combine and sort by timestamp
      const allEntries = [...logbookEntries, ...dreamEntries];
      const sortedEntries = allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Enrich with interaction data and build threaded structure
      const currentUser = authService.getCurrentUser();
      const enrichedEntries = await this.enrichEntriesWithInteractions(sortedEntries, currentUser?.id);
      return this.buildThreadedEntries(enrichedEntries);
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Fallback: combine mock data and sort
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const sortedEntries = allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return this.buildThreadedEntries(sortedEntries);
    }
  }

  // ========== EFFICIENT ENTRY TYPE DETECTION ==========

  // Quick method to determine entry type without full fetch
  async getEntryType(entryId: string): Promise<'logbook' | 'dream' | null> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      // Check in logbook entries first
      const logbookEntry = this.logbookEntries.find(e => e.id === entryId);
      if (logbookEntry) {
        return 'logbook';
      }
      
      // Check in shared dreams
      const dreamEntry = this.sharedDreams.find(e => e.id === entryId);
      if (dreamEntry) {
        return 'dream';
      }
      
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
  async getResonatedEntries(userId: string): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      
      // Get user's resonated entry IDs
      const userResonances = this.userResonances.get(userId) || new Set();
      
      // Find all entries that user has resonated with and apply privacy filter
      const currentUser = authService.getCurrentUser();
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const resonatedEntries = this.filterEntriesByPrivacy(
        allEntries.filter(entry => userResonances.has(entry.id)),
        currentUser?.id
      );
      
      // Sort by timestamp desc (newest first)
      return resonatedEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    
    try {
      // Get user's resonated entry IDs from database
      const resonatedEntryIds = await this.database.getUserResonances(userId);
      
      if (resonatedEntryIds.length === 0) {
        return [];
      }
      
      // Batch fetch all resonated entries for better performance
      const resonatedEntries: StreamEntry[] = [];
      
      // Use Promise.allSettled to handle any individual entry fetch failures gracefully
      const entryPromises = resonatedEntryIds.map(async (entryId) => {
        try {
          const entry = await this.database!.getEntryById(entryId);
          return entry;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch resonated entry ${entryId}:`, error);
          return null;
        }
      });
      
      const entryResults = await Promise.allSettled(entryPromises);
      
      // Collect successful results
      entryResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          resonatedEntries.push(result.value);
        }
      });
      
      // Sort by timestamp desc (newest first)
      return resonatedEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('❌ Database error fetching resonated entries:', error);
      return [];
    }
  }

  async getAmplifiedEntries(userId: string): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      
      // Get user's amplified entry IDs
      const userAmplifications = this.userAmplifications.get(userId) || new Set();
      
      // Find all entries that user has amplified and apply privacy filter
      const currentUser = authService.getCurrentUser();
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const amplifiedEntries = this.filterEntriesByPrivacy(
        allEntries.filter(entry => userAmplifications.has(entry.id)),
        currentUser?.id
      );
      
      // Sort by timestamp desc (newest first)
      return amplifiedEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    
    try {
      // Get user's amplified entry IDs from database
      const amplifiedEntryIds = await this.database.getUserAmplifications(userId);
      
      if (amplifiedEntryIds.length === 0) {
        return [];
      }
      
      // Batch fetch all amplified entries for better performance
      const amplifiedEntries: StreamEntry[] = [];
      
      // Use Promise.allSettled to handle any individual entry fetch failures gracefully
      const entryPromises = amplifiedEntryIds.map(async (entryId) => {
        try {
          const entry = await this.database!.getEntryById(entryId);
          return entry;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch amplified entry ${entryId}:`, error);
          return null;
        }
      });
      
      const entryResults = await Promise.allSettled(entryPromises);
      
      // Collect successful results
      entryResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          amplifiedEntries.push(result.value);
        }
      });
      
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
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockDreamAnalytics;
    }
    
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
    let currentUser = authService.getCurrentUser();
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
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay(300);
      
      // Create entry with mock ID for in-memory storage
      const newEntry: StreamEntry = {
        id: `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...entryData
      };
      
      // Add to appropriate storage
      if (mode === 'logbook') {
        this.logbookEntries.unshift(newEntry);
        authService.updateUserStats('entries');
      } else {
        this.sharedDreams.unshift(newEntry);
        authService.updateUserStats('dreams');
      }
      
      return newEntry;
    }
    
    try {
      // Use database
      const newEntry = await this.database.createEntry(entryData);
      authService.updateUserStats(mode === 'logbook' ? 'entries' : 'dreams');
      
      // Clear cache to force refresh on next fetch
      this.lastCacheUpdate = 0;
      
      return newEntry;
    } catch (error) {
      console.error('❌ Database error during submission, falling back to mock:', error);
      
      // Fallback to in-memory storage
      const newEntry: StreamEntry = {
        id: `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...entryData
      };
      
      if (mode === 'logbook') {
        this.logbookEntries.unshift(newEntry);
      } else {
        this.sharedDreams.unshift(newEntry);
      }
      
      return newEntry;
    }
  }

  async resonateWithEntry(entryId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to resonate');
    }

    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      
      // Check if user has already resonated
      if (!this.userResonances.has(currentUser.id)) {
        this.userResonances.set(currentUser.id, new Set());
      }
      
      const userResonances = this.userResonances.get(currentUser.id)!;
      const wasAlreadyResonated = userResonances.has(entryId);
      
      if (wasAlreadyResonated) {
        // User already resonated, so remove resonance (UNRESONATING)
        userResonances.delete(entryId);
        this.updateEntryInteraction(entryId, 'resonances', -1);
        // console.log(`🔇 DataService: User unresonated from entry ${entryId} (${userResonances.size} total)`);
        return false;
      } else {
        // Add resonance (RESONATING)
        userResonances.add(entryId);
        this.updateEntryInteraction(entryId, 'resonances', 1);
        authService.updateUserStats('connections');
        // console.log(`🔊 DataService: User resonated with entry ${entryId} (${userResonances.size} total)`);
        return true;
      }
    }
    
    try {
      // Use new efficient toggle method
      const newState = await this.database.toggleUserResonance(currentUser.id, entryId);
      
      if (newState) {
        authService.updateUserStats('connections');
        // console.log(`🔊 DataService: User resonated with entry ${entryId} (database)`);
      } else {
        // console.log(`🔇 DataService: User unresonated from entry ${entryId} (database)`);
      }
      
      // Clear cache to force refresh
      this.lastCacheUpdate = 0;
      this.interactionCountsCache.delete(entryId);
      
      if (this.userInteractionStatesCache.has(currentUser.id)) {
        this.userInteractionStatesCache.get(currentUser.id)?.delete(entryId);
      }
      
      return newState;
    } catch (error) {
      console.error('❌ Database error during resonance, falling back to mock:', error);
      // Fallback to in-memory handling (same logic as above)
      if (!this.userResonances.has(currentUser.id)) {
        this.userResonances.set(currentUser.id, new Set());
      }
      
      const userResonances = this.userResonances.get(currentUser.id)!;
      const wasAlreadyResonated = userResonances.has(entryId);
      
      if (wasAlreadyResonated) {
        userResonances.delete(entryId);
        this.updateEntryInteraction(entryId, 'resonances', -1);
        // console.log(`🔇 DataService: User unresonated from entry ${entryId} (fallback)`);
        return false;
      } else {
        userResonances.add(entryId);
        this.updateEntryInteraction(entryId, 'resonances', 1);
        authService.updateUserStats('connections');
        // console.log(`🔊 DataService: User resonated with entry ${entryId} (fallback)`);
        return true;
      }
    }
  }

  async amplifyEntry(entryId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to amplify');
    }

    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      
      // Check if user has already amplified
      if (!this.userAmplifications.has(currentUser.id)) {
        this.userAmplifications.set(currentUser.id, new Set());
      }
      
      const userAmplifications = this.userAmplifications.get(currentUser.id)!;
      if (userAmplifications.has(entryId)) {
        // User already amplified, so remove amplification
        userAmplifications.delete(entryId);
        this.updateEntryInteraction(entryId, 'amplifications', -1);
        this.updateEntryAmplified(entryId, false);
        this.saveInteractionStateToStorage();
        return false;
      } else {
        // Add amplification
        userAmplifications.add(entryId);
        this.updateEntryInteraction(entryId, 'amplifications', 1);
        this.updateEntryAmplified(entryId, true);
        this.saveInteractionStateToStorage();
        authService.updateUserStats('connections');
        return true;
      }
    }
    
    try {
      // Use new efficient toggle method
      const newState = await this.database.toggleUserAmplification(currentUser.id, entryId);
      
      if (newState) {
        authService.updateUserStats('connections');
      }
      
      // Clear cache to force refresh
      this.lastCacheUpdate = 0;
      this.interactionCountsCache.delete(entryId);
      
      if (this.userInteractionStatesCache.has(currentUser.id)) {
        this.userInteractionStatesCache.get(currentUser.id)?.delete(entryId);
      }
      
      return newState;
    } catch (error) {
      console.error('❌ Database error during amplification, falling back to mock:', error);
      // Fallback to in-memory handling
      if (!this.userAmplifications.has(currentUser.id)) {
        this.userAmplifications.set(currentUser.id, new Set());
      }
      
      const userAmplifications = this.userAmplifications.get(currentUser.id)!;
      if (userAmplifications.has(entryId)) {
        userAmplifications.delete(entryId);
        this.updateEntryInteraction(entryId, 'amplifications', -1);
        this.updateEntryAmplified(entryId, false);
        this.saveInteractionStateToStorage();
        return false;
      } else {
        userAmplifications.add(entryId);
        this.updateEntryInteraction(entryId, 'amplifications', 1);
        this.updateEntryAmplified(entryId, true);
        this.saveInteractionStateToStorage();
        authService.updateUserStats('connections');
        return true;
      }
    }
  }

  async createBranch(parentId: string, childContent: string): Promise<StreamEntry> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to create branches');
    }
    
    // Create the child entry first
    const parentEntry = await this.getEntryById(parentId);
    if (!parentEntry) {
      throw new Error('Parent entry not found');
    }
    
    const branchEntry: Omit<StreamEntry, 'id'> = {
      parentId: parentId,
      children: [],
      depth: parentEntry.depth + 1,
      type: "BRANCH THREAD",
      agent: currentUser.username,
      username: currentUser.username,
      connections: 0,
      metrics: { c: 0.7, r: 0.7, x: 0.7 },
      timestamp: formatTimestamp(),
      content: childContent,
      actions: ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
      privacy: parentEntry.privacy,
      entryType: (parentEntry.entryType as JournalMode) ?? (
        parentEntry.type.toLowerCase().includes('dream') ? 'dream' : 'logbook'
      ),
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
    
    if (USE_MOCK_DATA || !this.database) {
      // Mock implementation
      const newBranch: StreamEntry = {
        id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...branchEntry
      };
      
      // Add to appropriate storage and update parent
      if (parentEntry.type.toLowerCase().includes('dream')) {
        this.sharedDreams.push(newBranch);
      } else {
        this.logbookEntries.push(newBranch);
      }
      
      // Update parent's children array and interactions
      const parent = [...this.logbookEntries, ...this.sharedDreams].find(e => e.id === parentId);
      if (parent) {
        if (!parent.children.includes(newBranch.id)) {
          parent.children.push(newBranch.id);
        }
        parent.interactions.branches = (parent.interactions.branches || 0) + 1;
      }
      
      // Update branch relationships tracking
      if (!this.branchRelationships.has(parentId)) {
        this.branchRelationships.set(parentId, []);
      }
      this.branchRelationships.get(parentId)!.push(newBranch.id);
      
      authService.updateUserStats('entries');
      return newBranch;
    }
    
    try {
      // Create the branch entry in database
      const newBranch = await this.database.createEntry(branchEntry);
      
      // Create the branch relationship
      await this.database.createBranch(parentId, newBranch.id);
      
      // Clear cache to force refresh
      this.lastCacheUpdate = 0;
      this.interactionCountsCache.delete(parentId);
      
      authService.updateUserStats('entries');
      return newBranch;
    } catch (error) {
      console.error('❌ Database error during branch creation:', error);
      throw new Error(`Failed to create branch: ${error}`);
    }
  }

  // ========== USER INTERACTION STATE METHODS ==========

  async getUserInteractionState(userId: string, entryId: string): Promise<UserInteractionState> {
    if (USE_MOCK_DATA || !this.database) {
      return {
        hasResonated: this.hasUserResonated(userId, entryId),
        hasAmplified: this.hasUserAmplified(userId, entryId)
      };
    }
    
    // Check cache first
    const userCache = this.userInteractionStatesCache.get(userId);
    if (userCache && userCache.has(entryId) && this.isCacheValid()) {
      return userCache.get(entryId)!;
    }
    
    // Fetch from database
    try {
      const states = await this.database.getUserInteractionStates(userId, [entryId]);
      const state = states.get(entryId) || { hasResonated: false, hasAmplified: false };
      
      // Update cache
      if (!this.userInteractionStatesCache.has(userId)) {
        this.userInteractionStatesCache.set(userId, new Map());
      }
      this.userInteractionStatesCache.get(userId)!.set(entryId, state);
      
      return state;
    } catch (error) {
      console.error('❌ Error fetching user interaction state:', error);
      return { hasResonated: false, hasAmplified: false };
    }
  }

  async getEntryById(entryId: string): Promise<StreamEntry | null> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();

    if (USE_MOCK_DATA || !this.database) {
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const entry = allEntries.find(e => e.id === entryId) || null;
      if (!entry) return null;
      const [enriched] = await this.enrichEntriesWithInteractions([entry], currentUser?.id);
      return enriched;
    }

    try {
      const entry = await this.database.getEntryById(entryId);
      if (!entry) return null;
      const [enriched] = await this.enrichEntriesWithInteractions([entry], currentUser?.id);
      return enriched;
    } catch (error) {
      console.error('❌ Error fetching entry by ID:', error);
      return null;
    }
  }

  // ========== LEGACY METHODS (for backward compatibility) ==========

  // Helper methods for updating entry interactions (legacy)
  private updateEntryInteraction(entryId: string, type: keyof StreamEntry['interactions'], delta: number): void {
    // Update in logbook entries
    const logbookEntry = this.logbookEntries.find(entry => entry.id === entryId);
    if (logbookEntry) {
      logbookEntry.interactions[type] = Math.max(0, logbookEntry.interactions[type] + delta);
      return;
    }
    
    // Update in shared dreams
    const dreamEntry = this.sharedDreams.find(entry => entry.id === entryId);
    if (dreamEntry) {
      dreamEntry.interactions[type] = Math.max(0, dreamEntry.interactions[type] + delta);
    }
  }

  private updateEntryAmplified(entryId: string, isAmplified: boolean): void {
    // Update in logbook entries
    const logbookEntry = this.logbookEntries.find(entry => entry.id === entryId);
    if (logbookEntry) {
      logbookEntry.isAmplified = isAmplified;
      return;
    }
    
    // Update in shared dreams
    const dreamEntry = this.sharedDreams.find(entry => entry.id === entryId);
    if (dreamEntry) {
      dreamEntry.isAmplified = isAmplified;
    }
  }

  // Get user-specific data (legacy)
  async getUserResonatedEntries(userId: string): Promise<string[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      const userResonances = this.userResonances.get(userId);
      return userResonances ? Array.from(userResonances) : [];
    }
    
    try {
      return await this.database.getUserResonances(userId);
    } catch (error) {
      console.error('❌ Database error fetching user resonances:', error);
      const userResonances = this.userResonances.get(userId);
      return userResonances ? Array.from(userResonances) : [];
    }
  }

  hasUserResonated(userId: string, entryId: string): boolean {
    // In mock mode, check the local maps
    if (USE_MOCK_DATA || !this.database) {
      const userResonances = this.userResonances.get(userId);
      return userResonances ? userResonances.has(entryId) : false;
    }
    
    // In database mode, this method is deprecated in favor of getEntryDetailsWithContext
    // which provides fresh interaction states. For backward compatibility, return false.
    // console.warn('hasUserResonated called in database mode - use getEntryDetailsWithContext instead');
    return false;
  }

  hasUserAmplified(userId: string, entryId: string): boolean {
    // In mock mode, check the local maps
    if (USE_MOCK_DATA || !this.database) {
      const userAmplifications = this.userAmplifications.get(userId);
      return userAmplifications ? userAmplifications.has(entryId) : false;
    }
    
    // In database mode, this method is deprecated in favor of getEntryDetailsWithContext
    // which provides fresh interaction states. For backward compatibility, return false.
    // console.warn('hasUserAmplified called in database mode - use getEntryDetailsWithContext instead');
    return false;
  }

  // ========== FEED-SPECIFIC METHODS ==========

  // Get all entries as individual posts (flattened, like Twitter/X)
  async getFlattenedStreamEntries(page: number = 1, limit: number = 20): Promise<StreamEntry[]> {
    await this.initializeData();

    // Basic bounds-check so callers don't accidentally request 0 or negative limits
    if (limit <= 0) limit = 20;
    if (page <= 0) page = 1;

    const offset = (page - 1) * limit;

    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Combine both arrays, apply privacy filter, and sort by timestamp desc (newest first)
      const currentUser = authService.getCurrentUser();
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const visibleEntries = this.filterEntriesByPrivacy(allEntries, currentUser?.id);
      const sortedEntries = visibleEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      // Slice for pagination and return WITHOUT threading – each post appears individually
      const pagedEntries = sortedEntries.slice(offset, offset + limit);

      // Enrich with interaction data but DON'T build threading
      return await this.enrichEntriesWithInteractions(pagedEntries, currentUser?.id);
    }

    try {
      // Get entries from both types and combine
      const [logbookEntries, dreamEntries] = await Promise.all([
        this.database.getEntries('logbook', { page, limit, sortBy: 'timestamp', sortOrder: 'desc' }),
        this.database.getEntries('dream', {   page, limit, sortBy: 'timestamp', sortOrder: 'desc' })
      ]);

      // Combine and sort by timestamp
      const allEntries = [...logbookEntries, ...dreamEntries];
      const sortedEntries = allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Paginate slice to respect requested limit
      const pagedEntries = sortedEntries.slice(offset, offset + limit);

      // Enrich with interaction data but DON'T build threading
      const currentUser = authService.getCurrentUser();
      return await this.enrichEntriesWithInteractions(pagedEntries, currentUser?.id);
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Fallback: combine mock data and sort
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const sortedEntries = allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sortedEntries.slice(offset, offset + limit);
    }
  }

  // Get flattened logbook entries (individual posts, no threading)
  async getFlattenedLogbookEntries(page: number = 1, limit: number = 100): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Sort by timestamp desc (newest first) but DON'T build threading
      const sortedEntries = [...this.logbookEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sortedEntries;
    }
    
    try {
      const entries = await this.database.getEntries('logbook', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // Enrich with interaction data but DON'T build threading
      const currentUser = authService.getCurrentUser();
      return await this.enrichEntriesWithInteractions(entries, currentUser?.id);
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Sort fallback data too
      const sortedEntries = [...this.logbookEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sortedEntries;
    }
  }

  // Get direct children of a specific post
  async getDirectChildren(parentId: string): Promise<StreamEntry[]> {
    await this.initializeData();
    
    // ---------------- MOCK MODE ----------------
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Find all entries that have this parentId
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const children = allEntries.filter(entry => entry.parentId === parentId);
      // Sort by timestamp (oldest first for conversation flow)
      return children.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }
    
    // ---------------- PRODUCTION (SUPABASE) ----------------
    try {
      // 1) Prefer fetching children via the dedicated entry_branches table (new system)
      const childIds = await this.database.getBranchChildren(parentId);
      let children: StreamEntry[] = [];

      if (childIds.length > 0) {
        // Fetch the full entries in parallel
        const fetched = await Promise.all(childIds.map(id => this.database!.getEntryById(id)));
        children = fetched.filter((e): e is StreamEntry => e !== null);
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
      const currentUser = authService.getCurrentUser();
      return await this.enrichEntriesWithInteractions(children, currentUser?.id);
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

  // ========== DEBUG METHODS ==========
  
  // Initialize some test resonances for demo/testing purposes
  private initializeTestResonances() {
    if (!USE_MOCK_DATA && !DEBUG_USE_MOCK_DATA) return;
    
    // Get current user from auth service to set up test resonances
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const userId = currentUser.id;
      
      if (!this.userResonances.has(userId)) {
        this.userResonances.set(userId, new Set());
      }
      
      const userResonances = this.userResonances.get(userId)!;
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      
      // Add the first 2-3 entries as resonated for demo purposes
      const entriesToResonate = allEntries.slice(0, 3);
      entriesToResonate.forEach(entry => {
        userResonances.add(entry.id);
        // Update interaction count
        entry.interactions.resonances = (entry.interactions.resonances || 0) + 1;
      });
      
      // console.log(`🧪 Initialized ${entriesToResonate.length} test resonances for user: ${userId}`);
    }
    
    // Also add some generic demo users for when no one is logged in
    const demoUsers = ['demo_user', 'test_user', 'admin', 'user'];
    const allEntries = [...this.logbookEntries, ...this.sharedDreams];
    
    demoUsers.forEach(userId => {
      if (!this.userResonances.has(userId)) {
        this.userResonances.set(userId, new Set());
      }
      
      const userResonances = this.userResonances.get(userId)!;
      
      // Add different entries for different demo users
      const startIndex = demoUsers.indexOf(userId);
      const entriesToResonate = allEntries.slice(startIndex, startIndex + 2);
      entriesToResonate.forEach(entry => {
        userResonances.add(entry.id);
      });
    });
  }

  // Debug method to manually add a resonance (for testing)
  debugAddResonance(userId: string, entryId: string) {
    if (!this.userResonances.has(userId)) {
      this.userResonances.set(userId, new Set());
    }
    this.userResonances.get(userId)!.add(entryId);
    this.updateEntryInteraction(entryId, 'resonances', 1);
    // console.log(`🐛 DEBUG: Added resonance ${entryId} for user ${userId}`);
  }

  // Debug method to get current resonances for a user (for testing)
  debugGetUserResonances(userId: string): string[] {
    if (!USE_MOCK_DATA && !DEBUG_USE_MOCK_DATA) {
      // console.log('🚫 Debug methods only available in mock mode');
      return [];
    }
    
    const userResonances = this.userResonances.get(userId);
    return userResonances ? Array.from(userResonances) : [];
  }

  // NEW: Profile update functionality
  async updateUserProfile(updates: { name?: string; bio?: string; location?: string }): Promise<User> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated. Cannot update profile.');
    }

    // ---- Sanitisation & Validation ----
    const NAME_MAX_LENGTH = 50;
    const BIO_MAX_LENGTH = 160;
    const LOCATION_MAX_LENGTH = 30;

    // Clone to avoid mutating caller object
    const cleaned: { name?: string; bio?: string; location?: string } = { ...updates };

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

    if (USE_MOCK_DATA || !this.database) {
      const user = mockUsers.find(u => u.id === currentUser.id);
      if (user) {
        Object.assign(user, cleaned, { updated_at: new Date().toISOString() });
        // console.log(`[Mock] Updated profile for user ${currentUser.id}:`, cleaned);
        return Promise.resolve(user);
      }
      throw new Error('User not found in mock data.');
    }
    
    if (!this.database.updateUser) {
        throw new Error('User update not supported by current database provider');
    }
    return this.database.updateUser(currentUser.id, cleaned);
  }

  async getUserProfile(userId: string): Promise<User | null> {
    await this.initializeData();

    if (USE_MOCK_DATA || !this.database) {
      const user = mockUsers.find(u => u.id === userId);
      return Promise.resolve(user || null);
    }
    
    if (!this.database.getUser) {
      throw new Error('User retrieval not supported by current database provider');
    }
    return this.database.getUser(userId);
  }

  // === FOLLOW SYSTEM METHODS ===

  async followUser(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.error('Authentication error: Cannot follow user without being logged in.');
      return false;
    }
    if (currentUser.id === followedId) {
      console.warn('User cannot follow themselves.');
      return false;
    }

    if (USE_MOCK_DATA || !this.database || !this.database.followUser) {
      // console.log('📝 Follow user in mock mode (no persistence):', { followerId: currentUser.id, followedId });
      return true;
    }
    
    return this.database.followUser(currentUser.id, followedId);
  }

  async unfollowUser(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.error('Authentication error: Cannot unfollow user without being logged in.');
      return false;
    }

    if (USE_MOCK_DATA || !this.database || !this.database.unfollowUser) {
      // console.log('📝 Unfollow user in mock mode (no persistence):', { followerId: currentUser.id, followedId });
      return true;
    }
    
    return this.database.unfollowUser(currentUser.id, followedId);
  }

  async isFollowing(followedId: string): Promise<boolean> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return false;

    if (USE_MOCK_DATA || !this.database || !this.database.isFollowing) {
      return Promise.resolve(currentUser.id === 'user-1' && followedId === 'user-2');
    }
    
    return this.database.isFollowing(currentUser.id, followedId);
  }

  async getFollowers(userId: string, limit: number = 50, offset: number = 0) {
    await this.initializeData();
    if (USE_MOCK_DATA || !this.database || !this.database.getFollowers) {
      return [];
    }
    return this.database.getFollowers(userId, limit, offset);
  }

  async getFollowing(userId: string, limit: number = 50, offset: number = 0) {
    await this.initializeData();
    if (USE_MOCK_DATA || !this.database || !this.database.getFollowing) {
      return [];
    }
    return this.database.getFollowing(userId, limit, offset);
  }

  async getMutualFollows(userId: string, limit: number = 50) {
    await this.initializeData();
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    if (USE_MOCK_DATA || !this.database || !this.database.getMutualFollows) {
      return [];
    }

    // @ts-ignore
    return this.database.getMutualFollows(currentUser.id, userId, limit);
  }

  async getFollowSuggestions(limit: number = 10) {
    await this.initializeData();
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn("Cannot get follow suggestions for a logged-out user.");
      return [];
    }

    if (USE_MOCK_DATA || !this.database || !this.database.getFollowSuggestions) {
      return mockUsers.filter(u => u.id !== currentUser.id).slice(0, limit);
    }
    return this.database.getFollowSuggestions(currentUser.id, limit);
  }

  async bulkCheckFollowing(userIds: string[]): Promise<Map<string, boolean>> {
    await this.initializeData();
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return new Map(userIds.map(id => [id, false]));
    }
    
    if (USE_MOCK_DATA || !this.database || !this.database.bulkCheckFollowing) {
      const result = new Map<string, boolean>();
      userIds.forEach(id => result.set(id, id === 'agent-synthesis'));
      return Promise.resolve(result);
    }
    return this.database.bulkCheckFollowing(currentUser.id, userIds);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await this.initializeData();

    if (USE_MOCK_DATA || !this.database) {
      const user = getMockUserByUsername(username);
      return user || null;
    }

    if (!this.database.getUserByUsername) {
      throw new Error('User retrieval by username not supported by current database provider');
    }
    return this.database.getUserByUsername(username);
  }

  async getUserPostsByUsername(username: string, limit: number = 50): Promise<StreamEntry[]> {
    await this.initializeData();

    if (USE_MOCK_DATA || !this.database) {
      const userPosts = [...this.logbookEntries, ...this.sharedDreams]
        .filter(entry => entry.username === username)
        .slice(0, limit)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // console.log(`📝 Found ${userPosts.length} mock posts for user: ${username}`);
      return userPosts;
    }
    
    if (!this.database.getUserPostsByUsername) {
      throw new Error('User posts retrieval not supported by current database provider');
    }
    return this.database.getUserPostsByUsername(username, limit);
  }

  // Persist interaction state in localStorage for mock mode
  private saveInteractionStateToStorage(): void {
    if (typeof window === 'undefined') return;
    if (!USE_MOCK_DATA) return;
    try {
      const state = {
        userResonances: Object.fromEntries(
          Array.from(this.userResonances.entries()).map(([userId, set]) => [userId, Array.from(set)])
        ),
        userAmplifications: Object.fromEntries(
          Array.from(this.userAmplifications.entries()).map(([userId, set]) => [userId, Array.from(set)])
        ),
      };
      localStorage.setItem('nexusInteractionState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save interaction state:', error);
    }
  }

  private loadInteractionStateFromStorage(): void {
    if (typeof window === 'undefined') return;
    if (!USE_MOCK_DATA) return;
    try {
      const raw = localStorage.getItem('nexusInteractionState');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.userResonances) {
        this.userResonances.clear();
        for (const [userId, ids] of Object.entries(state.userResonances)) {
          this.userResonances.set(userId, new Set(ids as string[]));
        }
      }
      if (state.userAmplifications) {
        this.userAmplifications.clear();
        for (const [userId, ids] of Object.entries(state.userAmplifications)) {
          this.userAmplifications.set(userId, new Set(ids as string[]));
        }
      }
    } catch (error) {
      console.error('Failed to load interaction state:', error);
    }
  }

  // ========== SINGLE SOURCE OF TRUTH FOR ENTRY DETAILS ==========
  
  async getEntryDetailsWithContext(entryId: string): Promise<{
    current: StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean };
    parent: (StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean }) | null;
    children: (StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean })[];
  }> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to view entry details');
    }

    if (USE_MOCK_DATA || !this.database) {
      // Mock mode - get from local data
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      const current = allEntries.find(e => e.id === entryId);
      if (!current) {
        throw new Error('Entry not found');
      }

      const parent = current.parentId ? allEntries.find(e => e.id === current.parentId) || null : null;
      const children = allEntries.filter(e => e.parentId === entryId);

      // Add user interaction states
      const enrichEntry = (entry: StreamEntry) => ({
        ...entry,
        userHasResonated: this.hasUserResonated(currentUser.id, entry.id),
        userHasAmplified: this.hasUserAmplified(currentUser.id, entry.id)
      });

      return {
        current: enrichEntry(current),
        parent: parent ? enrichEntry(parent) : null,
        children: children.map(enrichEntry)
      };
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
   * Replaces: getFlattenedStreamEntries, getLogbookEntries, getSharedDreams, getStreamEntries
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

    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      return this._getPostsMock({
        mode, page: safePage, limit: safeLimit, userId, threaded, sortBy, sortOrder, filters, offset
      });
    }

    try {
      return await this._getPostsDatabase({
        mode, page: safePage, limit: safeLimit, userId, threaded, sortBy, sortOrder, filters, offset
      });
    } catch (error) {
      console.error('❌ Database error in getPosts, falling back to mock data:', error);
      return this._getPostsMock({
        mode, page: safePage, limit: safeLimit, userId, threaded, sortBy, sortOrder, filters, offset
      });
    }
  }

  private async _getPostsMock(options: {
    mode: string;
    page: number;
    limit: number;
    userId?: string;
    threaded: boolean;
    sortBy: string;
    sortOrder: string;
    filters?: any;
    offset: number;
  }): Promise<StreamEntry[]> {
    const { mode, limit, userId, threaded, sortBy, sortOrder, filters, offset } = options;
    const currentUser = authService.getCurrentUser();

    let sourceEntries: StreamEntry[] = [];

    // Select source data based on mode
    switch (mode) {
      case 'feed':
      case 'all':
        sourceEntries = [...this.logbookEntries, ...this.sharedDreams];
        break;
      case 'logbook':
        sourceEntries = [...this.logbookEntries];
        break;
      case 'dream':
        sourceEntries = [...this.sharedDreams];
        break;
      case 'resonated':
        if (!currentUser) return [];
        const userResonances = this.userResonances.get(currentUser.id) || new Set();
        sourceEntries = [...this.logbookEntries, ...this.sharedDreams]
          .filter(entry => userResonances.has(entry.id));
        break;
      case 'amplified':
        if (!currentUser) return [];
        const userAmplifications = this.userAmplifications.get(currentUser.id) || new Set();
        sourceEntries = [...this.logbookEntries, ...this.sharedDreams]
          .filter(entry => userAmplifications.has(entry.id));
        break;
      case 'profile':
        if (!userId) return [];
        sourceEntries = [...this.logbookEntries, ...this.sharedDreams]
          .filter(entry => entry.userId === userId);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    // Apply privacy filter
    const visibleEntries = this.filterEntriesByPrivacy(sourceEntries, currentUser?.id);

    // Apply additional filters
    let filteredEntries = visibleEntries;
    if (filters) {
      filteredEntries = filteredEntries.filter(entry => {
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

    // Sort entries
    const sortedEntries = [...filteredEntries].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'interactions') {
        const aTotal = a.interactions.resonances + a.interactions.amplifications;
        const bTotal = b.interactions.resonances + b.interactions.amplifications;
        comparison = aTotal - bTotal;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const pagedEntries = sortedEntries.slice(offset, offset + limit);

    // Enrich with interaction data
    const enrichedEntries = await this.enrichEntriesWithInteractions(pagedEntries, currentUser?.id);

    // Return threaded or flat based on mode
    return threaded ? this.buildThreadedEntries(enrichedEntries) : enrichedEntries;
  }

  private async _getPostsDatabase(options: {
    mode: string;
    page: number;
    limit: number;
    userId?: string;
    threaded: boolean;
    sortBy: string;
    sortOrder: string;
    filters?: any;
    offset: number;
  }): Promise<StreamEntry[]> {
    const { mode, page, limit, userId, threaded, sortBy, sortOrder, filters } = options;
    const currentUser = authService.getCurrentUser();

    let entries: StreamEntry[] = [];

    // Fetch data based on mode
    switch (mode) {
      case 'feed':
      case 'all':
        const [logbookEntries, dreamEntries] = await Promise.all([
          this.database!.getEntries('logbook', { page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }),
          this.database!.getEntries('dream', { page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' })
        ]);
        entries = [...logbookEntries, ...dreamEntries];
        break;
      case 'logbook':
        entries = await this.database!.getEntries('logbook', { page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
        break;
      case 'dream':
        entries = await this.database!.getEntries('dream', { page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
        break;
      case 'resonated':
        if (!currentUser) return [];
        entries = await this.getResonatedEntries(currentUser.id);
        break;
      case 'amplified':
        if (!currentUser) return [];
        entries = await this.getAmplifiedEntries(currentUser.id);
        break;
      case 'profile':
        if (!userId) return [];
        // Use existing getUserPostsByUsername method instead of non-existent getUserEntries
        entries = await this.getUserPostsByUsername(userId, limit);
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

    // Enrich with interaction data
    const enrichedEntries = await this.enrichEntriesWithInteractions(entries, currentUser?.id);

    // Return threaded or flat based on mode
    return threaded ? this.buildThreadedEntries(enrichedEntries) : enrichedEntries;
  }

}

// Export singleton instance
export const dataService = new DataService();