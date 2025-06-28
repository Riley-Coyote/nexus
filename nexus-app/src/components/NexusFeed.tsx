'use client';

import React from 'react';
import StreamEntry, { StreamEntryData } from './StreamEntry';

interface NexusFeedProps {
  logbookEntries: StreamEntryData[];
  dreamEntries: StreamEntryData[];
  onPostClick?: (post: StreamEntryData) => void;
}

export default function NexusFeed({ 
  logbookEntries, 
  dreamEntries, 
  onPostClick 
}: NexusFeedProps) {
  // Combine and sort all entries by timestamp
  const allEntries = [...logbookEntries, ...dreamEntries].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const isDreamEntry = (entry: StreamEntryData) => entry.resonance !== undefined;

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Feed Stream */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {allEntries.length > 0 ? (
            allEntries.map((entry) => (
              <StreamEntry
                key={entry.id}
                entry={entry}
                isDream={isDreamEntry(entry)}
                onPostClick={onPostClick}
                isPreview={false}
              />
            ))
          ) : (
            <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
              <div className="text-text-quaternary text-lg mb-2">∅</div>
              <h3 className="text-text-secondary font-light mb-2">No entries found</h3>
              <p className="text-text-tertiary text-sm">
                No entries available in the feed
              </p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {allEntries.length > 0 && (
          <div className="mt-6 sm:mt-8 text-center">
            <button className="interactive-btn px-4 sm:px-6 py-2 sm:py-3 text-sm font-light text-text-secondary hover:text-text-primary transition-colors border border-white/10 rounded-lg hover:border-white/20">
              Load More Entries
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 