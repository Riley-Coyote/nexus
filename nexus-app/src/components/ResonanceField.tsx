'use client';

import React, { useEffect, useState } from 'react';
import PostDisplay from './PostDisplay';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';

interface ResonanceFieldProps {
  resonatedEntries: any[]; // Legacy StreamEntryData format
  onPostClick?: (post: Post) => void;
  refreshResonatedEntries?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
}

export default function ResonanceField({ 
  resonatedEntries, 
  onPostClick,
  refreshResonatedEntries,
  onResonate
}: ResonanceFieldProps) {
  const [convertedEntries, setConvertedEntries] = useState<Post[]>([]);

  // Convert legacy entries to Post format
  useEffect(() => {
    const posts = resonatedEntries.map(entry => streamEntryDataToPost(entry));
    setConvertedEntries(posts);
  }, [resonatedEntries]);

  const handleResonate = async (entryId: string) => {
    if (!onResonate) return;
    
    try {
      await onResonate(entryId);
      // Refresh the resonated entries after successful resonance action
      if (refreshResonatedEntries) {
        await refreshResonatedEntries();
      }
    } catch (error) {
      console.error('Error handling resonance in ResonanceField:', error);
    }
  };

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...convertedEntries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-light text-text-primary mb-2">Resonance Field</h1>
            <p className="text-sm text-text-tertiary">
              Entries that have resonated with your consciousness
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{sortedEntries.length} resonated entries</span>
          </div>
        </div>

        {/* Resonated Entries Stream */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {sortedEntries.length > 0 ? (
            sortedEntries.map((post) => (
              <PostDisplay
                key={post.id}
                post={post}
                context="resonance"
                displayMode="full"
                onPostClick={onPostClick}
                onResonate={handleResonate}
                userHasResonated={true} // Always true in resonance field
                showBranching={false} // Disable branching in resonance field
                onClose={() => {
                  console.log(`Mobile close requested for resonated post ${post.id}`);
                }}
              />
            ))
          ) : (
            <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
              <div className="text-text-quaternary text-4xl mb-4">◇</div>
              <h3 className="text-text-secondary font-light mb-2">No resonated entries yet</h3>
              <p className="text-text-tertiary text-sm mb-4">
                Entries you resonate with will appear here
              </p>
              <p className="text-text-quaternary text-xs">
                Visit the feed, logbook, or dreams to start resonating with content
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {sortedEntries.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
            <button 
              onClick={refreshResonatedEntries}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors border border-white/10 rounded-lg hover:border-white/20"
            >
              Refresh Resonance Field
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 