import React, { useEffect, useState, useCallback } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';

/**
 * ResonanceField v2 – a thin wrapper that re-uses the exact same
 * pagination / PostList flow as NexusFeed.  The only difference is
 * the data source (mode:"resonated") and small header copy.
 */
interface ResonanceFieldProps {
  /** First page of resonated entries – already converted to StreamEntryData */
  initialEntries: any[];
  getPosts: (opts: { mode: 'resonated'; page?: number; limit?: number }) => Promise<any[]>;
  onPostClick?: (post: Post) => void;
  onResonate?: (id: string) => Promise<void>;
  onAmplify?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  hasUserResonated?: (id: string) => boolean; // should always be true but kept for symmetry
  hasUserAmplified?: (id: string) => boolean;
  onShare?: (id: string) => void;
  onDeepDive?: (post: Post) => void;
}

const PAGE_SIZE = 20;

export default function ResonanceField({
  initialEntries,
  getPosts,
  onPostClick,
  onResonate,
  onAmplify,
  onBranch,
  hasUserResonated,
  hasUserAmplified,
  onShare,
  onDeepDive
}: ResonanceFieldProps) {
  const [posts, setPosts] = useState<Post[]>(() => initialEntries.map(streamEntryDataToPost));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialEntries.length === PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  // Sync when initialEntries prop updates (e.g., after async fetch)
  useEffect(() => {
    const firstPage = initialEntries.map(streamEntryDataToPost);
    setPosts(firstPage);
    setPage(1);
    setHasMore(firstPage.length === PAGE_SIZE);
  }, [initialEntries]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const newEntries = await getPosts({ mode: 'resonated', page: nextPage, limit: PAGE_SIZE });
      const newPosts = newEntries.map(streamEntryDataToPost);
      setPosts(prev => [...prev, ...newPosts]);
      setPage(nextPage);
      setHasMore(newPosts.length === PAGE_SIZE);
    } catch (err) {
      console.error('ResonanceField: failed to load more', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [getPosts, hasMore, isLoading, page]);

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