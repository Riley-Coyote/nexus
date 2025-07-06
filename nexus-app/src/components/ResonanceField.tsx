'use client';

import React, { useEffect, useState } from 'react';
import PostList from './PostList';
import { Post } from '@/lib/types';
import { streamEntryDataToPost } from '@/lib/utils/postUtils';
import { makeBranchHandler } from '@/lib/utils/interactionHandlers';

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
  const [branchingPostId, setBranchingPostId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<{ postId: string, message: string } | null>(null);

  // Convert legacy entries to Post format with stable memoization
  // This prevents unnecessary re-renders that would unmount PostDisplay components
  const convertedEntries = React.useMemo(() => {
    return resonatedEntries.map(entry => streamEntryDataToPost(entry));
  }, [resonatedEntries]);

  // OPTIMIZED: Granular interaction handlers that don't trigger full refreshes
  const handleResonate = async (entryId: string) => {
    if (!onResonate) return;
    
    try {
      console.log(`⚡ Processing resonance for post ${entryId} (no full refresh)`);
      await onResonate(entryId);
      
      // OPTIMIZATION: NO full refresh - PostDisplay handles local state updates
      // The PostDisplay component will show immediate UI changes via optimistic updates
      console.log(`✅ Resonance processed for post ${entryId} - UI updated locally`);
    } catch (error) {
      console.error('Error handling resonance in ResonanceField:', error);
      // CRITICAL: Re-throw the error so PostDisplay component gets the error signal
      throw error;
    }
  };

  const handleAmplify = async (entryId: string) => {
    if (!onAmplify) return;
    
    try {
      console.log(`⚡ Processing amplification for post ${entryId} (no full refresh)`);
      await onAmplify(entryId);
      
      // OPTIMIZATION: NO full refresh - PostDisplay handles local state updates  
      // The PostDisplay component will show immediate UI changes via optimistic updates
      console.log(`✅ Amplification processed for post ${entryId} - UI updated locally`);
    } catch (error) {
      console.error('Error handling amplify in ResonanceField:', error);
      // CRITICAL: Re-throw the error so PostDisplay component gets the error signal
      throw error;
    }
  };

  // Smart refresh logic for resonance field (like NexusFeed)
  const resonanceFieldBranchRefresh = async () => {
    if (!onBranch) return;
    
    try {
      // Refresh the parent data source
      if (refreshResonatedEntries) {
        await refreshResonatedEntries();
      }
      
      // Note: convertedEntries will automatically update via the useMemo 
      // when resonatedEntries prop changes, causing the component to re-render
      console.log('✅ ResonanceField branch refresh completed');
    } catch (error) {
      console.warn('Background resonance field refresh failed:', error);
    }
  };

  // The new branch handler that manages the loading/error state
  const handleBranchSubmit = async (parentId: string, content: string) => {
    // Ensure the main onBranch handler is provided
    if (!onBranch) return;

    // Set the loading state for the specific post
    setBranchingPostId(parentId);
    // Clear any previous errors
    setBranchError(null);

    try {
      // The onBranch prop now should contain the full logic, including
      // the API call and the data refresh. We no longer need makeBranchHandler here.
      await onBranch(parentId, content);
    } catch (error) {
      console.error('ResonanceField: Branch operation failed', error);
      // Set the error state for the specific post
      setBranchError({
        postId: parentId,
        message: error instanceof Error ? error.message : 'Failed to create branch.'
      });
      // Re-throwing allows the child component to know about the error if needed
      throw error;
    } finally {
      // CRITICAL: Always reset the loading state to un-stick the UI
      setBranchingPostId(null);
    }
  };

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post);
  };

  // Sort entries by timestamp (newest first) with memoization
  const sortedEntries = React.useMemo(() => {
    return [...convertedEntries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [convertedEntries]);

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
          onBranch={handleBranchSubmit}
          onAmplify={handleAmplify}
          hasUserResonated={hasUserResonated}
          hasUserAmplified={hasUserAmplified}
          onShare={onShare}
          onDeepDive={handleDeepDive}
          branchingPostId={branchingPostId}
          branchError={branchError}
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