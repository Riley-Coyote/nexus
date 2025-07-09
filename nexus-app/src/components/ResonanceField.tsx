import React, { useEffect, useState, useCallback } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { StreamEntryWithUserStates } from '@/lib/database/types';
import { DatabaseFactory } from '@/lib/database/factory';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * ResonanceField v4 – follows exact NexusFeed optimized pattern for consistency and performance.
 * Uses direct database access with get_entries_with_user_states SQL function.
 * Loads user interaction states in single query for optimal performance.
 */
interface ResonanceFieldProps {
  onPostClick?: (post: Post) => void;
  onResonate?: (id: string) => Promise<void>;
  onAmplify?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onShare?: (id: string) => void;
  onDeepDive?: (post: Post) => void;
}

const PAGE_SIZE = 20;

export default function ResonanceField({
  onPostClick,
  onResonate,
  onAmplify,
  onBranch,
  onShare,
  onDeepDive
}: ResonanceFieldProps) {
  const { user, isAuthenticated } = useAuth();
  
  // Local state management (same pattern as NexusFeed)
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

  // OPTIMIZED: Load resonated entries using the new get_entries_with_user_states function
  const loadResonatedEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      // AuthProvider already ensures user is authenticated - no need to check here
      // Just proceed with loading data, passing user?.id to the database
      const offset = (requestedPage - 1) * PAGE_SIZE;
      
      console.log(`📡 Loading resonated entries (page ${requestedPage}) with optimized single query...`);
      
      // Use the optimized database function that gets entries with user states in a single query
      const database = DatabaseFactory.getInstance();
      
      // Handle edge case where user might be undefined
      if (!user?.id) {
        console.warn('⚠️ No user ID available, showing empty resonance field');
        setHasMore(false);
        setIsUserStatesLoaded(true);
        return;
      }
      
      const entriesWithUserStates = await database.getResonanceFieldEntries?.(user.id, {
        offset,
        limit: PAGE_SIZE,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      if (!entriesWithUserStates) {
        console.warn('⚠️ getResonanceFieldEntries not available, showing empty resonance field');
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
      
      console.log(`✅ OPTIMIZED: Loaded ${convertedPosts.length} resonated entries with user states in single query`);
      
    } catch (error) {
      console.error('❌ Error loading optimized resonated entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load resonated entries');
      setHasMore(false);
      setIsUserStatesLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadResonatedEntries(1, false);
  }, []);

  // Proper auth state management - reload when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // User just became authenticated - reload resonance field data
      if (posts.length === 0 && !isLoading) {
        console.log('🔄 Auth completed, reloading resonance field data');
        loadResonatedEntries(1, false);
      }
    }
  }, [isAuthenticated, user, posts.length, isLoading]);

  // Load more entries for pagination
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    await loadResonatedEntries(nextPage, true);
    setPage(nextPage);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isLoading) return;
    console.log('🔄 Manual refresh requested for resonance field');
    setPage(1);
    await loadResonatedEntries(1, false);
  };

  // Simplified branch refresh - reload data after branch creation
  const resonanceFieldBranchRefresh = async () => {
    console.log('✅ Branch created - refreshing resonance field');
    await loadResonatedEntries(1, false);
    setPage(1);
  };

  const handleBranch = React.useMemo(() => {
    return onBranch ? async (parentId: string, content: string) => {
      await onBranch(parentId, content);
      await resonanceFieldBranchRefresh();
    } : undefined;
  }, [onBranch]);

  // Optimized user interaction state checks - use the data from the database query
  const hasUserResonated = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasResonated || false;
  }, [posts]);

  const hasUserAmplified = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasAmplified || false;
  }, [posts]);

  // Enhanced interaction handlers that refresh data
  const handleResonate = React.useCallback(async (entryId: string) => {
    if (onResonate) {
      await onResonate(entryId);
      // Refresh the resonance field since resonating/unresonating changes what should be shown
      await loadResonatedEntries(1, false);
      setPage(1);
    }
  }, [onResonate]);

  const handleAmplify = React.useCallback(async (entryId: string) => {
    if (onAmplify) {
      await onAmplify(entryId);
      // No need to refresh since amplification doesn't change what's in the resonance field
    }
  }, [onAmplify]);

  // Following social media playbook - don't render posts until user interaction states are loaded
  if (!isUserStatesLoaded) {
    return (
      <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-text-tertiary text-sm">Loading resonance field with user interaction states...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Content Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Resonance Field Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Resonance Field</h1>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{posts.length} resonated entries</span>
            {isLoading && <span className="ml-2">↻ Loading...</span>}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Resonance Field Stream */}
        <PostList
          posts={posts}
          context="resonance"
          displayMode="preview"
          showInteractions={true}
          showBranching={true}
          enablePagination={true}
          pageSize={PAGE_SIZE}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          onPostClick={onPostClick}
          onResonate={handleResonate}
          onAmplify={handleAmplify}
          onBranch={handleBranch}
          onShare={onShare}
          onDeepDive={onDeepDive}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
        />
      </div>
    </main>
  );
} 