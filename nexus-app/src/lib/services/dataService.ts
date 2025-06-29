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
  User
} from '../types';
import { authService } from './authService';
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
  // In-memory storage for user-specific data
  private logbookEntries: StreamEntry[] = [];
  private sharedDreams: StreamEntry[] = [];
  private userResonances: Map<string, Set<string>> = new Map(); // userId -> Set of entryIds
  private userAmplifications: Map<string, Set<string>> = new Map(); // userId -> Set of entryIds

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with mock data if no entries exist
    if (this.logbookEntries.length === 0) {
      this.logbookEntries = [...mockLogbookEntries];
    }
    if (this.sharedDreams.length === 0) {
      this.sharedDreams = [...mockSharedDreams];
    }
  }

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
      return this.logbookEntries;
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
      return this.sharedDreams;
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
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to submit entries');
      }
      
      // Create a new entry with user attribution
      const newEntry: StreamEntry = {
        id: `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        parentId: null,
        children: [],
        depth: 0,
        type: type,
        agent: currentUser.name,
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
        isAmplified: false,
        userId: currentUser.id // Add user ID for tracking
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
      await simulateApiDelay();
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to resonate');
      }

      // Check if user has already resonated
      if (!this.userResonances.has(currentUser.id)) {
        this.userResonances.set(currentUser.id, new Set());
      }
      
      const userResonances = this.userResonances.get(currentUser.id)!;
      if (userResonances.has(entryId)) {
        // User already resonated, so remove resonance
        userResonances.delete(entryId);
        this.updateEntryInteraction(entryId, 'resonances', -1);
      } else {
        // Add resonance
        userResonances.add(entryId);
        this.updateEntryInteraction(entryId, 'resonances', 1);
        authService.updateUserStats('connections');
      }
      
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}/resonate`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to resonate with entry');
    }
  }

  async amplifyEntry(entryId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to amplify');
      }

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
      } else {
        // Add amplification
        userAmplifications.add(entryId);
        this.updateEntryInteraction(entryId, 'amplifications', 1);
        this.updateEntryAmplified(entryId, true);
        authService.updateUserStats('connections');
      }
      
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}/amplify`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to amplify entry');
    }
  }

  // Helper methods for updating entry interactions
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

  // Get user-specific data
  getUserResonatedEntries(userId: string): string[] {
    const userResonances = this.userResonances.get(userId);
    return userResonances ? Array.from(userResonances) : [];
  }

  hasUserResonated(userId: string, entryId: string): boolean {
    const userResonances = this.userResonances.get(userId);
    return userResonances ? userResonances.has(entryId) : false;
  }

  hasUserAmplified(userId: string, entryId: string): boolean {
    const userAmplifications = this.userAmplifications.get(userId);
    return userAmplifications ? userAmplifications.has(entryId) : false;
  }
}

// Export singleton instance
export const dataService = new DataService(); 