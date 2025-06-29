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
import { DatabaseFactory } from '../database/factory';
import { DatabaseProvider } from '../database/types';
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

// 🚩 DEBUG FLAG - Quick toggle for local development
// Set to 'true' for in-memory mock data, 'false' for database
const DEBUG_USE_MOCK_DATA = true; // 👈 CHANGE THIS FOR QUICK TESTING

// Configuration for switching between mock and database
const USE_MOCK_DATA = DEBUG_USE_MOCK_DATA || process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
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
  
  // Database provider for persistent storage
  private database: DatabaseProvider | null = null;
  private isInitialized = false;

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
        console.log('✅ Database connected successfully');
        console.log('🗄️ Data Source: Supabase Database');
      } else {
        // Initialize with mock data if no entries exist (mock mode)
        if (this.logbookEntries.length === 0) {
          this.logbookEntries = [...mockLogbookEntries];
        }
        if (this.sharedDreams.length === 0) {
          this.sharedDreams = [...mockSharedDreams];
        }
        console.log('📝 Using mock data mode');
        console.log('🧪 Data Source: In-Memory Mock Data');
        if (DEBUG_USE_MOCK_DATA) {
          console.log('🚩 Debug flag enabled: Change DEBUG_USE_MOCK_DATA in dataService.ts to switch');
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize data service:', error);
      // Fallback to mock mode if database fails
      if (!USE_MOCK_DATA) {
        console.log('⚠️ Database failed, falling back to in-memory mock data');
        console.log('🧪 Data Source: In-Memory Mock Data (Fallback)');
        if (this.logbookEntries.length === 0) {
          this.logbookEntries = [...mockLogbookEntries];
        }
        if (this.sharedDreams.length === 0) {
          this.sharedDreams = [...mockSharedDreams];
        }
      }
      this.isInitialized = true;
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
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Sort by timestamp desc (newest first) for consistent behavior
      return [...this.logbookEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    try {
      return await this.database.getEntries('logbook', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Sort fallback data too
      return [...this.logbookEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
      // Sort by timestamp desc (newest first) for consistent behavior
      return [...this.sharedDreams].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    try {
      return await this.database.getEntries('dream', {
        page,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Sort fallback data too
      return [...this.sharedDreams].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  }

  // Get all stream entries (for ResonanceField) - combines logbook and dreams
  async getStreamEntries(): Promise<StreamEntry[]> {
    await this.initializeData();
    
    if (USE_MOCK_DATA || !this.database) {
      await simulateApiDelay();
      // Combine both arrays and sort by timestamp desc (newest first)
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      return allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    try {
      // Get entries from both types and combine
      const [logbookEntries, dreamEntries] = await Promise.all([
        this.database.getEntries('logbook', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' }),
        this.database.getEntries('dream', { page: 1, limit: 100, sortBy: 'timestamp', sortOrder: 'desc' })
      ]);
      
      // Combine and sort by timestamp
      const allEntries = [...logbookEntries, ...dreamEntries];
      return allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('❌ Database error, falling back to mock data:', error);
      // Fallback: combine mock data and sort
      const allEntries = [...this.logbookEntries, ...this.sharedDreams];
      return allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

  // Actions
  async submitEntry(content: string, type: string, isPublic: boolean, mode: 'logbook' | 'dream'): Promise<StreamEntry> {
    await this.initializeData();
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to submit entries');
    }
    
    // Create entry object
    const entryData: Omit<StreamEntry, 'id'> = {
      parentId: null,
      children: [],
      depth: 0,
      type: type,
      agent: currentUser.name,
      connections: 0,
      metrics: { c: 0.5, r: 0.5, x: 0.5 },
      timestamp: formatTimestamp(),
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

  async resonateWithEntry(entryId: string): Promise<void> {
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
    
    try {
      // Check if user has already resonated using database
      const existingResonances = await this.database.getUserResonances(currentUser.id);
      const hasResonated = existingResonances.includes(entryId);
      
      if (hasResonated) {
        // Remove resonance
        await this.database.removeUserResonance(currentUser.id, entryId);
        await this.database.updateEntryInteractions(entryId, 'resonances', -1);
      } else {
        // Add resonance
        await this.database.addUserResonance(currentUser.id, entryId);
        await this.database.updateEntryInteractions(entryId, 'resonances', 1);
        authService.updateUserStats('connections');
      }
    } catch (error) {
      console.error('❌ Database error during resonance, falling back to mock:', error);
      // Fallback to in-memory handling
      if (!this.userResonances.has(currentUser.id)) {
        this.userResonances.set(currentUser.id, new Set());
      }
      
      const userResonances = this.userResonances.get(currentUser.id)!;
      if (userResonances.has(entryId)) {
        userResonances.delete(entryId);
        this.updateEntryInteraction(entryId, 'resonances', -1);
      } else {
        userResonances.add(entryId);
        this.updateEntryInteraction(entryId, 'resonances', 1);
        authService.updateUserStats('connections');
      }
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