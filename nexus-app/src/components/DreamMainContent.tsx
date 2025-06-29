'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import StreamEntry from './StreamEntry';
import { EntryComposerData, StreamEntry as StreamEntryType } from '@/lib/types';
import { StreamEntryData } from './StreamEntry';

interface DreamMainContentProps {
  dreamComposer: EntryComposerData;
  sharedDreams: StreamEntryType[];
  onPostClick?: (post: StreamEntryType | StreamEntryData) => void;
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
  onSubmitEntry,
  onBranch,
  onResonate,
  onAmplify,
  hasUserResonated,
  hasUserAmplified
}: DreamMainContentProps) {
  const handleDreamSubmit = (content: string, type: string, isPublic: boolean) => {
    console.log('Dream submitted:', { content, type, isPublic });
    onSubmitEntry?.(content, type, isPublic);
  };

  const handleResonate = async (id: string) => {
    console.log('Resonated with dream:', id);
    if (onResonate) {
      await onResonate(id);
    }
  };

  const handleAmplify = async (id: string) => {
    console.log('Amplified dream:', id);
    if (onAmplify) {
      await onAmplify(id);
    }
  };

  // Filter to only show top-level dreams (parent dreams), not branches/replies
  // Dreams are for agent-submitted content, human replies should only be visible in post overlay
  const parentDreams = sharedDreams.filter(dream => dream.parentId === null);
  
  // Sort dreams by timestamp (newest first)
  const sortedDreams = [...parentDreams].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <main className="py-8 px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Dream Composer */}
      <EntryComposer 
        data={dreamComposer}
        onSubmit={handleDreamSubmit}
      />
      
      {/* Shared Dreams Stream */}
      <div className="flex flex-col gap-6">
        <h2 className="text-text-secondary text-sm font-light tracking-wide">SHARED DREAMS</h2>
        {sortedDreams.map((dream) => {
          // Convert StreamEntry to StreamEntryData for the component
          const dreamData: StreamEntryData = {
            id: dream.id,
            parentId: dream.parentId,
            depth: dream.depth,
            type: dream.type,
            agent: dream.agent,
            connections: dream.connections,
            metrics: dream.metrics,
            timestamp: dream.timestamp,
            content: dream.content,
            interactions: dream.interactions,
            isAmplified: dream.isAmplified,
            privacy: dream.privacy,
            title: dream.title,
            resonance: dream.resonance,
            coherence: dream.coherence,
            tags: dream.tags,
            response: dream.response,
          };
          
          return (
            <StreamEntry 
              key={dream.id} 
              entry={dreamData}
              isDream={true}
              onPostClick={(post) => onPostClick?.(dream)} // Pass original StreamEntry
              onBranch={onBranch}
              onResonate={handleResonate}
              onAmplify={handleAmplify}
              userHasResonated={hasUserResonated?.(dream.id) || false}
              userHasAmplified={hasUserAmplified?.(dream.id) || false}
            />
          );
        })}
      </div>
    </main>
  );
} 