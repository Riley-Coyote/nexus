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
  DreamPatterns
} from '../types';
import { StreamEntryData } from '../../components/StreamEntry';
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
  mockLogbookField
} from '../data/mockData';

// Configuration for switching between mock and real API
const USE_MOCK_DATA = true; // Set to false when backend is ready
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Utility function to convert StreamEntry to StreamEntryData
export const convertToStreamEntryData = (entry: StreamEntry): StreamEntryData => ({
  id: entry.id,
  parentId: entry.parentId,
  depth: entry.depth,
  type: entry.type,
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
});

// Simulated API delay for development
const simulateApiDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

class DataService {
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
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockLogbookEntries;
    }
    
    const response = await fetch(`${API_BASE_URL}/logbook/entries?page=${page}&limit=${limit}`);
    const data = await response.json();
    return data.entries;
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
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockSharedDreams;
    }
    
    const response = await fetch(`${API_BASE_URL}/dreams/shared?page=${page}&limit=${limit}`);
    const data = await response.json();
    return data.dreams;
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

  // Actions
  async submitEntry(content: string, type: string, isPublic: boolean, mode: 'logbook' | 'dream'): Promise<StreamEntry> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay(300);
      
      // Create a mock new entry
      const newEntry: StreamEntry = {
        id: `${mode}_${Date.now()}`,
        parentId: null,
        children: [],
        depth: 0,
        type: type,
        agent: "User",
        connections: 0,
        metrics: { c: 0.5, r: 0.5, x: 0.5 },
        timestamp: new Date().toISOString(),
        content: content,
        actions: ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
        privacy: isPublic ? "public" : "private",
        interactions: {
          resonances: 0,
          branches: 0,
          amplifications: 0,
          shares: 0
        },
        threads: [],
        isAmplified: false
      };
      
      return newEntry;
    }
    
    const response = await fetch(`${API_BASE_URL}/${mode}/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        type,
        isPublic
      })
    });
    
    const data = await response.json();
    return data;
  }

  async resonateWithEntry(entryId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay(100);
      console.log(`Resonated with entry: ${entryId}`);
      return;
    }
    
    await fetch(`${API_BASE_URL}/entries/${entryId}/resonate`, {
      method: 'POST'
    });
  }

  async amplifyEntry(entryId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay(100);
      console.log(`Amplified entry: ${entryId}`);
      return;
    }
    
    await fetch(`${API_BASE_URL}/entries/${entryId}/amplify`, {
      method: 'POST'
    });
  }
}

// Export singleton instance
export const dataService = new DataService(); 