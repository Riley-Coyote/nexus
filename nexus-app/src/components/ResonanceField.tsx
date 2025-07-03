'use client';

import React, { useEffect, useState } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';

interface ResonanceFieldProps {
  resonatedEntries: any[]; // Legacy StreamEntryData format
  onPostClick?: (post: Post) => void;
  refreshResonatedEntries?: () => Promise<void>;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  hasUserAmplified?: (entryId: string) => boolean;
  refreshAmplifiedEntries?: () => Promise<void>;
  onShare?: (entryId: string) => void;
  onDeepDive?: (post: Post) => void;
}

export default function ResonanceField({ 
  resonatedEntries, 
  onPostClick,
  refreshResonatedEntries,
  onResonate,
  onAmplify,
  onBranch,
  hasUserAmplified,
  refreshAmplifiedEntries,
  onShare,
  onDeepDive
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

  const handleAmplify = async (entryId: string) => {
    if (!onAmplify) return;
    
    try {
      await onAmplify(entryId);
      // Refresh the amplified entries after successful amplify action
      if (refreshAmplifiedEntries) {
        await refreshAmplifiedEntries();
      }
    } catch (error) {
      console.error('Error handling amplify in ResonanceField:', error);
    }
  };

  const handleBranch = async (parentId: string, content: string) => {
    if (!onBranch) return;
    try {
      await onBranch(parentId, content);
      // After creating a branch we don't necessarily need to refresh resonance data
    } catch (error) {
      console.error('Error handling branch in ResonanceField:', error);
    }
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post);
  };

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...convertedEntries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Custom hasUserResonated function - always true in resonance field
  const hasUserResonated = (entryId: string) => true;

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

        {/* Resonated Entries Stream - Now using unified PostList */}
        <PostList
          posts={sortedEntries}
          context="resonance"
          displayMode="full"
          showInteractions={true}
          showBranching={true}
          enablePagination={false}
          onPostClick={onPostClick}
          onResonate={handleResonate}
          onBranch={handleBranch}
          onAmplify={handleAmplify}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
          onShare={onShare}
          onDeepDive={handleDeepDive}
          emptyStateIcon="◇"
          emptyStateMessage="No resonated entries yet"
        />

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