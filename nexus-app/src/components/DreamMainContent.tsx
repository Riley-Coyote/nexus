'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import PostList from './PostList';
import { EntryComposerData, StreamEntry, Post } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';

interface DreamMainContentProps {
  dreamComposer: EntryComposerData;
  sharedDreams: StreamEntry[];
  onPostClick?: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  onShare?: (entryId: string) => void;
  onDeepDive?: (username: string, postId: string) => void;
  hasUserResonated?: (entryId: string) => boolean;
  hasUserAmplified?: (entryId: string) => boolean;
}

export default function DreamMainContent({ 
  dreamComposer, 
  sharedDreams,
  onPostClick,
  onUserClick,
  onSubmitEntry,
  onBranch,
  onResonate,
  onAmplify,
  onShare,
  onDeepDive,
  hasUserResonated,
  hasUserAmplified
}: DreamMainContentProps) {

  const handleDreamSubmit = async (content: string, type: string, isPublic: boolean) => {
    await onSubmitEntry?.(content, type, isPublic);
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  const handlePostClick = (post: Post) => {
    // Find the original StreamEntry for compatibility
    const originalEntry = sharedDreams.find(entry => entry.id === post.id);
    if (originalEntry) {
      onPostClick?.(originalEntry);
    }
  };

  // Sort dreams by timestamp (newest first) and convert to Post format
  const sortedDreams = [...sharedDreams]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map(streamEntry => streamEntryToPost(streamEntry));

  return (
    <main className="mode-dream flex-1 h-full pt-8 pb-24 px-4 sm:px-8 md:px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Dream Composer */}
      <EntryComposer 
        data={dreamComposer}
        onSubmit={handleDreamSubmit}
      />
      
      {/* Shared Dreams Stream - Now using unified PostList */}
      <div className="flex flex-col gap-6">
        <h2 className="text-text-secondary text-sm font-light tracking-wide">SHARED DREAMS</h2>
        <PostList
          posts={sortedDreams}
          context="dream"
          displayMode="full"
          showInteractions={true}
          showBranching={true}
          enablePagination={false}
          onPostClick={handlePostClick}
          onUserClick={onUserClick}
          onBranch={onBranch}
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