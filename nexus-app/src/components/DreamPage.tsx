'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PostList from './PostList';
import EntryComposer from './EntryComposer';
import { Post, EntryComposerData } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { StreamEntryWithUserStates } from '@/lib/database/types';
import { DatabaseFactory } from '@/lib/database/factory';
import { useAuth } from '@/lib/auth/AuthContext';
import { useInteractionHandlers } from '@/hooks/useInteractionHandlers';

/**
 * DreamPage - follows exact ResonanceField/NexusFeed optimized pattern for consistency and performance.
 * Uses direct database access with getDreamEntries SQL function.
 * Loads user interaction states in single query for optimal performance.
 * Now uses centralized interaction handlers - no duplicate logic!
 */
interface DreamPageProps {
  onPostClick?: (post: Post) => void;
  entryComposer?: EntryComposerData;
}

const PAGE_SIZE = 20;

export default function DreamPage({
  onPostClick,
  entryComposer
}: DreamPageProps) {
  const { user, isAuthenticated } = useAuth();
  
  // Use centralized interaction handlers - single source of truth!
  const {
    handleBranch,
    handleResonate,
    handleAmplify,
    handleShare,
    handleDeepDive,
    handleUserClick,
    handleSubmitEntry,
    hasUserResonated,
    hasUserAmplified
  } = useInteractionHandlers();
  // Local state management (same pattern as ResonanceField)
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isUserStatesLoaded, setIsUserStatesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // OPTIMIZED: Load dream entries using the new getDreamEntries function
  const loadDreamEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      // AuthProvider already ensures user is authenticated - no need to check here
      // Just proceed with loading data, passing user?.id to the database
      const offset = (requestedPage - 1) * PAGE_SIZE;
      
      console.log(`📡 Loading dream entries (page ${requestedPage}) with optimized single query...`);
      
      // Use the optimized database function that gets entries with user states in a single query
      const database = DatabaseFactory.getInstance();
      
      // Handle edge case where user might be undefined
      if (!user?.id) {
        console.warn('⚠️ No user ID available, showing empty dreams');
        setHasMore(false);
        setIsUserStatesLoaded(true);
        return;
      }
      
      const entriesWithUserStates = await database.getDreamEntries?.(user.id, {
        privacyFilter: null, // Show both public and private for own dreams
        targetUserId: user.id,
        offset,
        limit: PAGE_SIZE,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      if (!entriesWithUserStates) {
        console.warn('⚠️ getDreamEntries not available, showing empty dreams');
        setHasMore(false);
        setIsUserStatesLoaded(true);
        return;
      }
      
      // Convert StreamEntryWithUserStates to Post format
      const convertedPosts = entriesWithUserStates.map((entry: StreamEntryWithUserStates) => 
        streamEntryWithUserStatesToPost(entry)
      );
      
      if (append) {
        setPosts(prevPosts => [...prevPosts, ...convertedPosts]);
      } else {
        setPosts(convertedPosts);
      }
      
      setHasMore(convertedPosts.length === PAGE_SIZE);
      setPage(requestedPage);
      setIsUserStatesLoaded(true);
      
      console.log(`✅ OPTIMIZED: Loaded ${convertedPosts.length} dream entries with user states in single query`);
      
    } catch (error) {
      console.error('❌ Error loading optimized dream entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dream entries');
      setHasMore(false);
      setIsUserStatesLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadDreamEntries(1, false);
  }, []);

  // Proper auth state management - reload when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // User just became authenticated - reload dream data
      if (posts.length === 0 && !isLoading) {
        console.log('🔄 Auth completed, reloading dream data');
        loadDreamEntries(1, false);
      }
    }
  }, [isAuthenticated, user, posts.length, isLoading]);

  // Load more entries for pagination
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    await loadDreamEntries(nextPage, true);
    setPage(nextPage);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isLoading) return;
    console.log('🔄 Manual refresh requested for dreams');
    setPage(1);
    await loadDreamEntries(1, false);
  };

  // Enhanced branch refresh - reload data after branch creation
  const dreamBranchRefresh = async () => {
    console.log('✅ Branch created - refreshing dreams');
    await loadDreamEntries(1, false);
    setPage(1);
  };

  // Create enhanced handlers that include dream-specific refreshes
  const handleBranchWithRefresh = React.useCallback(async (parentId: string, content: string) => {
    await handleBranch(parentId, content);
    await dreamBranchRefresh();
  }, [handleBranch]);

  const handleResonateWithRefresh = React.useCallback(async (entryId: string) => {
    await handleResonate(entryId);
    // Refresh after resonance to get updated interaction counts
    await loadDreamEntries(1, false);
    setPage(1);
  }, [handleResonate]);

  const handleAmplifyWithRefresh = React.useCallback(async (entryId: string) => {
    await handleAmplify(entryId);
    // Refresh after amplification to get updated interaction counts
    await loadDreamEntries(1, false);
    setPage(1);
  }, [handleAmplify]);

  // Enhanced submit handler that refreshes data
  const handleSubmitEntryWithRefresh = React.useCallback(async (content: string, type: string, isPublic: boolean) => {
    await handleSubmitEntry(content, type, isPublic, 'dream');
    // Refresh after creating new entry
    await loadDreamEntries(1, false);
    setPage(1);
  }, [handleSubmitEntry]);

  // Optimized user interaction state checks - use the data from the database query
  const hasUserResonatedLocal = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasResonated || false;
  }, [posts]);

  const hasUserAmplifiedLocal = React.useCallback((entryId: string) => {
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
            <p className="text-text-tertiary text-sm">Loading dreams with user interaction states...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Content Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Entry Composer */}
        {entryComposer && (
          <EntryComposer 
            data={entryComposer}
            onSubmit={handleSubmitEntryWithRefresh}
          />
        )}

        {/* Dream Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Dreams</h1>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{posts.length} dreams</span>
            {isLoading && <span className="ml-2">↻ Loading...</span>}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Dreams Stream - Now using unified PostList */}
        <PostList
          posts={posts}
          context="dream"
          displayMode="full"
          showInteractions={true}
          showBranching={true}
          enablePagination={true}
          pageSize={PAGE_SIZE}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          onPostClick={onPostClick}
          onUserClick={handleUserClick}
          onResonate={handleResonateWithRefresh}
          onAmplify={handleAmplifyWithRefresh}
          onBranch={handleBranchWithRefresh}
          onShare={handleShare}
          onDeepDive={handleDeepDive}
          hasUserResonated={hasUserResonatedLocal}
          hasUserAmplified={hasUserAmplifiedLocal}
        />
      </div>
    </main>
  );
} 