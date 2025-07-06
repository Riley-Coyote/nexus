'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import PostList from './PostList';
import { EntryComposerData, StreamEntry, Post } from '@/lib/types';
import { streamEntryToPost } from '@/lib/utils/postUtils';

interface MainContentProps {
  entryComposer: EntryComposerData;
  stream: StreamEntry[];
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => Promise<void>;
  onResonate?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onAmplify?: (id: string) => Promise<void>;
  onShare?: (id: string) => void;
  onDeepDive?: (username: string, postId: string) => void;
  onPostClick?: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  hasUserResonated?: (entryId: string) => boolean;
  hasUserAmplified?: (entryId: string) => boolean;
}

export default function MainContent({ 
  entryComposer, 
  stream, 
  onSubmitEntry,
  onResonate,
  onBranch,
  onAmplify,
  onShare,
  onDeepDive,
  onPostClick,
  onUserClick,
  hasUserResonated,
  hasUserAmplified
}: MainContentProps) {

  const handleSubmitEntry = async (content: string, type: string, isPublic: boolean) => {
    await onSubmitEntry?.(content, type, isPublic);
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  const handlePostClick = (post: Post) => {
    // Find the original StreamEntry for compatibility
    const originalEntry = stream.find(entry => entry.id === post.id);
    if (originalEntry) {
      onPostClick?.(originalEntry);
    }
  };

  // Convert stream entries to Post format
  const posts = stream.map(streamEntry => streamEntryToPost(streamEntry));

  return (
    <main className="mode-logbook flex-1 h-full pt-8 pb-24 px-4 sm:px-8 md:px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Entry Composer */}
      <EntryComposer 
        data={entryComposer}
        onSubmit={handleSubmitEntry}
      />
      
      {/* Stream - Now using unified PostList */}
      <div id="logbook-stream">
        <PostList
          posts={posts}
          context="logbook"
          displayMode="full"
          showInteractions={true}
          showBranching={true}
          enablePagination={false}
          onResonate={onResonate}
          onBranch={onBranch}
          onAmplify={onAmplify}
          onShare={onShare}
          onDeepDive={handleDeepDive}
          onPostClick={handlePostClick}
          onUserClick={onUserClick}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
        />
      </div>
    </main>
  );
} 