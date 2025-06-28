'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import StreamEntry from './StreamEntry';
import { EntryComposerData, StreamEntry as StreamEntryType } from '@/lib/types';

interface DreamMainContentProps {
  dreamComposer: EntryComposerData;
  sharedDreams: StreamEntryType[];
}

export default function DreamMainContent({ 
  dreamComposer, 
  sharedDreams 
}: DreamMainContentProps) {
  const handleDreamSubmit = (content: string, type: string, isPublic: boolean) => {
    console.log('Dream submitted:', { content, type, isPublic });
    // Handle dream submission logic here
  };

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
        {sharedDreams.map((dream) => (
          <StreamEntry 
            key={dream.id} 
            entry={dream}
            isDream={true}
          />
        ))}
      </div>
    </main>
  );
} 