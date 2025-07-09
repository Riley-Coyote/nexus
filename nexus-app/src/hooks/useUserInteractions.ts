'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
import { userInteractionService, UserInteractionState } from '../lib/services/userInteractionService';
import { StreamEntryData } from '../lib/types';

export interface UserInteractionsHook {
  // User interaction state
  userInteractionStates: Map<string, UserInteractionState>;
  isUserStatesLoaded: boolean;
  resonatedEntries: StreamEntryData[];
  amplifiedEntries: StreamEntryData[];
  
  // Actions
  resonateWithEntry: (entryId: string) => Promise<void>;
  amplifyEntry: (entryId: string) => Promise<void>;
  createBranch: (parentId: string, content: string) => Promise<void>;
  
  // Checks
  hasUserResonated: (entryId: string) => boolean;
  hasUserAmplified: (entryId: string) => boolean;
  
  // Data loading
  refreshResonatedEntries: () => Promise<void>;
  refreshAmplifiedEntries: () => Promise<void>;
  appendResonatedEntries: (page: number, limit?: number) => Promise<StreamEntryData[]>;
  ensureResonatedEntriesLoaded: () => Promise<void>;
  ensureAmplifiedEntriesLoaded: () => Promise<void>;
  
  // Batch operations
  loadUserInteractionStates: (postIds: string[]) => Promise<void>;
}

/**
 * Focused user interactions hook - handles ONLY user interactions (resonance, amplification)
 * Extracted from useNexusData to follow single responsibility principle
 */
