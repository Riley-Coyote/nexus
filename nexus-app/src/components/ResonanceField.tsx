'use client';

import React from 'react';
import StreamEntry, { StreamEntryData } from './StreamEntry';

interface ResonanceFieldProps {
  resonatedEntries: StreamEntryData[];
  onPostClick?: (post: StreamEntryData) => void;
}

export default function ResonanceField({ 
  resonatedEntries, 
  onPostClick 
}: ResonanceFieldProps) {

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Entries List */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {resonatedEntries.length > 0 ? (
            resonatedEntries.map((entry) => (
              <StreamEntry
                key={entry.id}
                entry={entry}
                isDream={entry.resonance !== undefined}
                onPostClick={onPostClick}
                isPreview={false}
              />
            ))
          ) : (
            <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
              <div className="text-text-quaternary text-4xl mb-4">◇</div>
              <h3 className="text-text-secondary font-light mb-2">No resonated entries yet</h3>
              <p className="text-text-tertiary text-sm">
                Entries you resonate with will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 