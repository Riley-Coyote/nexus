'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../lib/services/dataService';
import { 
  LogbookState, 
  NetworkStatus, 
  SystemVital, 
  ActiveAgent,
  StreamEntry,
  EntryComposerData,
  JournalMode
} from '../lib/types';
import { mockSystemVitals, mockActiveAgents } from '../lib/data/mockData';

export interface LogbookHook {
  // Logbook state
  logbookState: LogbookState | null;
  networkStatus: NetworkStatus | null;
  systemVitals: SystemVital[];
  activeAgents: ActiveAgent[];
  logbookEntries: StreamEntry[];
  entryComposer: EntryComposerData;
  logbookField: any;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  refreshLogbook: () => Promise<void>;
  submitLogbookEntry: (content: string, type: string, isPublic: boolean) => Promise<void>;
  ensureLogbookDataLoaded: () => Promise<void>;
}

/**
 * Focused logbook hook - handles ONLY logbook data and operations
 * Extracted from useNexusData to follow single responsibility principle
 */
export const useLogbook = (currentUserId?: string): LogbookHook => {
  // Logbook state
  const [logbookState, setLogbookState] = useState<LogbookState | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [systemVitals, setSystemVitals] = useState<SystemVital[]>(mockSystemVitals);
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>(mockActiveAgents);
  const [logbookEntries, setLogbookEntries] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Static data (computed once)
  const entryComposer = dataService.getEntryComposer('logbook');
  const logbookField = dataService.getLogbookField();
  
  // Load logbook data (user-specific)
  const loadLogbookData = useCallback(async () => {
    if (!currentUserId) {
      console.log('📖 No user ID provided, skipping logbook data load');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📖 Loading logbook data for user:', currentUserId);
      
      const [state, network, vitals, agents, entries] = await Promise.all([
        dataService.getLogbookState(),
        dataService.getNetworkStatus(),
        dataService.getSystemVitals(),
        dataService.getActiveAgents(),
        // Use optimized getPosts method for logbook entries
        dataService.getPosts({ 
          mode: 'logbook', 
          page: 1, 
          limit: 20, 
          threaded: false,
          userId: currentUserId
        })
      ]);
      
      setLogbookState(state);
      setNetworkStatus(network);
      setSystemVitals(vitals);
      setActiveAgents(agents);
      
      // Filter entries by current user for privacy
      const filteredEntries = entries.filter(entry => entry.userId === currentUserId);
      setLogbookEntries(filteredEntries);
      
      console.log(`✅ Loaded ${filteredEntries.length} logbook entries for user`);
      
    } catch (error) {
      console.error('❌ Failed to load logbook data:', error);
      // Set fallback states on error
      setLogbookState(null);
      setNetworkStatus(null);
      setLogbookEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);
  
  // Refresh logbook data
  const refreshLogbook = useCallback(async () => {
    console.log('🔄 Refreshing logbook data...');
    await loadLogbookData();
  }, [loadLogbookData]);
  
  // Submit new logbook entry
  const submitLogbookEntry = useCallback(async (content: string, type: string, isPublic: boolean) => {
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    
    try {
      console.log('📝 Submitting new logbook entry...');
      
      const newEntry = await dataService.submitEntry(content, type, isPublic, 'logbook');
      
      // Refresh logbook data to include new entry
      await loadLogbookData();
      
      console.log('✅ Logbook entry submitted successfully');
      
    } catch (error) {
      console.error('❌ Failed to submit logbook entry:', error);
      throw error;
    }
  }, [currentUserId, loadLogbookData]);
  
  // Ensure logbook data is loaded (for lazy loading)
  const ensureLogbookDataLoaded = useCallback(async () => {
    if (!currentUserId) {
      console.log('📖 No user ID provided, cannot load logbook data');
      return;
    }
    
    // Only load if we don't have data and we're not currently loading
    if (logbookEntries.length === 0 && !isLoading) {
      console.log('📖 Ensuring logbook data is loaded...');
      await loadLogbookData();
    }
  }, [currentUserId, logbookEntries.length, isLoading, loadLogbookData]);
  
  // Load logbook data when user changes
  useEffect(() => {
    if (currentUserId) {
      console.log('📖 User changed, loading logbook data for:', currentUserId);
      loadLogbookData();
    } else {
      // Clear data when user logs out
      console.log('📖 No user, clearing logbook data');
      setLogbookState(null);
      setNetworkStatus(null);
      setLogbookEntries([]);
    }
  }, [currentUserId, loadLogbookData]);
  
  return {
    // Logbook state
    logbookState,
    networkStatus,
    systemVitals,
    activeAgents,
    logbookEntries,
    entryComposer,
    logbookField,
    
    // Loading states
    isLoading,
    
    // Actions
    refreshLogbook,
    submitLogbookEntry,
    ensureLogbookDataLoaded
  };
}; 