'use client';

import React, { useState, useEffect } from 'react';
import StreamEntry, { StreamEntryData } from './StreamEntry';

interface NexusFeedProps {
  logbookEntries: StreamEntryData[];
  dreamEntries: StreamEntryData[];
  onPostClick?: (post: StreamEntryData) => void;
  onUserClick?: (username: string) => void;
  getFlattenedStreamEntries: () => Promise<StreamEntryData[]>;
  createBranch?: (parentId: string, content: string) => Promise<void>;
  refreshLogbookData?: () => Promise<void>;
  refreshDreamData?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  hasUserResonated?: (entryId: string) => boolean;
  hasUserAmplified?: (entryId: string) => boolean;
}

export default function NexusFeed({ 
  logbookEntries, 
  dreamEntries, 
  onPostClick,
  onUserClick,
  getFlattenedStreamEntries,
  createBranch,
  refreshLogbookData,
  refreshDreamData,
  onResonate,
  onAmplify,
  hasUserResonated,
  hasUserAmplified
}: NexusFeedProps) {
  const [flattenedEntries, setFlattenedEntries] = useState<StreamEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Load flattened entries - OPTIMIZED
  const loadFlattenedEntries = async () => {
    setIsLoading(true);
    try {
      // Use the optimized method from the hook that tries cached data first
      const entries = await getFlattenedStreamEntries();
      setFlattenedEntries(entries);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Error loading flattened entries:', error);
      // Fallback to combining the threaded data we already have
      const allEntries = [...logbookEntries, ...dreamEntries].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setFlattenedEntries(allEntries);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh when underlying data changes
  useEffect(() => {
    // If we have no flattened entries or the underlying data is newer, refresh
    if (flattenedEntries.length === 0 || 
        logbookEntries.length > 0 || 
        dreamEntries.length > 0) {
      loadFlattenedEntries();
    }
  }, [logbookEntries, dreamEntries, getFlattenedStreamEntries]);

  // Handle branch creation with smart refresh
  const handleBranch = async (parentId: string, content: string) => {
    if (!createBranch) return;
    
    try {
      await createBranch(parentId, content);
      
      // Smart refresh: Find the parent entry to determine type
      const parentEntry = flattenedEntries.find(e => e.id === parentId);
      if (parentEntry) {
        const isDreamEntry = parentEntry.resonance !== undefined;
        
        if (isDreamEntry && refreshDreamData) {
          await refreshDreamData();
        } else if (!isDreamEntry && refreshLogbookData) {
          await refreshLogbookData();
        }
      }
      
      // Refresh the flattened entries to show the new branch
      await loadFlattenedEntries();
    } catch (error) {
      console.error('Error creating branch in feed:', error);
    }
  };

  const isDreamEntry = (entry: StreamEntryData) => entry.resonance !== undefined;

  if (isLoading && flattenedEntries.length === 0) {
    return (
      <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
        <div className="max-w-4xl mx-auto w-full">
          <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
            <div className="text-text-quaternary text-lg mb-2">◊</div>
            <h3 className="text-text-secondary font-light mb-2">Loading feed...</h3>
            <p className="text-text-tertiary text-sm">
              Gathering entries from the nexus
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Feed Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Nexus Feed</h1>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{flattenedEntries.length} entries</span>
            {isLoading && <span className="ml-2">↻ Updating...</span>}
          </div>
        </div>

        {/* Feed Stream */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {flattenedEntries.length > 0 ? (
            flattenedEntries.map((entry) => (
              <StreamEntry
                key={entry.id}
                entry={entry}
                isDream={isDreamEntry(entry)}
                onPostClick={onPostClick}
                onUserClick={onUserClick}
                onBranch={handleBranch}
                onResonate={onResonate}
                onAmplify={onAmplify}
                userHasResonated={hasUserResonated?.(entry.id) || false}
                userHasAmplified={hasUserAmplified?.(entry.id) || false}
                isPreview={false}
                onClose={() => {
                  // For feed, we can't really "close" a post, so we'll let the component handle it internally
                  console.log(`Mobile close requested for post ${entry.id}`);
                }}
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
        {flattenedEntries.length > 0 && (
          <div className="mt-6 sm:mt-8 text-center">
            <button 
              className="interactive-btn px-4 sm:px-6 py-2 sm:py-3 text-sm font-light text-text-secondary hover:text-text-primary transition-colors border border-white/10 rounded-lg hover:border-white/20"
              onClick={loadFlattenedEntries}
            >
              Refresh Feed
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 