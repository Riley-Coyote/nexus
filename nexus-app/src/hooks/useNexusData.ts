import { useState, useEffect, useMemo, useCallback } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
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
  JournalMode
} from '../lib/types';

export interface NexusData {
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
  resonateWithEntry: (entryId: string) => Promise<void>;
  amplifyEntry: (entryId: string) => Promise<void>;
}

export const useNexusData = (): NexusData => {
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
  
  // Loading states
  const [isLoadingLogbook, setIsLoadingLogbook] = useState(true);
  const [isLoadingDreams, setIsLoadingDreams] = useState(true);
  
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
  
  const resonatedEntries = useMemo(() => {
    // Mock resonated entries - in real app, this would come from user's resonated list
    return [
      ...logbookEntriesData.filter(entry => entry.id === 'logbook_001'),
      ...dreamEntriesData.filter(entry => entry.id === 'dream_001'),
    ];
  }, [logbookEntriesData, dreamEntriesData]);
  
  const isLoading = isLoadingLogbook || isLoadingDreams;
  
  // Load logbook data
  const loadLogbookData = useCallback(async () => {
    setIsLoadingLogbook(true);
    try {
      const [state, network, vitals, agents, entries] = await Promise.all([
        dataService.getLogbookState(),
        dataService.getNetworkStatus(),
        dataService.getSystemVitals(),
        dataService.getActiveAgents(),
        dataService.getLogbookEntries()
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
      
      if (mode === 'logbook') {
        setLogbookEntries(prev => [newEntry, ...prev]);
      } else {
        setSharedDreams(prev => [newEntry, ...prev]);
      }
    } catch (error) {
      console.error('Failed to submit entry:', error);
      throw error;
    }
  }, []);
  
  // Resonate with entry
  const resonateWithEntry = useCallback(async (entryId: string) => {
    try {
      await dataService.resonateWithEntry(entryId);
      // Update local state to reflect the resonance
      // In a real app, you'd refetch or optimistically update
    } catch (error) {
      console.error('Failed to resonate with entry:', error);
      throw error;
    }
  }, []);
  
  // Amplify entry
  const amplifyEntry = useCallback(async (entryId: string) => {
    try {
      await dataService.amplifyEntry(entryId);
      // Update local state to reflect the amplification
    } catch (error) {
      console.error('Failed to amplify entry:', error);
      throw error;
    }
  }, []);
  
  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  return {
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
    resonateWithEntry,
    amplifyEntry,
  };
}; 