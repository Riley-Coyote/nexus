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
}

export default function DreamMainContent({ 
  dreamComposer, 
  sharedDreams,
  onPostClick,
  onSubmitEntry
}: DreamMainContentProps) {
  const handleDreamSubmit = (content: string, type: string, isPublic: boolean) => {
    console.log('Dream submitted:', { content, type, isPublic });
    onSubmitEntry?.(content, type, isPublic);
  };

  // Sort dreams by timestamp (newest first)
  const sortedDreams = [...sharedDreams].sort((a, b) => {
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
            />
          );
        })}
      </div>
    </main>
  );
} 