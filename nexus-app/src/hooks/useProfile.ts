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
  viewSelfProfile: () => void;
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
  // Profile state
  const [profileViewState, setProfileViewState] = useState<ProfileViewState>({
    mode: 'self'
  });
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileUserPosts, setProfileUserPosts] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
      console.log('👤 Loading profile for user:', username);
      
      // Load user profile data
      const user = await dataService.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Load user's posts
      const posts = await dataService.getPosts({ mode: 'profile', userId: user.id });
      
      // Update profile state
      setProfileViewState({ mode: 'other' });
      setProfileUser(user);
      setProfileUserPosts(posts);
      
      console.log(`✅ Loaded profile for ${username} with ${posts.length} posts`);
      
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // View self profile
  const viewSelfProfile = useCallback(() => {
    console.log('👤 Switching to self profile view');
    setProfileViewState({ mode: 'self' });
    setProfileUser(currentUser || null);
    setProfileUserPosts([]); // Will be loaded from user's own posts
  }, [currentUser]);
  
  // Get current profile user
  const getCurrentProfileUser = useCallback((): User | null => {
    if (profileViewState.mode === 'other') {
      return profileUser;
    }
    return currentUser || null;
  }, [profileViewState.mode, profileUser, currentUser]);
  
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