export const useUserInteractions = (currentUserId?: string): UserInteractionsHook => {
  // User interaction states
  const [userInteractionStates, setUserInteractionStates] = useState<Map<string, UserInteractionState>>(new Map());
  const [isUserStatesLoaded, setIsUserStatesLoaded] = useState(false);
  const [currentPostIds, setCurrentPostIds] = useState<string[]>([]);
  const [resonatedEntries, setResonatedEntries] = useState<StreamEntryData[]>([]);
  const [amplifiedEntries, setAmplifiedEntries] = useState<StreamEntryData[]>([]);
  
  // Track function calls to reduce excessive logging
  const resonatedCallsRef = useRef<Set<string>>(new Set());
  const amplifiedCallsRef = useRef<Set<string>>(new Set());
  
  // Track if we've ever had a user to distinguish logout vs initial load
  const hasHadUserRef = useRef(false);
  
  // Load user resonated entries
  const loadResonatedEntries = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      console.log('🔄 Loading resonated entries for user:', currentUserId);
      
      // Add timeout protection to prevent hanging
      const entriesPromise = dataService.getResonatedEntries(currentUserId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading resonated entries timed out')), 8000);
      });
      
      const entries = await Promise.race([entriesPromise, timeoutPromise]);
      const entriesData = entries.map(convertToStreamEntryData);
      setResonatedEntries(entriesData);
      
      console.log(`✅ Loaded ${entriesData.length} resonated entries`);
      
    } catch (error) {
      console.error('❌ Error loading resonated entries:', error);
      // Don't throw - this is a background operation that shouldn't break the UI
    }
  }, [currentUserId]);
  
  // Load user amplified entries
  const loadAmplifiedEntries = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      console.log('🔄 Loading amplified entries for user:', currentUserId);
      
      // Add timeout protection to prevent hanging
      const entriesPromise = dataService.getAmplifiedEntries(currentUserId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading amplified entries timed out')), 8000);
      });
      
      const entries = await Promise.race([entriesPromise, timeoutPromise]);
      const entriesData = entries.map(convertToStreamEntryData);
      setAmplifiedEntries(entriesData);
      
      console.log(`✅ Loaded ${entriesData.length} amplified entries`);
      
    } catch (error) {
      console.error('❌ Error loading amplified entries:', error);
      // Don't throw - this is a background operation that shouldn't break the UI
    }
  }, [currentUserId]);
  
  // Resonate with entry
  const resonateWithEntry = useCallback(async (entryId: string) => {
    if (!currentUserId) {
      console.log(`⏭️ Cannot resonate - user not authenticated`);
      return;
    }

    console.log(`🔄 INTERACTION: Resonating with entry ${entryId}`);
    console.log(`🔍 - Current user: ${currentUserId}`);
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
      userInteractionService.updateUserInteractionState(currentUserId, entryId, 'resonance', isNowResonated);
      
      // State update is async; log the expected new state to avoid 'undefined' confusion
      console.log(`🔍 - Post-interaction state verification (expected):`, newState);
      
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
  }, [currentUserId, userInteractionStates]);
  
  // Amplify entry
  const amplifyEntry = useCallback(async (entryId: string) => {
    if (!currentUserId) {
      console.log(`⏭️ Cannot amplify - user not authenticated`);
      return;
    }

    console.log(`🔄 INTERACTION: Amplifying entry ${entryId}`);
    console.log(`🔍 - Current user: ${currentUserId}`);
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
      userInteractionService.updateUserInteractionState(currentUserId, entryId, 'amplification', isNowAmplified);
      
      // State update is async; log the expected new state to avoid 'undefined' confusion
      console.log(`🔍 - Post-interaction state verification (expected):`, newState);
      
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
  }, [currentUserId, userInteractionStates]);

  // Create branch
  const createBranch = useCallback(async (parentId: string, content: string) => {
    if (!currentUserId) {
      console.log(`⏭️ Cannot create branch - user not authenticated`);
      return;
    }

    console.log(`🌿 INTERACTION: Creating branch for entry ${parentId}`);
    console.log(`🔍 - Current user: ${currentUserId}`);
    console.log(`🔍 - Content: ${content.substring(0, 100)}...`);

    try {
      // Call dataService to create the branch
      await dataService.createBranch(parentId, content);
      console.log(`✅ Successfully created branch for entry ${parentId}`);
      
      // The dataService already handles updating the interaction counts in cache
      // No need for additional state management here
      
    } catch (error) {
      console.error('❌ Failed to create branch:', error);
      throw error; // Re-throw to let the UI handle the error
    }
  }, [currentUserId]);
  
  // Check if user has resonated with entry
  const hasUserResonated = useCallback((entryId: string): boolean => {
    if (!currentUserId || !isUserStatesLoaded) {
      return false;
    }
    
    const state = userInteractionStates.get(entryId);
    return state?.hasResonated || false;
  }, [currentUserId, isUserStatesLoaded, userInteractionStates]);
  
  // Check if user has amplified entry
  const hasUserAmplified = useCallback((entryId: string): boolean => {
    if (!currentUserId || !isUserStatesLoaded) {
      return false;
    }
    
    const state = userInteractionStates.get(entryId);
    return state?.hasAmplified || false;
  }, [currentUserId, isUserStatesLoaded, userInteractionStates]);
  
  // Load user interaction states for a list of post IDs
  const loadUserInteractionStates = useCallback(async (postIds: string[]) => {
    if (!currentUserId || postIds.length === 0) {
      setIsUserStatesLoaded(true);
      return;
    }
    
    try {
      console.log(`🔄 Loading user interaction states for ${postIds.length} posts`);
      
      // Use optimized batch loading
      const states = await userInteractionService.batchLoadUserStates(currentUserId, postIds);
      
      // Update states
      setUserInteractionStates(prev => {
        const updatedMap = new Map(prev);
        states.forEach((state, postId) => {
          updatedMap.set(postId, state);
        });
        return updatedMap;
      });
      
      setCurrentPostIds(postIds);
      setIsUserStatesLoaded(true);
      
      const interactedCount = Array.from(states.values()).filter(s => s.hasResonated || s.hasAmplified).length;
      console.log(`✅ User interaction states loaded: ${states.size} total, ${interactedCount} with interactions`);
      
    } catch (error) {
      console.error('❌ Failed to load user interaction states:', error);
      setIsUserStatesLoaded(true); // Still allow rendering
    }
  }, [currentUserId]);
  
  // Refresh resonated entries
  const refreshResonatedEntries = useCallback(async () => {
    await loadResonatedEntries();
  }, [loadResonatedEntries]);
  
  // Refresh amplified entries
  const refreshAmplifiedEntries = useCallback(async () => {
    await loadAmplifiedEntries();
  }, [loadAmplifiedEntries]);
  
  // Append more resonated entries (for pagination)
  const appendResonatedEntries = useCallback(async (page: number, limit: number = 20) => {
    if (!currentUserId) return [];
    
    try {
      console.log(`🔄 Loading more resonated entries - page ${page}`);
      
      const newEntries = await dataService.getResonatedEntries(currentUserId, page, limit);
      const newEntriesData = newEntries.map(convertToStreamEntryData);
      
      // Append to existing resonated entries
      setResonatedEntries(prev => [...prev, ...newEntriesData]);
      
      console.log(`✅ Appended ${newEntriesData.length} resonated entries`);
      
      return newEntriesData;
    } catch (error) {
      console.error('❌ Error loading more resonated entries:', error);
      return [];
    }
  }, [currentUserId]);
  
  // Ensure resonated entries are loaded
  const ensureResonatedEntriesLoaded = useCallback(async () => {
    if (currentUserId && resonatedEntries.length === 0) {
      await loadResonatedEntries();
    }
  }, [currentUserId, resonatedEntries.length, loadResonatedEntries]);
  
  // Ensure amplified entries are loaded
  const ensureAmplifiedEntriesLoaded = useCallback(async () => {
    if (currentUserId && amplifiedEntries.length === 0) {
      await loadAmplifiedEntries();
    }
  }, [currentUserId, amplifiedEntries.length, loadAmplifiedEntries]);
  
  // Clear data when user logs out
  useEffect(() => {
    if (currentUserId) {
      hasHadUserRef.current = true;
    } else if (hasHadUserRef.current) {
      // Only clear and log if we previously had a user and now don't
      console.log('🔄 User logged out, clearing interaction data');
      setUserInteractionStates(new Map());
      setIsUserStatesLoaded(false);
      setCurrentPostIds([]);
      setResonatedEntries([]);
      setAmplifiedEntries([]);
    }
  }, [currentUserId]);
  
  return {
    // User interaction state
    userInteractionStates,
    isUserStatesLoaded,
    resonatedEntries,
    amplifiedEntries,
    
    // Actions
    resonateWithEntry,
    amplifyEntry,
    createBranch,
    
    // Checks
    hasUserResonated,
    hasUserAmplified,
    
    // Data loading
    refreshResonatedEntries,
    refreshAmplifiedEntries,
    appendResonatedEntries,
    ensureResonatedEntriesLoaded,
    ensureAmplifiedEntriesLoaded,
    
    // Batch operations
    loadUserInteractionStates
  };
}; 