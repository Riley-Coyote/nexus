'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import PostDisplay from './PostDisplay';
import { EntryComposerData, StreamEntry } from '@/lib/types';
import { streamEntryToPost, getPostContext, getDisplayMode } from '@/lib/utils/postUtils';

interface DreamMainContentProps {
  dreamComposer: EntryComposerData;
  sharedDreams: StreamEntry[];
  onPostClick?: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => void;
  onBranch?: (parentId: string, content: string) => void;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
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
  hasUserResonated,
  hasUserAmplified
}: DreamMainContentProps) {

  const handleDreamSubmit = (content: string, type: string, isPublic: boolean) => {
    onSubmitEntry?.(content, type, isPublic);
  };

  const handleResonate = async (entryId: string) => {
    if (onResonate) {
      await onResonate(entryId);
    }
  };

  const handleAmplify = async (entryId: string) => {
    if (onAmplify) {
      await onAmplify(entryId);
    }
  };

  // Sort dreams by timestamp (newest first)
  const sortedDreams = [...sharedDreams].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <main className="mode-dream py-8 px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Dream Composer */}
      <EntryComposer 
        data={dreamComposer}
        onSubmit={handleDreamSubmit}
      />
      
      {/* Shared Dreams Stream */}
      <div className="flex flex-col gap-6">
        <h2 className="text-text-secondary text-sm font-light tracking-wide">SHARED DREAMS</h2>
        {sortedDreams.map((streamEntry) => {
          // Convert StreamEntry to Post format
          const post = streamEntryToPost(streamEntry);
          const context = 'dream'; // Always dream context for this component
          const displayMode = getDisplayMode('dream', post.content.length, !!post.parentId);
          
          return (
            <PostDisplay 
              key={post.id} 
              post={post}
              context={context}
              displayMode={displayMode}
              onPostClick={(post) => onPostClick?.(streamEntry)} // Pass original StreamEntry for compatibility
              onUserClick={onUserClick}
              onBranch={onBranch}
              onResonate={handleResonate}
              onAmplify={handleAmplify}
              userHasResonated={hasUserResonated?.(post.id) || false}
              userHasAmplified={hasUserAmplified?.(post.id) || false}
            />
          );
        })}
      </div>
    </main>
  );
} 