'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import PostDisplay from './PostDisplay';
import { EntryComposerData, StreamEntry, Post } from '@/lib/types';
import { streamEntryToPost, getPostContext, getDisplayMode } from '@/lib/utils/postUtils';

interface MainContentProps {
  entryComposer: EntryComposerData;
  stream: StreamEntry[];
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => void;
  onResonate?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => void;
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

  const handleSubmitEntry = (content: string, type: string, isPublic: boolean) => {
    onSubmitEntry?.(content, type, isPublic);
  };

  const handleResonate = async (id: string) => {
    if (onResonate) {
      await onResonate(id);
    }
  };

  const handleBranch = async (parentId: string, content: string) => {
    if (onBranch) {
      await onBranch(parentId, content);
    }
  };

  const handleAmplify = async (id: string) => {
    if (onAmplify) {
      await onAmplify(id);
    }
  };

  const handleShare = (id: string) => {
    onShare?.(id);
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  return (
    <main className="mode-logbook flex-1 h-full pt-8 pb-24 px-4 sm:px-8 md:px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Entry Composer */}
      <EntryComposer 
        data={entryComposer}
        onSubmit={handleSubmitEntry}
      />
      
      {/* Stream */}
      <div id="logbook-stream" className="flex flex-col gap-6">
        {stream.map((streamEntry) => {
          // Convert StreamEntry to Post format
          const post = streamEntryToPost(streamEntry);
          const context = getPostContext(post);
          const displayMode = getDisplayMode('logbook', post.content.length, !!post.parentId);
          
          return (
            <PostDisplay
              key={post.id}
              post={post}
              context={context}
              displayMode={displayMode}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              onDeepDive={handleDeepDive}
              onPostClick={() => onPostClick?.(streamEntry)} // Pass original StreamEntry for compatibility
              onUserClick={onUserClick}
              userHasResonated={hasUserResonated?.(post.id) || false}
              userHasAmplified={hasUserAmplified?.(post.id) || false}
            />
          );
        })}
      </div>
    </main>
  );
} 