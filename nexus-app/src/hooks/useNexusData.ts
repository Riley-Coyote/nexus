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
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, options?: { name?: string }) => Promise<void>;
  logout: () => void;
  forceAuthRefresh: () => void;
  
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
  
  // NEW: Manual user interaction state loading for specific posts
  loadUserStatesForPosts: (postIds: string[]) => Promise<void>;
  
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
  const [systemVitals, setSystemVitals] = useState<SystemVital[]>([]);
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([]);
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
  
  // NEW: Unified feed data loader for public entries only
  const loadFeedData = useCallback(async () => {
    // Prevent concurrent calls using ref
    if (isLoadingRef.current) {
      console.log('📡 Feed data already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      console.log('📡 Loading public feed data...');
      
      // Fetch public entries only - no auth required
      const [publicLogbookEntries, publicDreamEntries] = await Promise.all([
        dataService.getPosts({ 
          mode: 'logbook', 
          page: 1, 
          limit: 20, 
          threaded: false,
          filters: { privacy: 'public' } 
        }),
        dataService.getPosts({ 
          mode: 'dream', 
          page: 1, 
          limit: 20, 
          threaded: false,
          filters: { privacy: 'public' } 
        })
      ]);
      
      // Store public entries for feed (no user filtering needed)
      setLogbookEntries(publicLogbookEntries);
      setSharedDreams(publicDreamEntries);
      // Clear allDreams to prevent the filtering effect from running
      setAllDreams([]);
      
      console.log(`✅ Loaded ${publicLogbookEntries.length} public logbook + ${publicDreamEntries.length} public dream entries`);
      
    } catch (error) {
      console.error('Failed to load feed data:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []); // No dependencies to prevent recreation
  
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
  
  // Refresh all data (now using path-independent logic)
  const refreshData = useCallback(async () => {
    // Check if we're currently on feed path using a more stable approach
    const isOnFeedPath = typeof window !== 'undefined' && 
      (window.location.pathname === '/' || window.location.pathname === '/feed');
    
    if (isOnFeedPath) {
      // For feed view: only load public data
      await loadFeedData();
    } else {
      // For logbook/dream views: load user-specific data
      await Promise.all([loadLogbookData(), loadDreamData()]);
    }
  }, [loadFeedData, loadLogbookData, loadDreamData]);

  // NEW: Feed-specific refresh for public data only
  const refreshFeedData = useCallback(async () => {
    await loadFeedData();
  }, [loadFeedData]); // Stable since loadFeedData has no dependencies

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

  const forceAuthRefresh = useCallback(() => {
    const currentAuthState = authService.getAuthState();
    setAuthState(currentAuthState);
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
  
  // OPTIMIZED: Single auth state management with throttling to prevent multiple calls
  const authDataLoadedRef = useRef(false);
  const authLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setIsLoading(false);
    
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
    
    // Single auth state listener with all logic consolidated
    const unsubscribe = authService.onAuthStateChange(async (newAuthState: AuthState) => {
      setAuthState({ ...newAuthState, isAuthLoading: false });
      
      if (newAuthState.isAuthenticated && newAuthState.currentUser) {
        // Only load data if we haven't loaded it already for this auth session
        if (!authDataLoadedRef.current) {
          authLoadTimeoutRef.current = setTimeout(async () => {
            // DISABLED: Auto data loading on auth - let components request data manually
            // The infinite loop was caused by automatic data loading here
            console.log('🔐 User authenticated - data loading disabled to prevent infinite loops');
            authDataLoadedRef.current = true;
          }, 100); // Small delay to batch multiple auth state changes
        }
        
        // NOTE: User interaction states are now loaded in a separate useEffect
        // that watches for logbookEntries and sharedDreams changes
        
        // OPTIMIZATION: Only load resonance data when needed (legacy support)
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const shouldLoadResonanceData = currentPath.includes('/resonance-field') || 
                                       currentPath.includes('/profile');
        
        if (shouldLoadResonanceData) {
          loadResonatedEntries();
          loadAmplifiedEntries();
        }
      } else {
        // Clear data on logout
        authDataLoadedRef.current = false; // Reset for next login
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
      setIsLoading(false);
    });
    
    // Get initial auth state
    const currentAuthState = authService.getAuthState();
    setAuthState(currentAuthState);
    
    return () => {
      unsubscribe();
      // Clean up timeout on unmount
      if (authLoadTimeoutRef.current) {
        clearTimeout(authLoadTimeoutRef.current);
      }
    };
  }, []);

  // OPTIMIZED: Load user interaction states when posts are available
  // This effect watches for logbookEntries, sharedDreams, and resonatedEntries changes and loads user interaction states
  useEffect(() => {
    const loadUserInteractionStates = async () => {
      // Only load if user is authenticated and we have posts
      if (!authState.isAuthenticated || !authState.currentUser) {
        console.log(`⏭️ Skipping user interaction states load - not authenticated`);
        setIsUserStatesLoaded(false);
        return;
      }

      // Load all posts from all sources (feed, resonated entries, etc.)
      const allPosts = [...logbookEntries, ...sharedDreams, ...resonatedEntries];
      const allPostIds = allPosts.map(e => e.id);
      
      // OPTIMIZATION: Only load if posts actually changed
      const currentPostIdsStr = allPostIds.sort().join(',');
      const prevPostIdsStr = currentPostIds.sort().join(',');
      
      if (currentPostIdsStr === prevPostIdsStr && isUserStatesLoaded) {
        console.log(`⏭️ Skipping user interaction states load - same posts already loaded`);
        return;
      }
      
      setCurrentPostIds(allPostIds);
      
      console.log(`🔄 Loading user interaction states for ${allPostIds.length} posts`);
      
      if (allPostIds.length > 0) {
        try {
          const states = await userInteractionService.batchLoadUserStates(
            authState.currentUser.id,
            allPostIds
          );
          
          const interactedCount = Array.from(states.values()).filter(s => s.hasResonated || s.hasAmplified).length;
          
          setUserInteractionStates(states);
          setIsUserStatesLoaded(true);
          console.log(`✅ User interaction states loaded: ${states.size} total, ${interactedCount} with interactions`);
          
        } catch (error) {
          console.error('❌ Failed to load user interaction states:', error);
          setIsUserStatesLoaded(true); // Still allow rendering
        }
      } else {
        console.log(`📭 No posts to load user interaction states for`);
        setIsUserStatesLoaded(true); // No posts = no states needed
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
  
  // NEW: Manual user interaction state loading for specific posts
  const loadUserStatesForPosts = useCallback(async (postIds: string[]) => {
    if (!authState.currentUser || postIds.length === 0) {
      console.log(`⏭️ Cannot load user states - no user or no posts`);
      return;
    }

    console.log(`🔄 Manually loading user interaction states for ${postIds.length} posts`);
    
    try {
      const states = await userInteractionService.batchLoadUserStates(
        authState.currentUser.id,
        postIds
      );
      
      // Merge with existing states
      setUserInteractionStates(prev => {
        const newMap = new Map(prev);
        states.forEach((state, postId) => {
          newMap.set(postId, state);
        });
        return newMap;
      });
      
      const interactedCount = Array.from(states.values()).filter(s => s.hasResonated || s.hasAmplified).length;
      console.log(`✅ Manually loaded user states for ${states.size} posts (${interactedCount} with interactions)`);
      
    } catch (error) {
      console.error('❌ Failed to manually load user interaction states:', error);
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
        console.log('🔄 Feed data load already in progress, skipping...');
        return;
      }
      
      // Only refresh if data appears stale (empty arrays) and we're not already loading
      if (logbookEntries.length === 0 && sharedDreams.length === 0 && !isLoading) {
        console.log('🔄 Ensuring feed data is loaded...');
        setIsLoadingFeedData(true);
        try {
          await loadFeedData(); // Use feed-specific loader instead of refreshData
        } finally {
          setIsLoadingFeedData(false);
        }
      }
    }, [logbookEntries.length, sharedDreams.length, isLoading, loadFeedData, isLoadingFeedData]),
    
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
    
    // NEW: Manual user interaction state loading for specific posts
    loadUserStatesForPosts,
    
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
        console.log(`✅ Loaded profile for ${username}:`, { user, postsCount: posts.length });
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
  };
};
