'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PostDisplay from './PostDisplay';
import { Post } from '@/lib/types';
import { getPostContext, getDisplayMode } from '@/lib/utils/postUtils';

export interface PostListProps {
  // Data
  posts: Post[];
  
  // Display configuration
  context: 'feed' | 'logbook' | 'dream' | 'profile' | 'resonance';
  displayMode?: 'preview' | 'full' | 'compact';
  showInteractions?: boolean;
  showBranching?: boolean;
  
  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
  
  // Filters (for future use)
  filters?: {
    type?: string;
    privacy?: 'public' | 'private';
    dateRange?: { start: Date; end: Date };
  };
  
  // Interaction callbacks
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onResonate?: (postId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onAmplify?: (postId: string) => Promise<void>;
  onShare?: (postId: string) => void;
  onDeepDive?: (post: Post) => void;
  
  // Interaction state providers
  hasUserResonated?: (postId: string) => boolean;
  hasUserAmplified?: (postId: string) => boolean;
  
  // Branching state (lifted up from PostDisplay)
  branchingPostId?: string | null;
  branchError?: { postId: string, message: string } | null;
  
  // UI customization
  emptyStateMessage?: string;
  emptyStateIcon?: string;
  className?: string;
}

export default function PostList({
  posts,
  context,
  displayMode = 'preview',
  showInteractions = true,
  showBranching = true,
  enablePagination = false,
  pageSize = 20,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  filters,
  onPostClick,
  onUserClick,
  onResonate,
  onBranch,
  onAmplify,
  onShare,
  onDeepDive,
  hasUserResonated,
  hasUserAmplified,
  emptyStateMessage,
  emptyStateIcon,
  className = '',
  branchingPostId,
  branchError
}: PostListProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Apply filters if provided
  const filteredPosts = React.useMemo(() => {
    if (!filters) return posts;
    
    return posts.filter(post => {
      // Type filter
      if (filters.type && post.type !== filters.type) return false;
      
      // Privacy filter
      if (filters.privacy && post.privacy !== filters.privacy) return false;
      
      // Date range filter
      if (filters.dateRange) {
        const postDate = new Date(post.timestamp);
        if (postDate < filters.dateRange.start || postDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }, [posts, filters]);

  // Handle load more with loading state
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !onLoadMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, onLoadMore, hasMore]);

  // Auto-determine display mode based on context if not specified
  const getEffectiveDisplayMode = (post: Post) => {
    if (displayMode !== 'preview') return displayMode;
    
    // Use utility function to determine optimal display mode
    return getDisplayMode(context, post.content.length, !!post.parentId);
  };

  // Empty state
  if (filteredPosts.length === 0 && !isLoading) {
    const defaultMessage = context === 'resonance' 
      ? 'No resonated entries yet'
      : context === 'profile'
      ? 'No posts found'
      : 'No entries available';
    
    const defaultIcon = context === 'resonance' ? '◇' : '∅';
    
    return (
      <div className={`post-list-empty ${className}`}>
        <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
          <div className="text-text-quaternary text-4xl mb-4">
            {emptyStateIcon || defaultIcon}
          </div>
          <h3 className="text-text-secondary font-light mb-2">
            {emptyStateMessage || defaultMessage}
          </h3>
          <p className="text-text-tertiary text-sm">
            {context === 'resonance' 
              ? 'Entries you resonate with will appear here'
              : context === 'feed'
              ? 'No entries available in the feed'
              : 'Create your first entry to get started'
            }
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && filteredPosts.length === 0) {
    return (
      <div className={`post-list-loading ${className}`}>
        <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
          <div className="text-text-quaternary text-lg mb-2">◊</div>
          <h3 className="text-text-secondary font-light mb-2">Loading...</h3>
          <p className="text-text-tertiary text-sm">
            Gathering entries from the nexus
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`post-list ${className}`}>
      {/* Posts */}
      <div className="flex flex-col gap-4 sm:gap-6">
        {filteredPosts.map((post) => {
          const postContext = getPostContext(post);
          const effectiveDisplayMode = getEffectiveDisplayMode(post);
          
          return (
            <PostDisplay
              key={post.id}
              post={post}
              context={postContext}
              displayMode={effectiveDisplayMode}
              showInteractions={showInteractions}
              showBranching={showBranching}
              onPostClick={onPostClick}
              onUserClick={onUserClick}
              onResonate={onResonate}
              onBranch={onBranch}
              onAmplify={onAmplify}
              onShare={onShare}
              onDeepDive={onDeepDive}
              userHasResonated={hasUserResonated?.(post.id) || false}
              userHasAmplified={hasUserAmplified?.(post.id) || false}
              isSubmittingBranch={post.id === branchingPostId}
              branchError={branchError && post.id === branchError.postId ? branchError.message : null}
              onClose={() => {
                console.log(`Mobile close requested for post ${post.id}`);
              }}
            />
          );
        })}
      </div>

      {/* Pagination Controls */}
      {enablePagination && filteredPosts.length > 0 && (
        <div className="mt-6 sm:mt-8 text-center">
          {hasMore && (
            <button 
              className="interactive-btn px-4 sm:px-6 py-2 sm:py-3 text-sm font-light text-text-secondary hover:text-text-primary transition-colors border border-white/10 rounded-lg hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLoadMore}
              disabled={isLoadingMore || isLoading}
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
          
          {!hasMore && filteredPosts.length >= pageSize && (
            <p className="text-text-quaternary text-sm">
              You've reached the end
            </p>
          )}
        </div>
      )}

      {/* Loading indicator for append operations */}
      {isLoadingMore && (
        <div className="mt-4 text-center">
          <div className="text-text-quaternary text-sm">Loading more entries...</div>
        </div>
      )}
    </div>
  );
} 