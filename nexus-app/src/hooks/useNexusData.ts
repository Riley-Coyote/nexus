import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
import { authService } from '../lib/services/supabaseAuthService';
import { userInteractionService, UserInteractionState } from '../lib/services/userInteractionService';
import { StreamEntryData } from '../lib/types';
import { 
  LogbookState, 
  NetworkStatus, 
  SystemVital, 
  ActiveAgent,
  StreamEntry,
  EntryComposerData,
  DreamStateMetrics,
  ActiveDreamer,
  DreamAnalytics,
  JournalMode,
  User,
  AuthState,
  ProfileViewState
} from '../lib/types';
import { mockSystemVitals, mockActiveAgents } from '../lib/data/mockData';

// ✅ GLOBAL SINGLETON: Ensure only one auth initialization happens across all hook instances
let globalAuthInitialization: Promise<() => void> | null = null;
let globalAuthInitialized = false;

export interface NexusData {
  // Authentication
  authState: AuthState;
  currentUser: User | null;
  
  // Logbook data
  logbookState: LogbookState | null;
  networkStatus: NetworkStatus | null;
  systemVitals: SystemVital[];
  activeAgents: ActiveAgent[];
  logbookEntries: StreamEntry[];
  entryComposer: EntryComposerData;
  logbookField: any;
  
  // Dream data
  dreamStateMetrics: DreamStateMetrics | null;
  activeDreamers: ActiveDreamer[];
  sharedDreams: StreamEntry[];
  dreamComposer: EntryComposerData;
  dreamPatterns: any;
  dreamAnalytics: DreamAnalytics | null;
  emergingSymbols: string[];
  
  // Computed data
  resonatedEntries: StreamEntryData[];
  amplifiedEntries: StreamEntryData[];
  
  // Loading states
  isLoading: boolean;
  isLoadingLogbook: boolean;
  isLoadingDreams: boolean;
  isLoadingFeedData: boolean;
  isUserStatesLoaded: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshFeedData: () => Promise<void>;
  refreshLogbookData: () => Promise<void>;
  refreshDreamData: () => Promise<void>;
  refreshResonatedEntries: () => Promise<void>;
  refreshAmplifiedEntries: () => Promise<void>;
  smartRefresh: (entryId: string, refreshType?: 'all' | 'logbook' | 'dream' | 'resonance') => Promise<void>;
  submitEntry: (content: string, type: string, isPublic: boolean, mode: JournalMode) => Promise<void>;
  createBranch: (parentId: string, content: string) => Promise<void>;
  resonateWithEntry: (entryId: string) => Promise<void>;
  amplifyEntry: (entryId: string) => Promise<void>;
  
  // Manual loading methods for specific pages
  ensureResonatedEntriesLoaded: () => Promise<void>;
  ensureAmplifiedEntriesLoaded: () => Promise<void>;
  ensureFeedDataLoaded: () => Promise<void>;
  
  // NEW: Method to append more resonated entries (follows NexusFeed pattern)
  appendResonatedEntries: (page: number, limit?: number) => Promise<StreamEntryData[]>;
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, options?: { name?: string }) => Promise<void>;
  logout: () => void;
  forceAuthRefresh: () => Promise<void>;
  
  // Profile actions
  updateUserProfile: (updates: { name?: string; bio?: string; location?: string }) => Promise<void>;
  
  // Follow system actions
  followUser: (followedId: string) => Promise<boolean>;
  unfollowUser: (followedId: string) => Promise<boolean>;
  isFollowing: (followedId: string) => Promise<boolean>;
  getFollowers: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
  getFollowing: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
  getMutualFollows: (userId: string, limit?: number) => Promise<any[]>;
  getFollowSuggestions: (userId: string, limit?: number) => Promise<any[]>;
  
  // User interaction checks
  hasUserResonated: (entryId: string) => boolean;
  hasUserAmplified: (entryId: string) => boolean;
  
  // UNIFIED PAGINATION API (NEW)
  getPosts: (options: {
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
  }) => Promise<StreamEntryData[]>;
  
  // Feed-specific methods (DEPRECATED - use getPosts instead)
  /** @deprecated Use getPosts({mode: 'feed'}) instead */
  getFlattenedStreamEntries: (page?: number, limit?: number) => Promise<StreamEntryData[]>;
  /** @deprecated Use getPosts({mode: 'logbook'}) instead */
  getFlattenedLogbookEntries: () => Promise<StreamEntryData[]>;
  getDirectChildren: (parentId: string) => Promise<StreamEntryData[]>;
  getParentPost: (childId: string) => Promise<StreamEntryData | null>;
  getEntryType: (entryId: string) => Promise<'logbook' | 'dream' | null>;
  getUserPosts: () => StreamEntry[];
  
  // Threading controls (for advanced users)
  setThreadingMode: (mode: 'dfs' | 'bfs' | 'adaptive') => void;
  getThreadingConfig: () => any;
  
  // Profile viewing state
  profileViewState: ProfileViewState;
  profileUser: User | null;
  profileUserPosts: StreamEntry[];
  
  // Profile viewing methods
  viewUserProfile: (username: string) => Promise<void>;
  viewSelfProfile: () => void;
  getCurrentProfileUser: () => User | null;
}

