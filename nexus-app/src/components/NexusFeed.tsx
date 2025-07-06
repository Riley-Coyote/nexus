'use client';

import React, { useState, useEffect, useRef } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';
import { makeBranchHandler } from '@/lib/utils/interactionHandlers';

interface NexusFeedProps {
  logbookEntries: any[]; // Legacy StreamEntryData format
  dreamEntries: any[]; // Legacy StreamEntryData format
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
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
  }) => Promise<any[]>;
  createBranch?: (parentId: string, content: string) => Promise<void>;
  refreshLogbookData?: () => Promise<void>;
  refreshDreamData?: () => Promise<void>;
  ensureFeedDataLoaded?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  onShare?: (entryId: string) => void;
  onDeepDive?: (username: string, postId: string) => void;
  hasUserResonated?: (entryId: string) => boolean;
  hasUserAmplified?: (entryId: string) => boolean;
}

export default function NexusFeed({ 
  logbookEntries, 
  dreamEntries, 
  onPostClick,
  onUserClick,
  getPosts,
  createBranch,
  refreshLogbookData,
  refreshDreamData,
  ensureFeedDataLoaded,
  onResonate,
  onAmplify,
  onShare,
  onDeepDive,
  hasUserResonated,
  hasUserAmplified
}: NexusFeedProps) {
  const [flattenedEntries, setFlattenedEntries] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [hasMore, setHasMore] = useState(true);
  
  // Track if we're at the top of the feed for smart refreshing
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastDataHash, setLastDataHash] = useState<string>('');
  const initialLoadRef = useRef(true);
  
  // NEW: Auto-refresh feed data when component first loads with empty data
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (logbookEntries.length === 0 && dreamEntries.length === 0) {
        console.log('📡 Feed mounted with empty data - triggering refresh...');
        // Use the dedicated feed data loader
        ensureFeedDataLoaded?.();
      }
    }
  }, [logbookEntries.length, dreamEntries.length, ensureFeedDataLoaded]);

  // OPTIMIZATION: Use pre-loaded data instead of making separate API calls
  const loadFlattenedEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      // Combine and sort pre-loaded entries instead of making new API calls
      const combinedEntries = [...logbookEntries, ...dreamEntries];
      const sortedEntries = combinedEntries.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Apply pagination
      const startIndex = (requestedPage - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const paginatedEntries = sortedEntries.slice(startIndex, endIndex);
      
      // Convert to Post format
      const convertedPosts = paginatedEntries.map(entry => streamEntryDataToPost(entry));

      if (append) {
        setFlattenedEntries(prev => [...prev, ...convertedPosts]);
      } else {
        setFlattenedEntries(convertedPosts);
      }

      // Check if there are more entries to load
      setHasMore(endIndex < sortedEntries.length);
    } catch (error) {
      console.error('Error processing entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart refresh: Only reset pagination if user is at top OR it's initial load
  useEffect(() => {
    // Create a simple hash of the data to detect actual changes
    const dataHash = `${logbookEntries.length}-${dreamEntries.length}-${
      logbookEntries[0]?.id || ''
    }-${dreamEntries[0]?.id || ''}`;
    
    // Initial load - always load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      setLastDataHash(dataHash);
      setPage(1);
      loadFlattenedEntries(1, false);
      return;
    }
    
    // Skip if data hasn't actually changed
    if (dataHash === lastDataHash) {
      return;
    }
    
    setLastDataHash(dataHash);
    
    // Smart refresh: Only reset if at top of feed
    if (isAtTop) {
      console.log('🔄 Smart refresh: Resetting pagination (user at top)');
      setPage(1);
      loadFlattenedEntries(1, false);
    } else {
      console.log('📍 Smart refresh: Preserving pagination (user scrolled down)');
      // Optional: Show a "New posts available" banner instead
    }
  }, [logbookEntries, dreamEntries, isAtTop]);

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
    await loadFlattenedEntries(nextPage, true);
    setPage(nextPage);
    setIsAtTop(false); // User is definitely not at top after loading more
  };

  // Manual refresh function for explicit user action
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh requested');
    setPage(1);
    setIsAtTop(true);
    await loadFlattenedEntries(1, false);
  };

  // Smart refresh logic extracted for makeBranchHandler
  const feedBranchRefresh = async () => {
    if (!createBranch) return;
    // FIXED: Use the parent's refresh mechanism to ensure data consistency
    try {
      // The parent's createBranch method now handles the refresh properly
      // We just need to reload the flattened entries to show the new branch
      await loadFlattenedEntries();
      console.log('✅ Feed refreshed after branch creation');
    } catch (err) {
      console.warn('Background feed data refresh failed:', err);
    }
  };

  const handleBranch = React.useMemo(() => {
    return createBranch ? makeBranchHandler(createBranch, feedBranchRefresh) : undefined;
  }, [createBranch, flattenedEntries]);

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  return (
    <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Feed Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Nexus Feed</h1>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{flattenedEntries.length} entries</span>
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

        {/* Feed Stream - Now using unified PostList */}
        <PostList
          posts={flattenedEntries}
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