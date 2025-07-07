'use client';

import React, { useState, useEffect, useRef } from 'react';
import PostList from './PostList';
import { Post, StreamEntry } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { makeBranchHandler } from '@/lib/utils/interactionHandlers';
import { authService } from '@/lib/services/supabaseAuthService';
import { DatabaseFactory } from '@/lib/database/factory';
import { StreamEntryWithUserStates } from '@/lib/database/types';

interface NexusFeedProps {
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  createBranch?: (parentId: string, content: string) => Promise<void>;
  refreshLogbookData?: () => Promise<void>;
  refreshDreamData?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  onShare?: (entryId: string) => void;
  onDeepDive?: (username: string, postId: string) => void;
}

export default function NexusFeed({ 
  onPostClick,
  onUserClick,
  createBranch,
  refreshLogbookData,
  refreshDreamData,
  onResonate,
  onAmplify,
  onShare,
  onDeepDive,
}: NexusFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [hasMore, setHasMore] = useState(true);
  const [isUserStatesLoaded, setIsUserStatesLoaded] = useState(false);
  
  // Track if we're at the top of the feed for smart refreshing
  const [isAtTop, setIsAtTop] = useState(true);
  const initialLoadRef = useRef(true);
  
  // DISABLED: Auto-refresh on mount to prevent infinite loops
  const mountedRef = useRef(false);
  
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      console.log('📱 Feed mounted - loading optimized data');
      loadInitialData();
    }
  }, []);

  // OPTIMIZED: Load data using the new get_entries_with_user_states function
  const loadFeedEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const offset = (requestedPage - 1) * PAGE_SIZE;
      
      console.log(`📡 Loading feed entries (page ${requestedPage}) with optimized single query...`);
      
      // Use the optimized database function that gets entries with user states in a single query
      const database = DatabaseFactory.getInstance();
      const entriesWithUserStates = await database.getFeedEntries?.({
        targetUserId: currentUser?.id,
        offset,
        limit: PAGE_SIZE,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      if (!entriesWithUserStates) {
        console.warn('⚠️ getFeedEntries not available, falling back to empty array');
        setHasMore(false);
        return;
      }
      
      // Convert StreamEntryWithUserStates to Post format
      const convertedPosts = entriesWithUserStates.map(entry => 
        streamEntryWithUserStatesToPost(entry)
      );

      if (append) {
        setPosts(prev => [...prev, ...convertedPosts]);
      } else {
        setPosts(convertedPosts);
      }

      // Check if there are more entries to load
      setHasMore(convertedPosts.length === PAGE_SIZE);
      
      // Mark user states as loaded since they're included in the query
      setIsUserStatesLoaded(true);
      
      console.log(`✅ OPTIMIZED: Loaded ${convertedPosts.length} feed entries with user states in single query`);
      
    } catch (error) {
      console.error('❌ Error loading optimized feed entries:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert StreamEntryWithUserStates to Post format
  const streamEntryWithUserStatesToPost = (entry: StreamEntryWithUserStates): Post => {
    const basePost = streamEntryToPost(entry);
    
    // Add user interaction states from the database query
    return {
      ...basePost,
      interactions: {
        resonances: entry.resonance_count || 0,
        branches: entry.branch_count || 0,
        amplifications: entry.amplification_count || 0,
        shares: entry.share_count || 0
      },
      // Store user interaction states for use by PostList
      userInteractionStates: {
        hasResonated: entry.has_resonated || false,
        hasAmplified: entry.has_amplified || false
      }
    };
  };

  // Initial data load
  const loadInitialData = async () => {
    await loadFeedEntries(1, false);
  };

  // Track scroll position to determine if user is at top
  const handleScroll = React.useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    setIsAtTop(scrollTop < 100); // Consider "top" if within 100px of top
  }, []);

  // Attach scroll listener to detect position
  useEffect(() => {
    const scrollContainer = document.querySelector('.parallax-layer-3');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    await loadFeedEntries(nextPage, true);
    setPage(nextPage);
    setIsAtTop(false); // User is definitely not at top after loading more
  };

  // Manual refresh function for explicit user action
  const handleManualRefresh = async () => {
    if (isLoading) return; // Prevent concurrent refreshes
    console.log('🔄 Manual refresh requested');
    setPage(1);
    setIsAtTop(true);
    await loadFeedEntries(1, false);
    
    // OPTIMIZED: No longer call parent's refreshFeedData - we handle data loading internally
    // refreshFeedData?.();
  };

  // Simplified branch refresh - reload data after branch creation
  const feedBranchRefresh = async () => {
    console.log('✅ Branch created - refreshing feed');
    await loadFeedEntries(1, false);
    setPage(1);
  };

  const handleBranch = React.useMemo(() => {
    return createBranch ? makeBranchHandler(createBranch, feedBranchRefresh) : undefined;
  }, [createBranch]);

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  // Optimized user interaction state checks - use the data from the database query
  const hasUserResonated = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasResonated || false;
  }, [posts]);

  const hasUserAmplified = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasAmplified || false;
  }, [posts]);

  // Following social media playbook - don't render posts until user interaction states are loaded
  if (!isUserStatesLoaded) {
    return (
      <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-text-tertiary text-sm">Loading feed with user interaction states...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Feed Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Nexus Feed</h1>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{posts.length} entries</span>
            {isLoading && <span className="ml-2">↻ Updating...</span>}
            {!isAtTop && (
              <button
                onClick={handleManualRefresh}
                className="ml-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Refresh to see new posts"
              >
                ↻ New posts available
              </button>
            )}
          </div>
        </div>

        {/* Feed Stream - Now using optimized data */}
        <PostList
          posts={posts}
          context="feed"
          displayMode="preview"
          showInteractions={true}
          showBranching={true}
          enablePagination={true}
          pageSize={PAGE_SIZE}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          onPostClick={onPostClick}
          onUserClick={onUserClick}
          onBranch={handleBranch}
          onResonate={onResonate}
          onAmplify={onAmplify}
          onShare={onShare}
          onDeepDive={handleDeepDive}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
        />
      </div>
    </main>
  );
}