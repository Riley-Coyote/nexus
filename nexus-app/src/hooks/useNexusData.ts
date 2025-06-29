import { useState, useEffect, useMemo, useCallback } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
import { authService } from '../lib/services/authService';
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
  AuthState
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
  submitEntry: (content: string, type: string, isPublic: boolean, mode: JournalMode) => Promise<void>;
  createBranch: (parentId: string, content: string) => Promise<void>;
  resonateWithEntry: (entryId: string) => Promise<void>;
  amplifyEntry: (entryId: string) => Promise<void>;
  
  // Auth actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  forceAuthRefresh: () => void;
  
  // User interaction checks
  hasUserResonated: (entryId: string) => boolean;
  hasUserAmplified: (entryId: string) => boolean;
  
  // Feed-specific methods
  getFlattenedStreamEntries: () => Promise<StreamEntryData[]>;
  getFlattenedLogbookEntries: () => Promise<StreamEntryData[]>;
  getDirectChildren: (parentId: string) => Promise<StreamEntryData[]>;
  getParentPost: (childId: string) => Promise<StreamEntryData | null>;
  
  // Threading controls (for advanced users)
  setThreadingMode: (mode: 'dfs' | 'bfs' | 'adaptive') => void;
  getThreadingConfig: () => any;
}

export const useNexusData = (): NexusData => {
  // Auth state - start with consistent unauthenticated state to avoid hydration mismatch
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  });
  const [isHydrated, setIsHydrated] = useState(false);
  
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
      setResonatedEntries([]);
      return;
    }
    
    try {
      // Use the new getResonatedEntries method that returns full entries directly
      const resonatedEntries = await dataService.getResonatedEntries(authState.currentUser.id);
      const resonatedEntriesData = resonatedEntries.map(convertToStreamEntryData);
      setResonatedEntries(resonatedEntriesData);
    } catch (error) {
      console.error('Failed to load resonated entries:', error);
      setResonatedEntries([]);
    }
  }, [authState.currentUser]);
  
  const isLoading = authState.isAuthenticated && (isLoadingLogbook || isLoadingDreams);
  
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
      setLogbookEntries(entries);
    } catch (error) {
      console.error('Failed to load logbook data:', error);
    } finally {
      setIsLoadingLogbook(false);
    }
  }, []);
  
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
      setSharedDreams(dreams);
      setDreamAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load dream data:', error);
    } finally {
      setIsLoadingDreams(false);
    }
  }, []);
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([loadLogbookData(), loadDreamData()]);
  }, [loadLogbookData, loadDreamData]);
  
  // Submit new entry
  const submitEntry = useCallback(async (content: string, type: string, isPublic: boolean, mode: JournalMode) => {
    try {
      const newEntry = await dataService.submitEntry(content, type, isPublic, mode);
      
      // Don't update state here since dataService already handles storage
      // Instead, refresh the data to get the updated entries from dataService
      if (mode === 'logbook') {
        await loadLogbookData();
      } else {
        await loadDreamData();
      }
    } catch (error) {
      console.error('Failed to submit entry:', error);
      throw error;
    }
  }, [loadLogbookData, loadDreamData]);

  // Create branch
  const createBranch = useCallback(async (parentId: string, content: string) => {
    try {
      await dataService.createBranch(parentId, content);
      
      // Refresh data to show the new branch
      await refreshData();
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error;
    }
  }, [refreshData]);
  
    // Resonate with entry
  const resonateWithEntry = useCallback(async (entryId: string) => {
    try {
      await dataService.resonateWithEntry(entryId);
      // Refresh data to reflect the resonance
      await refreshData();
      // Reload resonated entries
      await loadResonatedEntries();
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
    } catch (error) {
      console.error('Failed to resonate with entry:', error);
      throw error;
    }
  }, [refreshData, loadResonatedEntries]);

  // Amplify entry
  const amplifyEntry = useCallback(async (entryId: string) => {
    try {
      await dataService.amplifyEntry(entryId);
      // Refresh data to reflect the amplification
      await refreshData();
      // Update auth state to reflect new stats
      setAuthState(authService.getAuthState());
    } catch (error) {
      console.error('Failed to amplify entry:', error);
      throw error;
    }
  }, [refreshData]);

  // Auth actions
  const login = useCallback(async (username: string, password: string) => {
    const result = await authService.login(username, password);
    setAuthState(authService.getAuthState());
    if (result.success) {
      // Refresh data after login
      await refreshData();
    }
    return result;
  }, [refreshData]);

  const signup = useCallback(async (username: string, password: string, email?: string) => {
    const result = await authService.signup(username, password, email);
    setAuthState(authService.getAuthState());
    if (result.success) {
      // Refresh data after signup
      await refreshData();
    }
    return result;
  }, [refreshData]);

  const logout = useCallback(() => {
    authService.logout();
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
    setIsHydrated(true);
    // Check for existing session after hydration
    const currentAuthState = authService.getAuthState();
    if (currentAuthState.isAuthenticated !== authState.isAuthenticated) {
      setAuthState(currentAuthState);
    }
  }, []);

  // Load initial data only if authenticated
  useEffect(() => {
    if (authState.isAuthenticated && isHydrated) {
      refreshData();
    }
  }, [authState.isAuthenticated, isHydrated, refreshData]);
  
  // Load resonated entries when data changes
  useEffect(() => {
    loadResonatedEntries();
  }, [loadResonatedEntries]);
  
  // Expose dataService globally for testing in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).nexusDataService = dataService;
      console.log('🔧 Development Mode: Access threading controls via window.nexusDataService');
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
    submitEntry,
    createBranch,
    resonateWithEntry,
    amplifyEntry,
    
    // Auth actions
    login,
    signup,
    logout,
    forceAuthRefresh,
    
    // User interaction checks
    hasUserResonated,
    hasUserAmplified,
    
    // Feed-specific methods
    getFlattenedStreamEntries: useCallback(async () => {
      const entries = await dataService.getFlattenedStreamEntries();
      return entries.map(convertToStreamEntryData);
    }, []),
    getFlattenedLogbookEntries: useCallback(async () => {
      const entries = await dataService.getFlattenedLogbookEntries();
      return entries.map(convertToStreamEntryData);
    }, []),
    getDirectChildren: useCallback(async (parentId: string) => {
      const children = await dataService.getDirectChildren(parentId);
      return children.map(convertToStreamEntryData);
    }, []),
    getParentPost: useCallback(async (childId: string) => {
      const post = await dataService.getParentPost(childId);
      return post ? convertToStreamEntryData(post) : null;
    }, []),
    
    // Threading controls
    setThreadingMode: dataService.setThreadingMode.bind(dataService),
    getThreadingConfig: dataService.getThreadingConfig.bind(dataService),
  };
}; 