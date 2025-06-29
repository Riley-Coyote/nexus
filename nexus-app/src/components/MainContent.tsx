'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import StreamEntry from './StreamEntry';
import { EntryComposerData, StreamEntry as StreamEntryType } from '@/lib/types';
import { StreamEntryData } from './StreamEntry';

interface MainContentProps {
  entryComposer: EntryComposerData;
  stream: StreamEntryType[];
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => void;
  onResonate?: (id: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => void;
  onAmplify?: (id: string) => Promise<void>;
  onShare?: (id: string) => void;
  onPostClick?: (post: StreamEntryType) => void;
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
  onPostClick,
  onUserClick,
  hasUserResonated,
  hasUserAmplified
}: MainContentProps) {
  const handleSubmitEntry = (content: string, type: string, isPublic: boolean) => {
    console.log('New entry submitted:', { content, type, isPublic });
    onSubmitEntry?.(content, type, isPublic);
  };

  const handleResonate = async (id: string) => {
    console.log('Resonated with entry:', id);
    if (onResonate) {
      await onResonate(id);
    }
  };

  const handleBranch = (parentId: string, content: string) => {
    console.log('Branched entry:', parentId, 'with content:', content);
    onBranch?.(parentId, content);
  };

  const handleAmplify = async (id: string) => {
    console.log('Amplified entry:', id);
    if (onAmplify) {
      await onAmplify(id);
    }
  };

  const handleShare = (id: string) => {
    console.log('Shared entry:', id);
    onShare?.(id);
  };

  return (
    <main className="py-8 px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Entry Composer */}
      <EntryComposer 
        data={entryComposer}
        onSubmit={handleSubmitEntry}
      />
      
      {/* Stream */}
      <div id="logbook-stream" className="flex flex-col gap-6">
        {stream.map((entry) => {
          // Convert StreamEntry to StreamEntryData for the component
          const entryData: StreamEntryData = {
            id: entry.id,
            parentId: entry.parentId,
            depth: entry.depth,
            type: entry.type,
            agent: entry.agent,
            connections: entry.connections,
            metrics: entry.metrics,
            timestamp: entry.timestamp,
            content: entry.content,
            interactions: entry.interactions,
            isAmplified: entry.isAmplified,
            privacy: entry.privacy,
            title: entry.title,
            resonance: entry.resonance,
            coherence: entry.coherence,
            tags: entry.tags,
            response: entry.response,
          };
          
          return (
            <StreamEntry
              key={entry.id}
              entry={entryData}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              onPostClick={() => onPostClick?.(entry)} // Pass original StreamEntry
              onUserClick={onUserClick}
              userHasResonated={hasUserResonated?.(entry.id) || false}
              userHasAmplified={hasUserAmplified?.(entry.id) || false}
            />
          );
        })}
      </div>
    </main>
  );
} 