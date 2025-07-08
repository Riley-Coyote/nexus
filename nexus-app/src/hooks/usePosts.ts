'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataService, convertToStreamEntryData } from '../lib/services/dataService';
import { StreamEntry, StreamEntryData } from '../lib/types';

export interface PostsHook {
  // Post data
  posts: StreamEntryData[];
  feedEntries: StreamEntry[];
  dreamEntries: StreamEntry[];
  
  // Loading states
  isLoading: boolean;
  isLoadingFeed: boolean;
  
  // Actions
  refreshPosts: () => Promise<void>;
  refreshFeedData: () => Promise<void>;
  createBranch: (parentId: string, content: string) => Promise<void>;
  ensureFeedDataLoaded: () => Promise<void>;
  
  // Unified API methods
  getPosts: (options: {
    mode: 'feed' | 'logbook' | 'dream' | 'all' | 'resonated' | 'amplified' | 'profile';
    page?: number;
    limit?: number;
    userId?: string;
    threaded?: boolean;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      type?: string;
      privacy?: 'public' | 'private';
      dateRange?: { start: Date; end: Date };
    };
  }) => Promise<StreamEntryData[]>;
  
  // Legacy methods (deprecated)
  getFlattenedStreamEntries: (page?: number, limit?: number) => Promise<StreamEntryData[]>;
  getDirectChildren: (parentId: string) => Promise<StreamEntryData[]>;
  getParentPost: (childId: string) => Promise<StreamEntryData | null>;
  getEntryType: (entryId: string) => Promise<'logbook' | 'dream' | null>;
}

/**
 * Focused posts hook - handles ONLY post data and feed operations
 * Extracted from useNexusData to follow single responsibility principle
 */
export const usePosts = (currentUserId?: string): PostsHook => {
  // Post data state
  const [posts, setPosts] = useState<StreamEntryData[]>([]);
  const [feedEntries, setFeedEntries] = useState<StreamEntry[]>([]);
  const [dreamEntries, setDreamEntries] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  
  // Load feed data (public entries only)
  const loadFeedData = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      console.log('📡 Loading public feed data...');
      
      // Only pass targetUserId if we have a valid user ID (not undefined, null, or empty string)
      const validUserId = currentUserId && currentUserId.trim() !== '' ? currentUserId : undefined;
      
      // Use optimized method that gets posts WITH user interaction states in a single query
      const [publicLogbookEntries, publicDreamEntries] = await Promise.all([
        dataService.getPostsWithUserStates({ 
          mode: 'logbook', 
          page: 1, 
          limit: 20, 
          targetUserId: validUserId, // Include user interaction states only if valid
          filters: { privacy: 'public' } 
        }),
        dataService.getPostsWithUserStates({ 
          mode: 'dream', 
          page: 1, 
          limit: 20, 
          targetUserId: validUserId, // Include user interaction states only if valid
          filters: { privacy: 'public' } 
        })
      ]);
      
      // Store public entries for feed
      setFeedEntries(publicLogbookEntries);
      setDreamEntries(publicDreamEntries);
      
      // Combine for posts array
      const allPosts = [...publicLogbookEntries, ...publicDreamEntries];
      const sortedPosts = allPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setPosts(sortedPosts.map(convertToStreamEntryData));
      
      console.log(`✅ Loaded ${publicLogbookEntries.length} logbook + ${publicDreamEntries.length} dream entries`);
      
    } catch (error) {
      console.error('❌ Failed to load feed data:', error);
      // Set fallback states on error
      setFeedEntries([]);
      setDreamEntries([]);
      setPosts([]);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [currentUserId]);
  
  // Refresh all post data
  const refreshPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Refreshing all post data...');
      await loadFeedData();
    } finally {
      setIsLoading(false);
    }
  }, [loadFeedData]);
  
  // Refresh feed data specifically
  const refreshFeedData = useCallback(async () => {
    console.log('🔄 Refreshing feed data...');
    await loadFeedData();
  }, [loadFeedData]);
  
  // Create branch
  const createBranch = useCallback(async (parentId: string, content: string) => {
    if (!currentUserId || currentUserId.trim() === '') {
      throw new Error('No user logged in');
    }
    
    try {
      console.log('🌿 Creating branch for parent:', parentId);
      
      // Step 1: Create the branch (critical operation)
      await dataService.createBranch(parentId, content);
      
      // Step 2: Refresh data to show new branch
      await loadFeedData();
      
      console.log('✅ Branch created successfully');
      
    } catch (error) {
      console.error('❌ Failed to create branch:', error);
      throw error; // This will be caught by the UI error handling
    }
  }, [currentUserId, loadFeedData]);
  
  // Ensure feed data is loaded (for lazy loading)
  const ensureFeedDataLoaded = useCallback(async () => {
    // Only load if we don't have data and we're not currently loading
    if (posts.length === 0 && feedEntries.length === 0 && !isLoadingFeed) {
      console.log('📡 Ensuring feed data is loaded...');
      await loadFeedData();
    }
  }, [posts.length, feedEntries.length, isLoadingFeed, loadFeedData]);
  
  // Unified API for getting posts
  const getPosts = useCallback(async (options: {
    mode: 'feed' | 'logbook' | 'dream' | 'all' | 'resonated' | 'amplified' | 'profile';
    page?: number;
    limit?: number;
    userId?: string;
    threaded?: boolean;
    sortBy?: 'timestamp' | 'interactions';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      type?: string;
      privacy?: 'public' | 'private';
      dateRange?: { start: Date; end: Date };
    };
  }) => {
    console.log('📡 Getting posts with options:', options);
    
    try {
      // Use the optimized dataService method
      const entries = await dataService.getPostsForUI(options);
      // Handle type conversion properly - getPostsForUI returns Post[], not StreamEntry[]
      return entries.map(entry => convertToStreamEntryData(entry as any));
    } catch (error) {
      console.error('❌ Failed to get posts:', error);
      return [];
    }
  }, []);
  
  // Legacy methods (deprecated)
  const getFlattenedStreamEntries = useCallback(async (page?: number, limit?: number) => {
    console.warn('⚠️ Using deprecated getFlattenedStreamEntries, use getPosts instead');
    const entries = await dataService.getFlattenedStreamEntries(page ?? 1, limit ?? 20);
    return entries.map(convertToStreamEntryData);
  }, []);
  
  const getDirectChildren = useCallback(async (parentId: string) => {
    const children = await dataService.getDirectChildren(parentId);
    return children.map(convertToStreamEntryData);
  }, []);
  
  const getParentPost = useCallback(async (childId: string) => {
    const post = await dataService.getParentPost(childId);
    return post ? convertToStreamEntryData(post) : null;
  }, []);
  
  const getEntryType = useCallback(async (entryId: string) => {
    return await dataService.getEntryType(entryId);
  }, []);
  
  // Load feed data on mount and when user changes
  useEffect(() => {
    console.log('📡 Posts hook initialized, loading feed data...');
    loadFeedData();
  }, [loadFeedData]);
  
  return {
    // Post data
    posts,
    feedEntries,
    dreamEntries,
    
    // Loading states
    isLoading,
    isLoadingFeed,
    
    // Actions
    refreshPosts,
    refreshFeedData,
    createBranch,
    ensureFeedDataLoaded,
    
    // Unified API
    getPosts,
    
    // Legacy methods
    getFlattenedStreamEntries,
    getDirectChildren,
    getParentPost,
    getEntryType
  };
}; 