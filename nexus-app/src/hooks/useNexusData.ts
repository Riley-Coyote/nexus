import { useState, useEffect, useMemo, useCallback } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
import { authService } from '../lib/services/supabaseAuthService';
import { StreamEntryData } from '../components/StreamEntry';
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
  logbookEntriesData: StreamEntryData[];
  dreamEntriesData: StreamEntryData[];
  resonatedEntries: StreamEntryData[];
  
  // Loading states
  isLoading: boolean;
  isLoadingLogbook: boolean;
  isLoadingDreams: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshLogbookData: () => Promise<void>;
  refreshDreamData: () => Promise<void>;
  refreshResonatedEntries: () => Promise<void>;
  smartRefresh: (entryId: string, refreshType?: 'all' | 'logbook' | 'dream' | 'resonance') => Promise<void>;
  submitEntry: (content: string, type: string, isPublic: boolean, mode: JournalMode) => Promise<void>;
  createBranch: (parentId: string, content: string) => Promise<void>;
  resonateWithEntry: (entryId: string) => Promise<void>;
  amplifyEntry: (entryId: string) => Promise<void>;
  
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
  
  // Feed-specific methods
  getFlattenedStreamEntries: (page?: number, limit?: number) => Promise<StreamEntryData[]>;
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
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  });
  
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
  
  // Static data (memoized)
  const entryComposer = useMemo(() => dataService.getEntryComposer('logbook'), []);
  const dreamComposer = useMemo(() => dataService.getEntryComposer('dream'), []);
  const dreamPatterns = useMemo(() => dataService.getDreamPatterns(), []);
  const logbookField = useMemo(() => dataService.getLogbookField(), []);
  const emergingSymbols = useMemo(() => dataService.getEmergingSymbols(), []);
  
  // Computed data (memoized)
  const logbookEntriesData = useMemo(() => 
    logbookEntries.map(convertToStreamEntryData), 
    [logbookEntries]
  );
  
  const dreamEntriesData = useMemo(() => 
    sharedDreams.map(convertToStreamEntryData), 
    [sharedDreams]
  );
  
  // Resonated entries state
  const [resonatedEntries, setResonatedEntries] = useState<StreamEntryData[]>([]);
  
  // Load user resonated entries
  const loadResonatedEntries = useCallback(async () => {
    if (!authState.currentUser) {
      console.log('🔍 No current user, clearing resonated entries');
      setResonatedEntries([]);
      return;
    }
    
    console.log(`🔍 Loading resonated entries for user: ${authState.currentUser.id}`);
    
    try {
      // Use the new getResonatedEntries method that returns full entries directly
      const resonatedEntries = await dataService.getResonatedEntries(authState.currentUser.id);
      const resonatedEntriesData = resonatedEntries.map(convertToStreamEntryData);
      
      console.log(`✅ Loaded ${resonatedEntries.length} resonated entries:`, resonatedEntries.map(e => e.id));
      setResonatedEntries(resonatedEntriesData);
    } catch (error) {
      console.error('❌ Failed to load resonated entries:', error);
      setResonatedEntries([]);
    }
  }, [authState.currentUser]);
  
  // Load logbook data
  const loadLogbookData = useCallback(async () => {
    setIsLoadingLogbook(true);
    try {
      const [state, network, vitals, agents, entries] = await Promise.all([
        dataService.getLogbookState(),
        dataService.getNetworkStatus(),
        dataService.getSystemVitals(),
        dataService.getActiveAgents(),
        dataService.getFlattenedLogbookEntries()
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
  
  // Load dream data
  const loadDreamData = useCallback(async () => {
    setIsLoadingDreams(true);
    try {
      const [metrics, dreamers, dreams, analytics] = await Promise.all([
        dataService.getDreamStateMetrics(),
        dataService.getActiveDreamers(),
        dataService.getSharedDreams(),
        dataService.getDreamAnalytics()
      ]);
      
      setDreamStateMetrics(metrics);
      setActiveDreamers(dreamers);
      // Filter dreams by current user
      const userId = authState.currentUser?.id;
      const filteredDreams = userId ? dreams.filter(entry => entry.userId === userId) : [];
      setSharedDreams(filteredDreams);
      setDreamAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load dream data:', error);
    } finally {
      setIsLoadingDreams(false);
    }
  }, [authState.currentUser]);
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([loadLogbookData(), loadDreamData()]);
  }, [loadLogbookData, loadDreamData]);

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
      await dataService.createBranch(parentId, content);
      
      // Determine if parent is logbook or dream entry to refresh correctly
      const parentEntry = await dataService.getEntryById(parentId);
      if (parentEntry) {
        const isDreamEntry = parentEntry.type.toLowerCase().includes('dream') || 
                             parentEntry.resonance !== undefined;
        
        if (isDreamEntry) {
          await refreshDreamData();
        } else {
          await refreshLogbookData();
        }
      } else {
        // Fallback: refresh both if we can't determine
        await refreshData();
      }
      
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error;
    }
  }, [refreshData, refreshLogbookData, refreshDreamData]);
  
  // Resonate with entry - OPTIMIZED and SIMPLIFIED
  const resonateWithEntry = useCallback(async (entryId: string) => {
    try {
      console.log(`🔄 Processing resonance for entry: ${entryId}`);
      
      // Call dataService and get the result (true = resonated, false = unresonated)
      const isNowResonated = await dataService.resonateWithEntry(entryId);
      
      console.log(`${isNowResonated ? '✅ Resonated with' : '❌ Unresonated from'} entry: ${entryId}`);
      
      // Only refresh resonated entries - single refresh call
      await refreshResonatedEntries();
      
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
      
      console.log(`✅ Resonance operation complete`);
    } catch (error) {
      console.error('❌ Failed to resonate with entry:', error);
      throw error;
    }
  }, [refreshResonatedEntries]);

  // Amplify entry - OPTIMIZED  
  const amplifyEntry = useCallback(async (entryId: string) => {
    try {
      await dataService.amplifyEntry(entryId);
      
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
      
      // Note: We don't refresh all data here for performance
      // The interaction counts will be updated on next natural refresh
    } catch (error) {
      console.error('Failed to amplify entry:', error);
      throw error;
    }
  }, []);

  // Auth actions
  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);
      if (result.success) {
        setAuthState(authService.getAuthState());
        await refreshData();
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [refreshData]);

  const signup = useCallback(async (email: string, password: string, options?: { name?: string }) => {
    try {
      const result = await authService.signUp(email, password, options);
      if (result.success) {
        setAuthState(authService.getAuthState());
        if (!result.needsVerification) {
          await refreshData();
        }
      } else {
        throw new Error(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }, [refreshData]);

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

  // User interaction checks
  const hasUserResonated = useCallback((entryId: string): boolean => {
    if (!authState.currentUser) return false;
    return dataService.hasUserResonated(authState.currentUser.id, entryId);
  }, [authState.currentUser]);

  const hasUserAmplified = useCallback((entryId: string): boolean => {
    if (!authState.currentUser) return false;
    return dataService.hasUserAmplified(authState.currentUser.id, entryId);
  }, [authState.currentUser]);
  
  // Hydration effect - check for existing session after client-side hydration
  useEffect(() => {
    setIsLoading(false);
    
    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChange((newAuthState: AuthState) => {
      setAuthState(newAuthState);
    });
    
    // Get initial auth state
    const currentAuthState = authService.getAuthState();
    setAuthState(currentAuthState);
    
    return unsubscribe;
  }, []);

  // Load initial data only if authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.currentUser) {
      // Initialize user resonances for demo
      dataService.initializeUserResonances(authState.currentUser.id);
      refreshData();
    }
  }, [authState.isAuthenticated, refreshData]);
  
  // Load resonated entries when user changes or on mount - FIXED DEPENDENCY
  useEffect(() => {
    if (authState.isAuthenticated && authState.currentUser) {
      loadResonatedEntries();
    }
  }, [authState.currentUser?.id]); // Only depend on user ID, not the function
  
  // Expose dataService globally for testing in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).nexusDataService = dataService;
      // Expose additional debug methods
      (window as any).debugResonance = {
        addResonance: (userId: string, entryId: string) => dataService.debugAddResonance(userId, entryId),
        getUserResonances: (userId: string) => dataService.debugGetUserResonances(userId),
        refreshResonatedEntries: () => loadResonatedEntries()
      };
      console.log('🔧 Development Mode: Access debugging via window.nexusDataService and window.debugResonance');
    }
  }, []);
  
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
    logbookEntriesData,
    dreamEntriesData,
    resonatedEntries,
    
    // Loading states
    isLoading,
    isLoadingLogbook,
    isLoadingDreams,
    
    // Actions
    refreshData,
    refreshLogbookData,
    refreshDreamData,
    refreshResonatedEntries,
    smartRefresh,
    submitEntry,
    createBranch,
    resonateWithEntry,
    amplifyEntry,
    
    // Auth actions
    login,
    signup,
    logout,
    forceAuthRefresh,
    
    // Profile actions
    updateUserProfile: useCallback(async (updates: { name?: string; bio?: string; location?: string }) => {
      if (!authState.currentUser) {
        throw new Error('No user logged in');
      }
      
      await dataService.updateUserProfile(updates);
      
      // Refresh auth state to get updated user data
      forceAuthRefresh();
    }, [authState.currentUser, forceAuthRefresh]),
    
    // User interaction checks
    hasUserResonated,
    hasUserAmplified,
    
    // Feed-specific methods
    getFlattenedStreamEntries: useCallback(async (page?: number, limit?: number) => {
      const entries = await dataService.getFlattenedStreamEntries(page ?? 1, limit ?? 20);
      return entries.map(convertToStreamEntryData);
    }, []),
    
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
      
      return await dataService.followUser(followedId);
    }, [authState.currentUser]),
    
    unfollowUser: useCallback(async (followedId: string) => {
      if (!authState.currentUser) {
        throw new Error('No user logged in');
      }
      
      return await dataService.unfollowUser(followedId);
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