export const useNexusData = (): NexusData => {
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthLoading: true,
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  });

  // User interaction states - following social media playbook
  const [userInteractionStates, setUserInteractionStates] = useState<Map<string, UserInteractionState>>(new Map());
  const [isUserStatesLoaded, setIsUserStatesLoaded] = useState(false);
  const [currentPostIds, setCurrentPostIds] = useState<string[]>([]);
  
  // Track function calls to reduce excessive logging
  const resonatedCallsRef = useRef<Set<string>>(new Set());
  const amplifiedCallsRef = useRef<Set<string>>(new Set());
  
  // Profile viewing state
  const [profileViewState, setProfileViewState] = useState<ProfileViewState>({
    mode: 'self'
  });
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileUserPosts, setProfileUserPosts] = useState<StreamEntry[]>([]);
  
  // Logbook state
  const [logbookState, setLogbookState] = useState<LogbookState | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [systemVitals, setSystemVitals] = useState<SystemVital[]>(mockSystemVitals);
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>(mockActiveAgents);
  const [logbookEntries, setLogbookEntries] = useState<StreamEntry[]>([]);
  
  // Dream state
  const [dreamStateMetrics, setDreamStateMetrics] = useState<DreamStateMetrics | null>(null);
  const [activeDreamers, setActiveDreamers] = useState<ActiveDreamer[]>([]);
  const [sharedDreams, setSharedDreams] = useState<StreamEntry[]>([]);
  const [dreamAnalytics, setDreamAnalytics] = useState<DreamAnalytics | null>(null);
  
  // Loading states - start as false to avoid hydration mismatch
  const [isLoadingLogbook, setIsLoadingLogbook] = useState(false);
  const [isLoadingDreams, setIsLoadingDreams] = useState(false);
  const [isLoadingFeedData, setIsLoadingFeedData] = useState(false);
  
  // Use ref to track loading state to prevent function recreation
  const isLoadingRef = useRef(false);
  
  // Static data (memoized)
  const entryComposer = useMemo(() => dataService.getEntryComposer('logbook'), []);
  const dreamComposer = useMemo(() => dataService.getEntryComposer('dream'), []);
  const dreamPatterns = useMemo(() => dataService.getDreamPatterns(), []);
  const logbookField = useMemo(() => dataService.getLogbookField(), []);
  const emergingSymbols = useMemo(() => dataService.getEmergingSymbols(), []);
  
  // Resonated entries state
  const [resonatedEntries, setResonatedEntries] = useState<StreamEntryData[]>([]);
  
  // Amplified entries state
  const [amplifiedEntries, setAmplifiedEntries] = useState<StreamEntryData[]>([]);
  
  // Load user resonated entries
  const loadResonatedEntries = useCallback(async () => {
    if (!authState.currentUser) return;
    
    try {
      // Add timeout protection to prevent hanging
      const entriesPromise = dataService.getResonatedEntries(authState.currentUser.id);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading resonated entries timed out')), 8000); // 8 second timeout
      });
      
      const entries = await Promise.race([entriesPromise, timeoutPromise]);
      const entriesData = entries.map(convertToStreamEntryData);
      setResonatedEntries(entriesData);
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error loading resonated entries:', error);
      }
      // Don't throw - this is a background operation that shouldn't break the UI
    }
  }, [authState.currentUser]);
  
  // Load user amplified entries
  const loadAmplifiedEntries = useCallback(async () => {
    if (!authState.currentUser) return;
    
    try {
      // Add timeout protection to prevent hanging
      const entriesPromise = dataService.getAmplifiedEntries(authState.currentUser.id);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading amplified entries timed out')), 8000); // 8 second timeout
      });
      
      const entries = await Promise.race([entriesPromise, timeoutPromise]);
      const entriesData = entries.map(convertToStreamEntryData);
      setAmplifiedEntries(entriesData);
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error loading amplified entries:', error);
      }
      // Don't throw - this is a background operation that shouldn't break the UI
    }
  }, [authState.currentUser]);
  
  // NEW: Unified feed data loader for public entries only (DEPRECATED - use optimized version)
  const loadFeedData = useCallback(async () => {
    // DEPRECATED: This method is kept for fallback only
    // Redirect to optimized version
    console.warn('⚠️ Using deprecated loadFeedData, redirecting to optimized version');
    return loadFeedDataOptimized();
  }, []);

  // OPTIMIZED: Feed data loader that includes user interaction states in single query
  const loadFeedDataOptimized = useCallback(async () => {
    // Prevent concurrent calls using ref
    if (isLoadingRef.current) {
      console.log('📡 Feed data already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      console.log('📡 Loading public feed data with user states (OPTIMIZED)...');
      
      const currentUser = authState.currentUser;
      
      // Use optimized method that gets posts WITH user interaction states in a single query
      const [publicLogbookEntries, publicDreamEntries] = await Promise.all([
        dataService.getPostsWithUserStates({ 
          mode: 'logbook', 
          page: 1, 
          limit: 20, 
          targetUserId: currentUser?.id, // Include user interaction states
          filters: { privacy: 'public' } 
        }),
        dataService.getPostsWithUserStates({ 
          mode: 'dream', 
          page: 1, 
          limit: 20, 
          targetUserId: currentUser?.id, // Include user interaction states
          filters: { privacy: 'public' } 
        })
      ]);
      
      // Store public entries for feed (no user filtering needed)
      setLogbookEntries(publicLogbookEntries);
      setSharedDreams(publicDreamEntries);
      // Clear allDreams to prevent the filtering effect from running
      setAllDreams([]);
      
      // Since we got user interaction states in the query, we can mark them as loaded
      setIsUserStatesLoaded(true);
      
      console.log(`✅ OPTIMIZED: Loaded ${publicLogbookEntries.length} public logbook + ${publicDreamEntries.length} public dream entries WITH user states`);
      
    } catch (error) {
      console.error('Failed to load optimized feed data:', error);
      // Fall back to empty arrays instead of calling old method to prevent infinite loops
      setLogbookEntries([]);
      setSharedDreams([]);
      setAllDreams([]);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [authState.currentUser]);
  
  // Load logbook data (user-specific)
  const loadLogbookData = useCallback(async () => {
    setIsLoadingLogbook(true);
    try {
      const [state, network, vitals, agents, entries] = await Promise.all([
        dataService.getLogbookState(),
        dataService.getNetworkStatus(),
        dataService.getSystemVitals(),
        dataService.getActiveAgents(),
        // Use optimized getPosts method instead of getFlattenedLogbookEntries
        dataService.getPosts({ mode: 'logbook', page: 1, limit: 20, threaded: false })
      ]);
      
      setLogbookState(state);
      setNetworkStatus(network);
      setSystemVitals(vitals);
      setActiveAgents(agents);
      // Filter entries by current user
      const userId = authState.currentUser?.id;
      const filteredEntries = userId ? entries.filter(entry => entry.userId === userId) : [];
      setLogbookEntries(filteredEntries);
    } catch (error) {
      console.error('Failed to load logbook data:', error);
    } finally {
      setIsLoadingLogbook(false);
    }
  }, [authState.currentUser]);
  
  // Store all dreams (unfiltered) for proper filtering
  const [allDreams, setAllDreams] = useState<StreamEntry[]>([]);
  
  // Load dream data (user-specific)
  const loadDreamData = useCallback(async () => {
    setIsLoadingDreams(true);
    try {
      const [metrics, dreamers, dreams, analytics] = await Promise.all([
        dataService.getDreamStateMetrics(),
        dataService.getActiveDreamers(),
        // Use optimized getPosts method instead of getSharedDreams
        dataService.getPosts({ mode: 'dream', page: 1, limit: 20, threaded: false }),
        dataService.getDreamAnalytics()
      ]);
      
      setDreamStateMetrics(metrics);
      setActiveDreamers(dreamers);
      // Store all dreams for filtering
      setAllDreams(dreams);
      setDreamAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load dream data:', error);
    } finally {
      setIsLoadingDreams(false);
    }
  }, []);
  
  // Filter dreams whenever auth state or all dreams change (only for non-feed views)
  useEffect(() => {
    // Only filter if we have allDreams data (not feed data)
    if (allDreams.length === 0) return;
    
    const userId = authState.currentUser?.id;
    if (userId && allDreams.length > 0) {
      const filteredDreams = allDreams.filter(entry => entry.userId === userId);
      setSharedDreams(filteredDreams);
    } else if (!userId) {
      // If no user is logged in, show empty array
      setSharedDreams([]);
    }
  }, [authState.currentUser, allDreams]);
  
  // Refresh all data (now using optimized flow by default)
  const refreshData = useCallback(async () => {
    // Check if we're currently on feed path using a more stable approach
    const isOnFeedPath = typeof window !== 'undefined' && 
      (window.location.pathname === '/' || window.location.pathname === '/feed');
    
    if (isOnFeedPath) {
      // For feed view: use optimized loader that includes user states
      await loadFeedDataOptimized();
    } else {
      // For logbook/dream views: load user-specific data
      await Promise.all([loadLogbookData(), loadDreamData()]);
    }
  }, [loadFeedDataOptimized, loadLogbookData, loadDreamData]);

  // OPTIMIZED: Feed-specific refresh that includes user interaction states in single query
  const refreshFeedData = useCallback(async () => {
    await loadFeedDataOptimized();
  }, [loadFeedDataOptimized]);

  // ========== GRANULAR REFRESH METHODS ==========
  
  // Refresh only logbook data (for logbook-specific actions)
  const refreshLogbookData = useCallback(async () => {
    await loadLogbookData();
  }, [loadLogbookData]);

  // Refresh only dream data (for dream-specific actions)
  const refreshDreamData = useCallback(async () => {
    await loadDreamData();
  }, [loadDreamData]);

  // Refresh only resonated entries (for resonance actions)
  const refreshResonatedEntries = useCallback(async () => {
    await loadResonatedEntries();
  }, [loadResonatedEntries]);

  // Smart refresh: only refresh what's needed based on entry type
  const smartRefresh = useCallback(async (entryId: string, refreshType?: 'all' | 'logbook' | 'dream' | 'resonance') => {
    if (refreshType === 'all') {
      await refreshData();
      await refreshResonatedEntries();
      return;
    }

    const promises: Promise<void>[] = [];
    
    if (refreshType === 'logbook') {
      promises.push(refreshLogbookData());
    } else if (refreshType === 'dream') {
      promises.push(refreshDreamData());
    }
    
    if (refreshType === 'resonance') {
      promises.push(refreshResonatedEntries());
    }

    await Promise.all(promises);
  }, [refreshData, refreshLogbookData, refreshDreamData, refreshResonatedEntries]);

  // Submit new entry
  const submitEntry = useCallback(async (content: string, type: string, isPublic: boolean, mode: JournalMode) => {
    try {
      const newEntry = await dataService.submitEntry(content, type, isPublic, mode);
      
      // Smart refresh: only refresh the relevant mode
      if (mode === 'logbook') {
        await refreshLogbookData();
      } else {
        await refreshDreamData();
      }
    } catch (error) {
      console.error('Failed to submit entry:', error);
      throw error;
    }
  }, [refreshLogbookData, refreshDreamData]);

  // Create branch
  const createBranch = useCallback(async (parentId: string, content: string) => {
    try {
      // Step 1: Create the branch (critical operation)
      await dataService.createBranch(parentId, content);
      
      // Step 2: Use appropriate refresh method based on current path
      try {
        // Add timeout wrapper for refresh operations
        const refreshWithTimeout = async (operation: () => Promise<void>, timeoutMs: number = 10000) => {
          return Promise.race([
            operation(),
            new Promise<void>((_, reject) => {
              setTimeout(() => reject(new Error('Refresh operation timed out')), timeoutMs);
            })
          ]);
        };
        
        // Use the appropriate refresh method based on current path
        const isOnFeedPath = typeof window !== 'undefined' && 
          (window.location.pathname === '/' || window.location.pathname === '/feed');
        
        if (isOnFeedPath) {
          console.log('🔄 Refreshing feed data after branch creation');
          await refreshWithTimeout(refreshFeedData, 15000);
        } else {
          console.log('🔄 Refreshing page data after branch creation');
          await refreshWithTimeout(refreshData, 15000);
        }
        
        // Update auth state to reflect new stats
        setAuthState(authService.getAuthState());
      } catch (refreshError) {
        console.warn('Refresh after branch creation failed (non-critical):', refreshError);
        // Don't throw - this is a background operation
      }
      
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error; // This will be caught by the UI error handling
    }
  }, [refreshData, refreshFeedData]);
  
  // User interaction actions - following social media playbook pattern
  const resonateWithEntry = useCallback(async (entryId: string) => {
    if (!authState.currentUser) {
      console.log(`⏭️ Cannot resonate - user not authenticated`);
      return;
    }

    console.log(`🔄 INTERACTION: Resonating with entry ${entryId}`);
    console.log(`🔍 - Current user: ${authState.currentUser.id}`);
    console.log(`🔍 - Before interaction state:`, userInteractionStates.get(entryId));

    // Get current state
    const currentState = userInteractionStates.get(entryId) || { hasResonated: false, hasAmplified: false };
    const isCurrentlyResonated = currentState.hasResonated;
    const newResonatedState = !isCurrentlyResonated;
    
    console.log(`🔍 - Toggling resonance: ${isCurrentlyResonated} → ${newResonatedState}`);

    // Optimistically update UI state
    const newState = { ...currentState, hasResonated: newResonatedState };
    setUserInteractionStates(prev => {
      const newMap = new Map(prev);
      newMap.set(entryId, newState);
      console.log(`🔍 - Updated local state for ${entryId}:`, newState);
      return newMap;
    });

    try {
      // Call dataService - it handles database update and cache updates
      const isNowResonated = await dataService.resonateWithEntry(entryId);
      console.log(`✅ Successfully updated resonance for entry ${entryId} - result: ${isNowResonated}`);
      
      // Update user interaction service cache
      userInteractionService.updateUserInteractionState(authState.currentUser.id, entryId, 'resonance', isNowResonated);
      
      // Update auth state for user stats
      setAuthState(authService.getAuthState());
      
      // Verify the state was updated correctly
      const verifyState = userInteractionStates.get(entryId);
      console.log(`🔍 - Post-interaction state verification:`, verifyState);
      
    } catch (error) {
      console.error('❌ Failed to resonate with entry:', error);
      // Revert optimistic update
      setUserInteractionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(entryId, currentState);
        console.log(`🔄 Reverted state for ${entryId}:`, currentState);
        return newMap;
      });
    }
  }, [authState.currentUser, userInteractionStates]);

  const amplifyEntry = useCallback(async (entryId: string) => {
    if (!authState.currentUser) {
      console.log(`⏭️ Cannot amplify - user not authenticated`);
      return;
    }

    console.log(`🔄 INTERACTION: Amplifying entry ${entryId}`);
    console.log(`🔍 - Current user: ${authState.currentUser.id}`);
    console.log(`🔍 - Before interaction state:`, userInteractionStates.get(entryId));

    // Get current state
    const currentState = userInteractionStates.get(entryId) || { hasResonated: false, hasAmplified: false };
    const isCurrentlyAmplified = currentState.hasAmplified;
    const newAmplifiedState = !isCurrentlyAmplified;
    
    console.log(`🔍 - Toggling amplification: ${isCurrentlyAmplified} → ${newAmplifiedState}`);

    // Optimistically update UI state
    const newState = { ...currentState, hasAmplified: newAmplifiedState };
    setUserInteractionStates(prev => {
      const newMap = new Map(prev);
      newMap.set(entryId, newState);
      console.log(`🔍 - Updated local state for ${entryId}:`, newState);
      return newMap;
    });

    try {
      // Call dataService - it handles database update and cache updates
      const isNowAmplified = await dataService.amplifyEntry(entryId);
      console.log(`✅ Successfully updated amplification for entry ${entryId} - result: ${isNowAmplified}`);
      
      // Update user interaction service cache
      userInteractionService.updateUserInteractionState(authState.currentUser.id, entryId, 'amplification', isNowAmplified);
      
      // Update auth state for user stats
      setAuthState(authService.getAuthState());
      
      // Verify the state was updated correctly
      const verifyState = userInteractionStates.get(entryId);
      console.log(`🔍 - Post-interaction state verification:`, verifyState);
      
    } catch (error) {
      console.error('❌ Failed to amplify entry:', error);
      // Revert optimistic update
      setUserInteractionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(entryId, currentState);
        console.log(`🔄 Reverted state for ${entryId}:`, currentState);
        return newMap;
      });
    }
  }, [authState.currentUser, userInteractionStates]);

  // Auth actions
  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);
      if (result.success) {
        setAuthState(authService.getAuthState());
        // Use appropriate refresh method based on current path
        const isOnFeedPath = typeof window !== 'undefined' && 
          (window.location.pathname === '/' || window.location.pathname === '/feed');
        
        if (isOnFeedPath) {
          await refreshFeedData();
        } else {
          await refreshData();
        }
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [refreshData, refreshFeedData]);

  const signup = useCallback(async (email: string, password: string, options?: { name?: string }) => {
    try {
      const result = await authService.signUp(email, password, options);
      if (result.success) {
        setAuthState(authService.getAuthState());
        if (!result.needsVerification) {
          // Use appropriate refresh method based on current path
          const isOnFeedPath = typeof window !== 'undefined' && 
            (window.location.pathname === '/' || window.location.pathname === '/feed');
          
          if (isOnFeedPath) {
            await refreshFeedData();
          } else {
            await refreshData();
          }
        }
      } else {
        throw new Error(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }, [refreshData, refreshFeedData]);

  const logout = useCallback(async () => {
    await authService.signOut();
    setAuthState(authService.getAuthState());
    // Clear all data on logout
    setLogbookEntries([]);
    setSharedDreams([]);
    setLogbookState(null);
    setDreamStateMetrics(null);
  }, []);

  // ✅ FIXED: Enhanced forceAuthRefresh with async initialization and timeout recovery
  const forceAuthRefresh = useCallback(async () => {
    console.log('🔄 Force auth refresh requested');
    
    try {
      // Set loading state immediately
      setAuthState(prev => ({ ...prev, isAuthLoading: true }));
      
      // Wait for auth service to complete re-initialization
      const refreshedAuthState = await authService.getAuthStateAsync();
      console.log('🔐 Force auth refresh completed:', refreshedAuthState);
      setAuthState(refreshedAuthState);
      
      // If still stuck in loading state after timeout, force fallback
      setTimeout(() => {
        if (refreshedAuthState.isAuthLoading) {
          console.warn('⚠️ Auth still loading after timeout, forcing fallback state');
          setAuthState({
            isAuthLoading: false,
            isAuthenticated: false,
            currentUser: null,
            sessionToken: null
          });
        }
      }, 10000); // 10 second timeout
      
    } catch (error) {
      console.error('❌ Force auth refresh failed:', error);
      // Set fallback auth state on error
      setAuthState({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
        sessionToken: null
      });
    }
  }, []);

  // User interaction checks - following social media playbook pattern
  const hasUserResonated = useCallback((entryId: string): boolean => {
    // Only log issues, not every call
    if (!authState.currentUser || !isUserStatesLoaded) {
      return false;
    }
    
    const state = userInteractionStates.get(entryId);
    const result = state?.hasResonated || false;
    
    return result;
  }, [authState.currentUser, isUserStatesLoaded, userInteractionStates]);

  const hasUserAmplified = useCallback((entryId: string): boolean => {
    // Only log issues, not every call
    if (!authState.currentUser || !isUserStatesLoaded) {
      return false;
    }
    
    const state = userInteractionStates.get(entryId);
    const result = state?.hasAmplified || false;
    
    return result;
  }, [authState.currentUser, isUserStatesLoaded, userInteractionStates]);
  
  // ✅ DEBUG: Monitor auth state changes
  useEffect(() => {
    // Only log significant auth state changes, not every minor update
    const isSignificantChange = authState.isAuthenticated || 
                               (!authState.isAuthLoading && !authState.isAuthenticated);
    
    if (isSignificantChange) {
      console.log('🔐 Auth state:', {
        isAuthenticated: authState.isAuthenticated,
        currentUser: authState.currentUser?.username || 'null'
      });
    }
  }, [authState]);

  // ✅ CRITICAL SAFETY: Ensure we never stay in loading state indefinitely
  useEffect(() => {
    if (authState.isAuthLoading) {
      const safetyTimeout = setTimeout(() => {
        console.warn('⚠️ Auth has been loading for too long, forcing fallback state');
        setAuthState({
          isAuthLoading: false,
          isAuthenticated: false,
          currentUser: null,
          sessionToken: null
        });
        setIsLoading(false);
      }, 30000); // 30 second absolute maximum

      return () => clearTimeout(safetyTimeout);
    }
  }, [authState.isAuthLoading]);

  // OPTIMIZED: Single auth state management with throttling to prevent multiple calls
  const authDataLoadedRef = useRef(false);
  const authLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setIsLoading(false);
    
    // ✅ GLOBAL SINGLETON: Prevent multiple concurrent initializations across all hook instances
    if (globalAuthInitialization) {
      console.log('⏭️ Auth initialization already in progress globally');
      
      // Wait for the global initialization to complete
      globalAuthInitialization.then(cleanup => {
        // Get the current auth state once initialization is complete
        const currentAuthState = authService.getAuthState();
        setAuthState(currentAuthState);
        setIsLoading(false);
      });
      
      return;
    }
    
    if (globalAuthInitialized) {
      console.log('⏭️ Auth already initialized globally');
      
      // Auth already initialized, just get current state
      const currentAuthState = authService.getAuthState();
      setAuthState(currentAuthState);
      setIsLoading(false);
      
      // Set up listener for this hook instance
      const unsubscribe = authService.onAuthStateChange(async (newAuthState: AuthState) => {
        setAuthState(prevState => {
          const isStateChanged = 
            prevState.isAuthLoading !== newAuthState.isAuthLoading ||
            prevState.isAuthenticated !== newAuthState.isAuthenticated ||
            prevState.currentUser?.id !== newAuthState.currentUser?.id;
          
          return isStateChanged ? newAuthState : prevState;
        });
        
        if (!newAuthState.isAuthLoading) {
          setIsLoading(false);
        }
      });
      
      return unsubscribe;
    }
    
    // Check for corrupted localStorage data on mount
    if (typeof window !== 'undefined') {
      try {
        // Import authService for storage check
        import('../lib/services/authService').then(({ authService }) => {
          if (authService.hasCorruptedStorageData()) {
            console.warn('Detected corrupted localStorage data, cleaning up...');
            authService.clearAllStorageData();
            // Force refresh auth state after cleanup
            setTimeout(() => {
              const currentAuthState = authService.getAuthState();
              setAuthState(currentAuthState);
            }, 100);
          }
        });
      } catch (error) {
        console.error('Error checking for corrupted storage data:', error);
      }
    }
    
    // Set a temporary auth state immediately to prevent infinite loading
    setAuthState({
      isAuthLoading: true,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    });
    
    // Initialize auth properly with error handling and timeout
    const initializeAuth = async () => {
      console.log('🔄 Initializing authentication...');
      
      try {
        // Add a timeout to prevent hanging indefinitely
        const initTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout after 20 seconds')), 20000);
        });
        
        // Wait for auth service to complete initialization with timeout
        const initialAuthState = await Promise.race([
          authService.getAuthStateAsync(),
          initTimeout
        ]);
        
        console.log('✅ Authentication completed:', {
          isAuthenticated: initialAuthState.isAuthenticated,
          currentUser: initialAuthState.currentUser?.username || 'null'
        });
        
        setAuthState(initialAuthState);
        
        // Set up auth state change listener with minimal processing
        const unsubscribe = authService.onAuthStateChange(async (newAuthState: AuthState) => {
          // Only update state if it's actually different
          setAuthState(prevState => {
            const isStateChanged = 
              prevState.isAuthLoading !== newAuthState.isAuthLoading ||
              prevState.isAuthenticated !== newAuthState.isAuthenticated ||
              prevState.currentUser?.id !== newAuthState.currentUser?.id;
            
            if (!isStateChanged) {
              return prevState;
            }
            
            return newAuthState;
          });
          
          // Handle logout cleanup
          if (!newAuthState.isAuthenticated && authState.isAuthenticated) {
            console.log('🔐 User logged out, clearing data');
            authDataLoadedRef.current = false;
            if (authLoadTimeoutRef.current) {
              clearTimeout(authLoadTimeoutRef.current);
            }
            
            setProfileUser(null);
            setProfileUserPosts([]);
            setResonatedEntries([]);
            setAmplifiedEntries([]);
            setUserInteractionStates(new Map());
            setIsUserStatesLoaded(false);
            setCurrentPostIds([]);
            
            // Clear user interaction service cache
            const previousUser = authState.currentUser;
            if (previousUser) {
              userInteractionService.clearUserCache(previousUser.id);
            }
          }
          
          // Stop global loading indicator after auth state is resolved
          if (!newAuthState.isAuthLoading) {
            setIsLoading(false);
          }
        });
        
        // Mark as globally initialized
        globalAuthInitialized = true;
        
        // Return cleanup function
        return unsubscribe;
        
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        
        // Set a fallback auth state on error - this is critical to prevent infinite loading
        const fallbackState = {
          isAuthLoading: false,
          isAuthenticated: false,
          currentUser: null,
          sessionToken: null
        };
        
        console.log('🔧 Setting fallback auth state');
        setAuthState(fallbackState);
        setIsLoading(false);
        
        // Still return a cleanup function to prevent errors
        return () => {};
      }
    };
    
    // Store the initialization promise globally
    globalAuthInitialization = initializeAuth();
    
    // Initialize auth and store cleanup function
    let authCleanup: (() => void) | undefined;
    
    globalAuthInitialization.then(cleanup => {
      authCleanup = cleanup;
    }).catch(error => {
      console.error('❌ Failed to initialize auth completely:', error);
      // Final fallback - ensure we never stay in loading state
      setAuthState({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
        sessionToken: null
      });
      setIsLoading(false);
    }).finally(() => {
      globalAuthInitialization = null;
    });
    
    return () => {
      // Clean up auth listener
      if (authCleanup) {
        authCleanup();
      }
      
      // Clean up timeout on unmount
      if (authLoadTimeoutRef.current) {
        clearTimeout(authLoadTimeoutRef.current);
      }
    };
  }, []);

  // OPTIMIZED: Load user interaction states when posts are available
  // This effect watches for logbookEntries, sharedDreams, and resonatedEntries changes and loads user interaction states
  // NOTE: If posts were loaded with the optimized method (getPostsWithUserStates), user states are already included
  useEffect(() => {
    const loadUserInteractionStates = async () => {
      // Only load if user is authenticated and we have posts
      if (!authState.isAuthenticated || !authState.currentUser) {
        console.log(`⏭️ Skipping user interaction states load - not authenticated`);
        setIsUserStatesLoaded(false);
        return;
      }

      // Check if posts already have user interaction states (from optimized loader)
      // If posts have userHasResonated/userHasAmplified properties, skip separate loading
      const feedPosts = [...logbookEntries, ...sharedDreams];
      const hasOptimizedData = feedPosts.length > 0 && 
        feedPosts.some(post => 'userHasResonated' in post && 'userHasAmplified' in post);
      
      if (hasOptimizedData) {
        console.log(`⚡ Skipping separate user interaction states load - already included in optimized query`);
        
        // Populate the interaction states map from the posts themselves
        setUserInteractionStates(prev => {
          const newMap = new Map(prev);
          feedPosts.forEach(post => {
            if ('userHasResonated' in post && 'userHasAmplified' in post) {
              newMap.set(post.id, {
                hasResonated: (post as any).userHasResonated,
                hasAmplified: (post as any).userHasAmplified
              });
            }
          });
          return newMap;
        });
        
        setIsUserStatesLoaded(true);
        return;
      }

      // Load all posts from all sources (feed, resonated entries, etc.)
      const allPosts = [...logbookEntries, ...sharedDreams, ...resonatedEntries];
      const allPostIds = allPosts.map(e => e.id);
      
      // OPTIMIZATION: Use Set-based comparison instead of expensive string sorting
      const currentPostIdsSet = new Set(allPostIds);
      const prevPostIdsSet = new Set(currentPostIds);
      
      // Check if sets are equal (more efficient than string comparison)
      const setsEqual = currentPostIdsSet.size === prevPostIdsSet.size && 
                       Array.from(currentPostIdsSet).every(id => prevPostIdsSet.has(id));
      
      if (setsEqual && isUserStatesLoaded) {
        console.log(`⏭️ Skipping user interaction states load - same posts already loaded`);
        return;
      }
      
      // OPTIMIZATION: Only load states for NEW posts, not all posts
      const newPostIds = allPostIds.filter(id => !prevPostIdsSet.has(id));
      
      if (newPostIds.length === 0 && isUserStatesLoaded) {
        console.log(`⏭️ No new posts to load user states for`);
        return;
      }
      
      setCurrentPostIds(allPostIds);
      
      if (newPostIds.length > 0) {
        console.log(`🔄 Loading user interaction states for ${newPostIds.length} NEW posts (${allPostIds.length} total)`);
        
        try {
          // Only fetch states for new posts
          const newStates = await userInteractionService.batchLoadUserStates(
            authState.currentUser.id,
            newPostIds
          );
          
          // Merge with existing states efficiently
          setUserInteractionStates(prev => {
            const updatedMap = new Map(prev);
            newStates.forEach((state, postId) => {
              updatedMap.set(postId, state);
            });
            return updatedMap;
          });
          
          setIsUserStatesLoaded(true);
          const interactedCount = Array.from(newStates.values()).filter(s => s.hasResonated || s.hasAmplified).length;
          console.log(`✅ User interaction states loaded: ${newStates.size} new, ${interactedCount} with interactions`);
          
        } catch (error) {
          console.error('❌ Failed to load user interaction states:', error);
          setIsUserStatesLoaded(true); // Still allow rendering
        }
      } else if (allPostIds.length === 0) {
        console.log(`📭 No posts to load user interaction states for`);
        setIsUserStatesLoaded(true); // No posts = no states needed
      } else {
        // We have posts but no new ones, and we're already loaded
        setIsUserStatesLoaded(true);
      }
    };

    loadUserInteractionStates();
  }, [
    authState.isAuthenticated, 
    authState.currentUser, 
    // Use only lengths to prevent excessive triggers from individual post changes
    logbookEntries.length, 
    sharedDreams.length,
    resonatedEntries.length,
    // Remove the individual ID dependencies that caused excessive triggers
  ]);

  // DISABLED: Auto-refresh data when user returns to feed to prevent infinite loops
  // Users should manually refresh if they want new data
  useEffect(() => {
    // Auto-refresh disabled to prevent infinite loops
    console.log('👁️ Visibility change auto-refresh disabled');
  }, []);
  
  // NOTE: Resonated/amplified entry loading is now handled in the main auth state listener above
  
  // Expose dataService globally for testing in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).nexusDataService = dataService;
      // Expose additional debug methods
      (window as any).debugResonance = {
        refreshResonatedEntries: () => loadResonatedEntries(),
        refreshAmplifiedEntries: () => loadAmplifiedEntries()
      };
      // console.log('🔧 Development Mode: Access debugging via window.nexusDataService and window.debugResonance');
    }
  }, []);
  
  // NEW: Method to append more resonated entries (follows NexusFeed pattern)
  const appendResonatedEntries = useCallback(async (page: number, limit: number = 20) => {
    if (!authState.currentUser) return [];
    
    try {
      const newEntries = await dataService.getResonatedEntries(authState.currentUser.id, page, limit);
      const newEntriesData = newEntries.map(convertToStreamEntryData);
      
      // Append to existing resonated entries (triggers useEffect automatically)
      setResonatedEntries(prev => [...prev, ...newEntriesData]);
      
      return newEntriesData;
    } catch (error) {
      console.error('❌ Error loading more resonated entries:', error);
      return [];
    }
  }, [authState.currentUser]);
  
  return {
    // Authentication
    authState,
    currentUser: authState.currentUser,
    
    // Logbook data
    logbookState,
    networkStatus,
    systemVitals,
    activeAgents,
    logbookEntries,
    entryComposer,
    logbookField,
    
    // Dream data
    dreamStateMetrics,
    activeDreamers,
    sharedDreams,
    dreamComposer,
    dreamPatterns,
    dreamAnalytics,
    emergingSymbols,
    
    // Computed data
    resonatedEntries,
    amplifiedEntries,
    
    // Loading states
    isLoading,
    isLoadingLogbook,
    isLoadingDreams,
    isLoadingFeedData,
    isUserStatesLoaded,
    
    // Actions
    refreshData,
    refreshFeedData,
    refreshLogbookData,
    refreshDreamData,
    refreshResonatedEntries,
    refreshAmplifiedEntries: loadAmplifiedEntries,
    smartRefresh,
    submitEntry,
    createBranch,
    resonateWithEntry,
    amplifyEntry,
    
    // Manual loading methods for specific pages
    ensureResonatedEntriesLoaded: useCallback(async () => {
      if (authState.currentUser) {
        await loadResonatedEntries();
      }
    }, [authState.currentUser]),
    ensureAmplifiedEntriesLoaded: useCallback(async () => {
      if (authState.currentUser) {
        await loadAmplifiedEntries();
      }
    }, [authState.currentUser]),
    ensureFeedDataLoaded: useCallback(async () => {
      // Prevent duplicate calls by checking if we're already loading
      if (isLoadingFeedData) {
        return;
      }
      
      // Only refresh if data appears stale (empty arrays) and we're not already loading
      if (logbookEntries.length === 0 && sharedDreams.length === 0 && !isLoading) {
        setIsLoadingFeedData(true);
        try {
          await loadFeedDataOptimized(); // Use optimized method instead of old loadFeedData
        } finally {
          setIsLoadingFeedData(false);
        }
      }
    }, [logbookEntries.length, sharedDreams.length, isLoading, loadFeedDataOptimized, isLoadingFeedData]),
    
    // Auth actions
    login,
    signup,
    logout,
    forceAuthRefresh,
    
    // Profile actions
    updateUserProfile: useCallback(
      async (updates: { name?: string; bio?: string; location?: string }) => {
        if (!authState.currentUser) {
          throw new Error('No user logged in');
        }

        // Persist the update via the data service and receive the fresh user record
        const updatedUser = await dataService.updateUserProfile(updates);

        // Immediately update all local state that references the current user
        setAuthState((prev) => ({
          ...prev,
          currentUser: updatedUser,
        }));

        // If we are currently viewing our own profile, keep it in sync too
        setProfileUser((prev) => (prev && prev.id === updatedUser.id ? updatedUser : prev));
      },
      [authState.currentUser]
    ),
    
    // User interaction checks
    hasUserResonated,
    hasUserAmplified,
    
    // UNIFIED PAGINATION API (NEW)
    getPosts: useCallback(async (options: {
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
    }) => {
      // OPTIMIZED: Direct Post[] return - no conversions needed!
      return await dataService.getPostsForUI(options);
    }, [authState.currentUser]),
    
    // Feed-specific methods (DEPRECATED - use getPosts instead)
    /** @deprecated Use getPosts({mode: 'feed'}) instead */
    getFlattenedStreamEntries: useCallback(async (page?: number, limit?: number) => {
      const entries = await dataService.getFlattenedStreamEntries(page ?? 1, limit ?? 20);
      return entries.map(convertToStreamEntryData);
    }, []),
    
    /** @deprecated Use getPosts({mode: 'logbook'}) instead */
    getFlattenedLogbookEntries: useCallback(async () => {
      // Try to use already loaded data first if available
      if (logbookEntries.length > 0) {
        const sortedEntries = [...logbookEntries].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return sortedEntries.map(convertToStreamEntryData);
      }
      
      // Fallback to service call if no data loaded
      const entries = await dataService.getFlattenedLogbookEntries();
      return entries.map(convertToStreamEntryData);
    }, [logbookEntries]),
    
    getDirectChildren: useCallback(async (parentId: string) => {
      const children = await dataService.getDirectChildren(parentId);
      return children.map(convertToStreamEntryData);
    }, []),
    getParentPost: useCallback(async (childId: string) => {
      const post = await dataService.getParentPost(childId);
      return post ? convertToStreamEntryData(post) : null;
    }, []),
    getEntryType: useCallback(async (entryId: string) => {
      return await dataService.getEntryType(entryId);
    }, []),
    
    getUserPosts: useCallback(() => {
      if (!authState.currentUser) return [];
      
      // If viewing another user's profile, return their posts
      if (profileViewState.mode === 'other' && profileUser) {
        return profileUserPosts;
      }
      
      // Otherwise return current user's posts
      // Combine logbook and dream entries, filter by current user
      const allEntries = [...logbookEntries, ...sharedDreams];
      const userPosts = allEntries.filter(entry => entry.userId === authState.currentUser?.id);
      
      // Sort by timestamp, newest first
      return userPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }, [authState.currentUser, logbookEntries, sharedDreams, profileViewState, profileUser, profileUserPosts]),
    
    // Threading controls (for advanced users)
    setThreadingMode: dataService.setThreadingMode.bind(dataService),
    getThreadingConfig: dataService.getThreadingConfig.bind(dataService),
    
    // Follow system actions
    followUser: useCallback(async (followedId: string) => {
      if (!authState.currentUser) {
        throw new Error('No user logged in');
      }

      const success = await dataService.followUser(followedId);
      if (success) {
        // Optimistically update followingCount for current user
        setAuthState(prev => {
          if (!prev.currentUser) return prev;
          return {
            ...prev,
            currentUser: {
              ...prev.currentUser,
              followingCount: (prev.currentUser.followingCount ?? 0) + 1
            }
          };
        });
      }
      return success;
    }, [authState.currentUser]),
    
    unfollowUser: useCallback(async (followedId: string) => {
      if (!authState.currentUser) {
        throw new Error('No user logged in');
      }

      const success = await dataService.unfollowUser(followedId);
      if (success) {
        setAuthState(prev => {
          if (!prev.currentUser) return prev;
          return {
            ...prev,
            currentUser: {
              ...prev.currentUser,
              followingCount: Math.max(0, (prev.currentUser.followingCount ?? 1) - 1)
            }
          };
        });
      }
      return success;
    }, [authState.currentUser]),
    
    isFollowing: useCallback(async (followedId: string) => {
      if (!authState.currentUser) {
        return false;
      }
      
      return await dataService.isFollowing(followedId);
    }, [authState.currentUser]),
    
    getFollowers: useCallback(async (userId: string, limit?: number, offset?: number) => {
      return await dataService.getFollowers(userId, limit, offset);
    }, []),
    
    getFollowing: useCallback(async (userId: string, limit?: number, offset?: number) => {
      return await dataService.getFollowing(userId, limit, offset);
    }, []),
    
    getMutualFollows: useCallback(async (userId: string, limit?: number) => {
      return await dataService.getMutualFollows(userId, limit);
    }, []),
    
    getFollowSuggestions: useCallback(async (userId: string, limit?: number) => {
      if (userId !== authState.currentUser?.id) {
        // Fall back to suggestions for current user if IDs differ (mock implementation)
        console.warn('getFollowSuggestions no longer requires userId parameter – ignoring provided userId');
      }
      return await dataService.getFollowSuggestions(limit);
    }, []),
    
    // Profile viewing state
    profileViewState,
    profileUser,
    profileUserPosts,
    
    // Profile viewing methods
    viewUserProfile: useCallback(async (username: string) => {
      // Immediately switch to 'other' mode and clear any existing profile data
      setIsLoading(true);
      setProfileViewState({ mode: 'other', username });
      setProfileUser(null);
      setProfileUserPosts([]);
      try {
        // Attempt to fetch the user
        const user = await dataService.getUserByUsername(username);
        if (!user) {
          console.warn(`👤 User ${username} not found`);
          return;
        }
        // Fetch the user's posts
        const posts = await dataService.getUserPostsByUsername(username);
        // Update profile data
        setProfileUser(user);
        setProfileUserPosts(posts);
      } catch (error) {
        console.error('❌ Failed to load user profile:', error);
      } finally {
        setIsLoading(false);
      }
    }, []),
    
    viewSelfProfile: useCallback(() => {
      setProfileViewState({ mode: 'self' });
      setProfileUser(null);
      setProfileUserPosts([]);
    }, []),
    
    getCurrentProfileUser: useCallback(() => {
      if (profileViewState.mode === 'other') {
        return profileUser;
      }
      return authState.currentUser;
    }, [profileViewState.mode, profileUser, authState.currentUser]),
    
    // NEW: Method to append more resonated entries (follows NexusFeed pattern)
    appendResonatedEntries,
  };
};