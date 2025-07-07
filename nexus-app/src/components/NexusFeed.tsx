'use client';

import React, { useState, useEffect, useRef } from 'react';
import PostList from './PostList';
import { Post, StreamEntry } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { makeBranchHandler } from '@/lib/utils/interactionHandlers';

interface NexusFeedProps {
  logbookEntries: StreamEntry[]; // UPDATED: Now expects StreamEntry[] directly
  dreamEntries: StreamEntry[];   // UPDATED: Now expects StreamEntry[] directly
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
  refreshFeedData?: () => Promise<void>;
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
  refreshFeedData,
  onResonate,
  onAmplify,
  onShare,
  onDeepDive,
  hasUserResonated,
  hasUserAmplified,
  isUserStatesLoaded
}: NexusFeedProps & { isUserStatesLoaded?: boolean }) {
  const [flattenedEntries, setFlattenedEntries] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [hasMore, setHasMore] = useState(true);
  
  // Track if we're at the top of the feed for smart refreshing
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastDataHash, setLastDataHash] = useState<string>('');
  const initialLoadRef = useRef(true);
  
  // DISABLED: Auto-refresh on mount to prevent infinite loops
  const mountedRef = useRef(false);
  
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // Auto-refresh disabled to prevent infinite loops
      console.log('📱 Feed mounted - auto-refresh disabled');
    }
  }, []);

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
      const convertedPosts = paginatedEntries.map(entry => streamEntryToPost(entry));

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

  // SIMPLIFIED: Process entries when props change, no smart refresh
  useEffect(() => {
    // Only process if we have data
    if (logbookEntries.length > 0 || dreamEntries.length > 0) {
      loadFlattenedEntries(1, false);
    }
  }, [logbookEntries.length, dreamEntries.length]); // Simple dependency on data lengths

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
    if (isLoading) return; // Prevent concurrent refreshes
    console.log('🔄 Manual refresh requested');
    setPage(1);
    setIsAtTop(true);
    await loadFlattenedEntries(1, false);
  };

  // Simplified branch refresh - parent handles data refresh, props update triggers UI refresh
  const feedBranchRefresh = async () => {
    // No-op: The parent's createBranch method handles data refresh
    // When logbookEntries/dreamEntries props update, the effect below will 
    // automatically call loadFlattenedEntries() to show the new branch
    console.log('✅ Branch created - feed will update when props refresh');
  };

  const handleBranch = React.useMemo(() => {
    return createBranch ? makeBranchHandler(createBranch, feedBranchRefresh) : undefined;
  }, [createBranch, flattenedEntries]);

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  // Following social media playbook - don't render posts until user interaction states are loaded
  if (isUserStatesLoaded === false) {
    return (
      <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-text-tertiary text-sm">Loading interaction states...</p>
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