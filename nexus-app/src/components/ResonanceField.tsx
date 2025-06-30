'use client';

import React, { useEffect, useState } from 'react';
import StreamEntry, { StreamEntryData } from './StreamEntry';

interface ResonanceFieldProps {
  resonatedEntries: StreamEntryData[];
  onPostClick?: (post: StreamEntryData) => void;
  refreshResonatedEntries?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
}

export default function ResonanceField({ 
  resonatedEntries, 
  onPostClick,
  refreshResonatedEntries,
  onResonate
}: ResonanceFieldProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...resonatedEntries].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Manual refresh function
  const handleRefresh = async () => {
    if (!refreshResonatedEntries) return;
    
    setIsRefreshing(true);
    try {
      await refreshResonatedEntries();
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Error refreshing resonated entries:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle resonance interaction - let the parent handle refresh
  const handleResonate = async (entryId: string) => {
    if (!onResonate) return;
    
    console.log(`🔄 ResonanceField: Processing resonance for entry: ${entryId}`);
    
    try {
      await onResonate(entryId);
      console.log(`✅ ResonanceField: Resonance action completed for entry: ${entryId}`);
      
      // Note: Don't call refreshResonatedEntries here as onResonate already handles it
      // This prevents double refresh and race conditions
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('❌ ResonanceField: Error handling resonance:', error);
    }
  };

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-8 lg:px-10 flex flex-col gap-6 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
      {/* Centered Feed Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-light text-text-primary">Your Resonance Field</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-lg transition-all duration-200 ${
                isRefreshing 
                  ? 'bg-white/5 text-text-tertiary cursor-not-allowed' 
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10'
              }`}
            >
              {isRefreshing ? '↻ Refreshing...' : '↻ Refresh'}
            </button>
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-light bg-current-accent text-deep-void rounded-lg shadow-lg transition-all duration-200 hover:scale-105">
              Timeline
            </button>
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-light bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-lg transition-all duration-200">
              Gallery
            </button>
          </div>
        </div>

        {/* Stats Section */}
        {sortedEntries.length > 0 && (
          <div className="flex items-center gap-4 mb-6 text-xs text-text-tertiary">
            <span>{sortedEntries.length} resonated {sortedEntries.length === 1 ? 'entry' : 'entries'}</span>
            <span>•</span>
            <span>Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}</span>
          </div>
        )}

        {/* Entries List */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {sortedEntries.length > 0 ? (
            sortedEntries.map((entry) => (
              <StreamEntry
                key={entry.id}
                entry={entry}
                isDream={entry.resonance !== undefined}
                onPostClick={onPostClick}
                onResonate={handleResonate}
                isPreview={false}
                onClose={() => {
                  // For resonance field, we can't really "close" a post, so we'll let the component handle it internally
                  console.log(`Mobile close requested for resonated post ${entry.id}`);
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
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`interactive-btn px-4 sm:px-6 py-2 sm:py-3 text-sm font-light transition-colors border border-white/10 rounded-lg ${
                isRefreshing
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:border-white/20'
              }`}
            >
              {isRefreshing ? 'Refreshing Resonances...' : 'Refresh Resonances'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
} 