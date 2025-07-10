'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../lib/services/dataService';
import { User, StreamEntry, ProfileViewState } from '../lib/types';

export interface ProfileHook {
  // Profile state
  profileViewState: ProfileViewState;
  profileUser: User | null;
  profileUserPosts: StreamEntry[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  updateUserProfile: (updates: { name?: string; bio?: string; location?: string }) => Promise<void>;
  viewUserProfile: (username: string) => Promise<void>;
  viewSelfProfile: () => Promise<void>;
  getCurrentProfileUser: () => User | null;
  
  // Follow system actions
  followUser: (followedId: string) => Promise<boolean>;
  unfollowUser: (followedId: string) => Promise<boolean>;
  isFollowing: (followedId: string) => Promise<boolean>;
  getFollowers: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
  getFollowing: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
  getMutualFollows: (userId: string, limit?: number) => Promise<any[]>;
  getFollowSuggestions: (userId: string, limit?: number) => Promise<any[]>;
}

/**
 * Focused profile hook - handles ONLY profile data and user management
 * Extracted from useNexusData to follow single responsibility principle
 */
export const useProfile = (currentUser?: User | null): ProfileHook => {
  // Profile state - start with no specific mode to prevent flash
  const [profileViewState, setProfileViewState] = useState<ProfileViewState>({
    mode: 'self'
  });
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileUserPosts, setProfileUserPosts] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: { name?: string; bio?: string; location?: string }) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      setIsLoading(true);
      console.log('👤 Updating user profile:', updates);
      
      // Persist the update via the data service and receive the fresh user record
      const updatedUser = await dataService.updateUserProfile(updates);
      
      // If we are currently viewing our own profile, keep it in sync too
      setProfileUser(prev => (prev && prev.id === updatedUser.id ? updatedUser : prev));
      
      console.log('✅ User profile updated successfully');
      
      // Return void as per interface
      return;
      
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  
  // View another user's profile
  const viewUserProfile = useCallback(async (username: string) => {
    try {
      setIsLoading(true);
      // Immediately switch to 'other' mode and clear previous user to prevent flash
      setProfileViewState({ mode: 'other' });
      setProfileUser(null);
      setProfileUserPosts([]);
      setHasInitialized(false);
      
      console.log('👤 Loading profile for user:', username);
      
      // Load user profile data
      const user = await dataService.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Load user's posts using direct database call (same pattern as ProfileView component)
      const { DatabaseFactory } = await import('../lib/database/factory');
      const database = DatabaseFactory.getInstance();
      const entriesWithUserStates = await database.getProfileEntries?.(user.id, {
        targetUserId: currentUser?.id, // For checking user interaction states
        includePrivate: false, // Only public posts for other users
        offset: 0,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // Convert to StreamEntry format for compatibility
      const posts = entriesWithUserStates?.map(entry => ({
        id: entry.id,
        parentId: entry.parentId,
        children: entry.children || [],
        depth: entry.depth || 0,
        type: entry.type,
        agent: entry.agent || entry.username,
        connections: entry.connections || 0,
        metrics: entry.metrics || { c: 0.5, r: 0.5, x: 0.5 },
        timestamp: entry.timestamp,
        content: entry.content,
        actions: entry.actions || [],
        privacy: entry.privacy,
        interactions: {
          resonances: entry.resonance_count || 0,
          branches: entry.branch_count || 0,
          amplifications: entry.amplification_count || 0,
          shares: entry.share_count || 0
        },
        entryType: entry.entryType,
        // Preserve per-entry user interaction state so ProfileView can highlight buttons correctly
        userInteractionStates: {
          hasResonated: entry.has_resonated || false,
          hasAmplified: entry.has_amplified || false,
        },
        threads: entry.threads || [],
        isAmplified: entry.isAmplified || false,
        userId: entry.userId,
        username: entry.username
      })) || [];
      
      // Update profile state
      setProfileUser(user);
      setProfileUserPosts(posts);
      setHasInitialized(true); // Mark as initialized after loading another user
      
      console.log(`✅ Loaded profile for ${username} with ${posts.length} posts`);
      
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  
  // View self profile
  const viewSelfProfile = useCallback(async () => {
    if (!currentUser) {
      console.log('👤 No current user, cannot view self profile');
      return;
    }

    try {
      setIsLoading(true);
      // Immediately switch to 'self' mode and clear previous data to prevent flash
      setProfileViewState({ mode: 'self' });
      setProfileUser(null);
      setProfileUserPosts([]);
      setHasInitialized(false);
      
      console.log('👤 Switching to self profile view');
      
      // Load user's own posts using direct database call
      const { DatabaseFactory } = await import('../lib/database/factory');
      const database = DatabaseFactory.getInstance();
      const entriesWithUserStates = await database.getProfileEntries?.(currentUser.id, {
        targetUserId: currentUser.id, // For checking user interaction states
        includePrivate: true, // Include private posts for own profile
        offset: 0,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      // Convert to StreamEntry format for compatibility
      const posts = entriesWithUserStates?.map(entry => ({
        id: entry.id,
        parentId: entry.parentId,
        children: entry.children || [],
        depth: entry.depth || 0,
        type: entry.type,
        agent: entry.agent || entry.username,
        connections: entry.connections || 0,
        metrics: entry.metrics || { c: 0.5, r: 0.5, x: 0.5 },
        timestamp: entry.timestamp,
        content: entry.content,
        actions: entry.actions || [],
        privacy: entry.privacy,
        interactions: {
          resonances: entry.resonance_count || 0,
          branches: entry.branch_count || 0,
          amplifications: entry.amplification_count || 0,
          shares: entry.share_count || 0
        },
        entryType: entry.entryType,
        // Preserve per-entry user interaction state so ProfileView can highlight buttons correctly
        userInteractionStates: {
          hasResonated: entry.has_resonated || false,
          hasAmplified: entry.has_amplified || false,
        },
        threads: entry.threads || [],
        isAmplified: entry.isAmplified || false,
        userId: entry.userId,
        username: entry.username
      })) || [];

      // Update profile state
      setProfileViewState({ mode: 'self' });
      setProfileUser(currentUser);
      setProfileUserPosts(posts);
      setHasInitialized(true); // Mark as initialized after loading self profile
      
      console.log(`✅ Loaded self profile for ${currentUser.username} with ${posts.length} posts`);
      
    } catch (error) {
      console.error('❌ Failed to load self profile:', error);
      // Fallback to basic self profile without posts
      setProfileViewState({ mode: 'self' });
      setProfileUser(currentUser);
      setProfileUserPosts([]);
      setHasInitialized(true); // Mark as initialized even on error
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  
  // Get current profile user - prevent flash by being more careful about when to return currentUser
  const getCurrentProfileUser = useCallback((): User | null => {
    // If we're loading another user's profile, don't return currentUser until we have the actual profile
    if (profileViewState.mode === 'other') {
      return profileUser; // Only return profileUser, never fallback to currentUser
    }
    
    // For self mode, return currentUser only if we've explicitly set it
    if (profileViewState.mode === 'self' && hasInitialized) {
      return currentUser || null;
    }
    
    // During initial loading, return null to show loading state
    return null;
  }, [profileViewState.mode, profileUser, currentUser, hasInitialized]);
  
  // Follow user
  const followUser = useCallback(async (followedId: string) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      console.log('👥 Following user:', followedId);
      const success = await dataService.followUser(followedId);
      
      if (success) {
        console.log('✅ Successfully followed user');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to follow user:', error);
      throw error;
    }
  }, [currentUser]);
  
  // Unfollow user
  const unfollowUser = useCallback(async (followedId: string) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      console.log('👥 Unfollowing user:', followedId);
      const success = await dataService.unfollowUser(followedId);
      
      if (success) {
        console.log('✅ Successfully unfollowed user');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to unfollow user:', error);
      throw error;
    }
  }, [currentUser]);
  
  // Check if following user
  const isFollowing = useCallback(async (followedId: string) => {
    if (!currentUser) {
      return false;
    }
    
    try {
      return await dataService.isFollowing(followedId);
    } catch (error) {
      console.error('❌ Failed to check following status:', error);
      return false;
    }
  }, [currentUser]);
  
  // Get followers
  const getFollowers = useCallback(async (userId: string, limit?: number, offset?: number) => {
    try {
      return await dataService.getFollowers(userId, limit, offset);
    } catch (error) {
      console.error('❌ Failed to get followers:', error);
      return [];
    }
  }, []);
  
  // Get following
  const getFollowing = useCallback(async (userId: string, limit?: number, offset?: number) => {
    try {
      return await dataService.getFollowing(userId, limit, offset);
    } catch (error) {
      console.error('❌ Failed to get following:', error);
      return [];
    }
  }, []);
  
  // Get mutual follows
  const getMutualFollows = useCallback(async (userId: string, limit?: number) => {
    try {
      return await dataService.getMutualFollows(userId);
    } catch (error) {
      console.error('❌ Failed to get mutual follows:', error);
      return [];
    }
  }, []);
  
  // Get follow suggestions
  const getFollowSuggestions = useCallback(async (userId: string, limit?: number) => {
    try {
      // TODO: Implement when dataService method is available
      console.log('Follow suggestions not implemented yet');
      return [];
    } catch (error) {
      console.error('❌ Failed to get follow suggestions:', error);
      return [];
    }
  }, []);
  
  // Update profile user when current user changes
  useEffect(() => {
    if (profileViewState.mode === 'self' && currentUser) {
      setProfileUser(currentUser);
    }
  }, [currentUser, profileViewState.mode]);
  
  return {
    // Profile state
    profileViewState,
    profileUser,
    profileUserPosts,
    
    // Loading states
    isLoading,
    
    // Actions
    updateUserProfile,
    viewUserProfile,
    viewSelfProfile,
    getCurrentProfileUser,
    
    // Follow system actions
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
    getMutualFollows,
    getFollowSuggestions
  };
}; 