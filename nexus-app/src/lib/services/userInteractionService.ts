import { authService } from './supabaseAuthService';
import { supabase } from '../supabase';

export interface UserInteractionState {
  hasResonated: boolean;
  hasAmplified: boolean;
}

export interface UserInteractionBatch {
  userId: string;
  postIds: string[];
  states: Map<string, UserInteractionState>;
  timestamp: number;
}

/**
 * UserInteractionService - Following social media playbook patterns
 * 
 * Separates "Did THIS user interact?" from "How many interactions?" 
 * Implements batch loading and efficient caching like Twitter/Instagram
 */
class UserInteractionService {
  // Cache for user interaction states - follows playbook pattern
  private userStatesCache: Map<string, Map<string, UserInteractionState>> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds - same as Twitter
  
  // Batch loading state management
  private loadingPromises: Map<string, Promise<Map<string, UserInteractionState>>> = new Map();
  
  /**
   * Batch load user interaction states for all posts on current page
   * This is the core method that follows the social media playbook
   */
  async batchLoadUserStates(userId: string, postIds: string[]): Promise<Map<string, UserInteractionState>> {
    if (!userId || postIds.length === 0) {
      return new Map();
    }

    const cacheKey = `${userId}:${postIds.sort().join(',')}`;
    
    // Check if we're already loading this batch
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ Batch loading already in progress for ${postIds.length} posts`);
      return this.loadingPromises.get(cacheKey)!;
    }

    // Check cache first
    const cachedStates = this.getCachedStates(userId, postIds);
    if (cachedStates && this.isCacheValid(userId)) {
      console.log(`⚡ Using cached user states for ${postIds.length} posts`);
      return cachedStates;
    }

    // Create loading promise
    const loadingPromise = this.executeBatchLoad(userId, postIds);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Execute the actual batch load from database
   */
  private async executeBatchLoad(userId: string, postIds: string[]): Promise<Map<string, UserInteractionState>> {
    console.log(`🔄 Batch loading user interaction states for ${postIds.length} posts`);
    
    try {
      // Single SQL query following playbook pattern - FIXED table names
      const { data, error } = await supabase
        .from('stream_entries')
        .select(`
          id,
          user_resonances!left(user_id),
          user_amplifications!left(user_id)
        `)
        .in('id', postIds)
        .eq('user_resonances.user_id', userId)
        .eq('user_amplifications.user_id', userId);

      if (error) {
        console.error('❌ Error batch loading user states:', error);
        return new Map();
      }

      // Process results into efficient Map structure
      const statesMap = new Map<string, UserInteractionState>();
      
      postIds.forEach(postId => {
        const postData = data?.find(item => item.id === postId);
        const hasResonated = postData?.user_resonances && Array.isArray(postData.user_resonances) && postData.user_resonances.length > 0;
        const hasAmplified = postData?.user_amplifications && Array.isArray(postData.user_amplifications) && postData.user_amplifications.length > 0;
        
        statesMap.set(postId, {
          hasResonated: hasResonated || false,
          hasAmplified: hasAmplified || false
        });
      });

      // Update cache
      this.updateCache(userId, statesMap);
      
      console.log(`✅ Batch loaded user states for ${statesMap.size} posts`);
      return statesMap;
      
    } catch (error) {
      console.error('❌ Failed to batch load user interaction states:', error);
      return new Map();
    }
  }

  /**
   * Fast O(1) lookup for user interaction state
   * This is called frequently during rendering
   */
  hasUserResonated(userId: string, postId: string): boolean {
    const userStates = this.userStatesCache.get(userId);
    if (!userStates) return false;
    
    return userStates.get(postId)?.hasResonated || false;
  }

  /**
   * Fast O(1) lookup for user amplification state
   */
  hasUserAmplified(userId: string, postId: string): boolean {
    const userStates = this.userStatesCache.get(userId);
    if (!userStates) return false;
    
    return userStates.get(postId)?.hasAmplified || false;
  }

  /**
   * Update single interaction state (for optimistic updates)
   */
  updateUserInteractionState(userId: string, postId: string, type: 'resonance' | 'amplification', newState: boolean): void {
    let userStates = this.userStatesCache.get(userId);
    if (!userStates) {
      userStates = new Map();
      this.userStatesCache.set(userId, userStates);
    }

    const currentState = userStates.get(postId) || { hasResonated: false, hasAmplified: false };
    const updatedState = { ...currentState };

    if (type === 'resonance') {
      updatedState.hasResonated = newState;
    } else {
      updatedState.hasAmplified = newState;
    }

    userStates.set(postId, updatedState);
    console.log(`🔄 Updated ${type} state for post ${postId}: ${newState}`);
  }

  /**
   * Get cached states for a batch of posts
   */
  private getCachedStates(userId: string, postIds: string[]): Map<string, UserInteractionState> | null {
    const userStates = this.userStatesCache.get(userId);
    if (!userStates) return null;

    // Check if we have all requested post states
    const hasAllStates = postIds.every(postId => userStates.has(postId));
    if (!hasAllStates) return null;

    // Return subset of cached states
    const result = new Map<string, UserInteractionState>();
    postIds.forEach(postId => {
      const state = userStates.get(postId);
      if (state) {
        result.set(postId, state);
      }
    });

    return result;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(userId: string): boolean {
    const timestamp = this.cacheTimestamps.get(userId);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Update cache with new states
   */
  private updateCache(userId: string, newStates: Map<string, UserInteractionState>): void {
    let userStates = this.userStatesCache.get(userId);
    if (!userStates) {
      userStates = new Map();
      this.userStatesCache.set(userId, userStates);
    }

    // Merge new states with existing cache
    newStates.forEach((state, postId) => {
      userStates!.set(postId, state);
    });

    // Update timestamp
    this.cacheTimestamps.set(userId, Date.now());
  }

  /**
   * Clear cache for a specific user (on logout)
   */
  clearUserCache(userId: string): void {
    this.userStatesCache.delete(userId);
    this.cacheTimestamps.delete(userId);
    console.log(`🧹 Cleared interaction cache for user ${userId}`);
  }

  /**
   * Clear all caches (for debugging)
   */
  clearAllCaches(): void {
    this.userStatesCache.clear();
    this.cacheTimestamps.clear();
    this.loadingPromises.clear();
    console.log('🧹 Cleared all interaction caches');
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): { users: number; totalStates: number; cacheHitRate: number } {
    let totalStates = 0;
    this.userStatesCache.forEach(userStates => {
      totalStates += userStates.size;
    });

    return {
      users: this.userStatesCache.size,
      totalStates,
      cacheHitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Pre-populate cache with known states (for optimization)
   */
  prePopulateCache(userId: string, states: Map<string, UserInteractionState>): void {
    this.updateCache(userId, states);
    console.log(`💾 Pre-populated cache with ${states.size} states for user ${userId}`);
  }
}

// Export singleton instance
export const userInteractionService = new UserInteractionService();

// Expose for debugging in development (client-side only)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).userInteractionService = userInteractionService;
} 