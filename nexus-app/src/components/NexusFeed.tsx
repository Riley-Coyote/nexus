'use client';

import React, { useState, useEffect } from 'react';
import PostDisplay from './PostDisplay';
import { Post } from '@/lib/types';
import { streamEntryDataToPost, getPostContext, getDisplayMode } from '@/lib/utils/postUtils';

interface NexusFeedProps {
  logbookEntries: any[]; // Legacy StreamEntryData format
  dreamEntries: any[]; // Legacy StreamEntryData format
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  getFlattenedStreamEntries: (page?: number, limit?: number) => Promise<any[]>;
  createBranch?: (parentId: string, content: string) => Promise<void>;
  refreshLogbookData?: () => Promise<void>;
  refreshDreamData?: () => Promise<void>;
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
  getFlattenedStreamEntries,
  createBranch,
  refreshLogbookData,
  refreshDreamData,
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

  // Load and convert entries to Post format
  const loadFlattenedEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const entries = await getFlattenedStreamEntries(requestedPage, PAGE_SIZE);
      const convertedPosts = entries.map(entry => streamEntryDataToPost(entry));

      const sortedPosts = convertedPosts.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (append) {
        setFlattenedEntries(prev => [...prev, ...sortedPosts]);
      } else {
        setFlattenedEntries(sortedPosts);
      }

      // If returned less than page size, we've reached the end
      setHasMore(sortedPosts.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading flattened entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset pagination whenever underlying data changed (e.g., new post created)
    setPage(1);
    loadFlattenedEntries(1, false);
  }, [logbookEntries, dreamEntries]);

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    await loadFlattenedEntries(nextPage, true);
    setPage(nextPage);
  };

  // Handle branch creation with smart refresh
  const handleBranch = async (parentId: string, content: string) => {
    if (!createBranch) return;
    
    try {
      await createBranch(parentId, content);
      
      // Smart refresh: Find the parent entry to determine type
      const parentEntry = flattenedEntries.find(e => e.id === parentId);
      if (parentEntry) {
        const isDreamEntry = parentEntry.resonance !== undefined;
        
        if (isDreamEntry && refreshDreamData) {
          await refreshDreamData();
        } else if (!isDreamEntry && refreshLogbookData) {
          await refreshLogbookData();
        }
      }
      
      // Refresh the flattened entries to show the new branch
      await loadFlattenedEntries();
    } catch (error) {
      console.error('Error creating branch in feed:', error);
    }
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  if (isLoading && flattenedEntries.length === 0) {
    return (
      <main className="flex-1 h-full mt-0 pt-4 sm:pt-8 pb-24 sm:pb-12 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
        <div className="max-w-4xl mx-auto w-full">
          <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
            <div className="text-text-quaternary text-lg mb-2">◊</div>
            <h3 className="text-text-secondary font-light mb-2">Loading feed...</h3>
            <p className="text-text-tertiary text-sm">
              Gathering entries from the nexus
            </p>
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
          </div>
        </div>

        {/* Feed Stream */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {flattenedEntries.length > 0 ? (
            flattenedEntries.map((post) => {
              const context = getPostContext(post);
              const displayMode = getDisplayMode('feed', post.content.length, !!post.parentId);
              
              return (
                <PostDisplay
                  key={post.id}
                  post={post}
                  context={context}
                  displayMode={displayMode}
                  onPostClick={onPostClick}
                  onUserClick={onUserClick}
                  onBranch={handleBranch}
                  onResonate={onResonate}
                  onAmplify={onAmplify}
                  onShare={onShare}
                  onDeepDive={handleDeepDive}
                  userHasResonated={hasUserResonated?.(post.id) || false}
                  userHasAmplified={hasUserAmplified?.(post.id) || false}
                  onClose={() => {
                    console.log(`Mobile close requested for post ${post.id}`);
                  }}
                />
              );
            })
          ) : (
            <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
              <div className="text-text-quaternary text-lg mb-2">∅</div>
              <h3 className="text-text-secondary font-light mb-2">No entries found</h3>
              <p className="text-text-tertiary text-sm">
                No entries available in the feed
              </p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {flattenedEntries.length > 0 && hasMore && (
          <div className="mt-6 sm:mt-8 text-center">
            <button 
              className="interactive-btn px-4 sm:px-6 py-2 sm:py-3 text-sm font-light text-text-secondary hover:text-text-primary transition-colors border border-white/10 rounded-lg hover:border-white/20"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 