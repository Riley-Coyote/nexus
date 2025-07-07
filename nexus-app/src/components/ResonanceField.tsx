import React, { useEffect, useState, useCallback } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';

/**
 * ResonanceField v3 – follows exact NexusFeed pattern for consistency and scalability.
 * No local state management, uses central state and automatic user interaction loading.
 */
interface ResonanceFieldProps {
  /** Resonated entries from useNexusData - central state */
  initialEntries: any[];
  onPostClick?: (post: Post) => void;
  onResonate?: (id: string) => Promise<void>;
  onAmplify?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  hasUserResonated?: (id: string) => boolean;
  hasUserAmplified?: (id: string) => boolean;
  onShare?: (id: string) => void;
  onDeepDive?: (post: Post) => void;
  isUserStatesLoaded?: boolean; // Same as NexusFeed
  appendResonatedEntries?: (page: number, limit?: number) => Promise<any[]>; // Central state management
}

const PAGE_SIZE = 20;

export default function ResonanceField({
  initialEntries,
  onPostClick,
  onResonate,
  onAmplify,
  onBranch,
  hasUserResonated,
  hasUserAmplified,
  onShare,
  onDeepDive,
  isUserStatesLoaded,
  appendResonatedEntries
}: ResonanceFieldProps) {
  // SIMPLIFIED: Use central state directly, no local posts state
  const posts = initialEntries.map(streamEntryDataToPost);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialEntries.length >= PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  // Update hasMore when initialEntries changes (like NexusFeed)
  useEffect(() => {
    setHasMore(initialEntries.length >= PAGE_SIZE);
    // Reset page if entries were refreshed
    if (initialEntries.length <= PAGE_SIZE) {
      setPage(1);
    }
  }, [initialEntries.length]);

  // SIMPLIFIED: Just update central state, automatic user interaction loading
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !appendResonatedEntries) return;
    
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const newEntries = await appendResonatedEntries(nextPage, PAGE_SIZE);
      
      // Central state automatically triggers user interaction loading via useEffect
      console.log(`✅ ResonanceField: Appended ${newEntries.length} entries to central state`);
      
      setPage(nextPage);
      setHasMore(newEntries.length === PAGE_SIZE);
    } catch (err) {
      console.error('ResonanceField: failed to load more', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, page, appendResonatedEntries]);

  // Following NexusFeed pattern - don't render until user interaction states are loaded
  if (isUserStatesLoaded === false) {
    return (
      <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
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
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-light text-text-primary mb-2">Resonance Field</h1>
            <p className="text-sm text-text-tertiary">Entries that have resonated with your consciousness</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{posts.length} resonated entries</span>
          </div>
        </div>

        <PostList
          posts={posts}
          context="resonance"
          displayMode="full"
          showInteractions
          showBranching
          enablePagination
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={loadMore}
          onPostClick={onPostClick}
          onResonate={onResonate}
          onAmplify={onAmplify}
          onBranch={onBranch}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
          onShare={onShare}
          onDeepDive={onDeepDive}
          emptyStateIcon="◇"
          emptyStateMessage="No resonated entries yet"
        />
      </div>
    </main>
  );
} 