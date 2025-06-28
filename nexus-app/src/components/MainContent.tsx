'use client';

import React from 'react';
import EntryComposer from './EntryComposer';
import StreamEntry from './StreamEntry';
import { EntryComposerData, StreamEntry as StreamEntryType } from '@/lib/types';

interface MainContentProps {
  entryComposer: EntryComposerData;
  stream: StreamEntryType[];
  onSubmitEntry?: (content: string, type: string, isPublic: boolean) => void;
  onResonate?: (id: string) => void;
  onBranch?: (id: string) => void;
  onAmplify?: (id: string) => void;
  onShare?: (id: string) => void;
  onPostClick?: (post: StreamEntryType) => void;
}

export default function MainContent({ 
  entryComposer, 
  stream, 
  onSubmitEntry,
  onResonate,
  onBranch,
  onAmplify,
  onShare,
  onPostClick
}: MainContentProps) {
  const handleSubmitEntry = (content: string, type: string, isPublic: boolean) => {
    console.log('New entry submitted:', { content, type, isPublic });
    onSubmitEntry?.(content, type, isPublic);
  };

  const handleResonate = (id: string) => {
    console.log('Resonated with entry:', id);
    onResonate?.(id);
  };

  const handleBranch = (id: string) => {
    console.log('Branched entry:', id);
    onBranch?.(id);
  };

  const handleAmplify = (id: string) => {
    console.log('Amplified entry:', id);
    onAmplify?.(id);
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
        {stream.map((entry) => (
          <StreamEntry
            key={entry.id}
            entry={entry}
            onResonate={handleResonate}
            onBranch={handleBranch}
            onAmplify={handleAmplify}
            onShare={handleShare}
            onPostClick={onPostClick}
          />
        ))}
      </div>
    </main>
  );
} 