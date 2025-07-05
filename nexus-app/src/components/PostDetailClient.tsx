'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Post, StreamEntry } from '@/lib/types';
import PostDisplay from '@/components/PostDisplay';
import { dataService } from '@/lib/services/dataService';
import { streamEntryToPost } from '@/lib/utils/postUtils';

interface PostDetailClientProps {
  post: Post;
  parent: Post | null;
  childPosts: Post[];
}

type EnrichedPost = Post & { userHasResonated: boolean; userHasAmplified: boolean };

export default function PostDetailClient({ post: initialPost, parent: initialParent, childPosts: initialChildPosts }: PostDetailClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  // Single source of truth - all data comes from one API call
  const [entryData, setEntryData] = useState<{
    current: EnrichedPost;
    parent: EnrichedPost | null;
    children: EnrichedPost[];
  }>({
    current: { ...initialPost, userHasResonated: false, userHasAmplified: false },
    parent: initialParent ? { ...initialParent, userHasResonated: false, userHasAmplified: false } : null,
    children: initialChildPosts.map(child => ({ ...child, userHasResonated: false, userHasAmplified: false }))
  });

  // Load fresh data with all interaction states
  const loadEntryDetails = async () => {
    setIsLoading(true);
    try {
      const details = await dataService.getEntryDetailsWithContext(initialPost.id);
      
      // Convert StreamEntry to Post format with interaction states
      const convertToEnrichedPost = (entry: StreamEntry & { userHasResonated: boolean; userHasAmplified: boolean }): EnrichedPost => ({
        ...streamEntryToPost(entry),
        userHasResonated: entry.userHasResonated,
        userHasAmplified: entry.userHasAmplified
      });

      setEntryData({
        current: convertToEnrichedPost(details.current),
        parent: details.parent ? convertToEnrichedPost(details.parent) : null,
        children: details.children.map(convertToEnrichedPost)
      });

      // console.log('✅ PostDetailClient: Loaded fresh entry details with interaction states');
    } catch (error) {
      console.error('❌ PostDetailClient: Failed to load entry details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load fresh data on mount
  useEffect(() => {
    loadEntryDetails();
  }, [initialPost.id]);

  const handleDeepDive = (targetPost: Post) => {
    router.push(`/${targetPost.username}/entry/${targetPost.id}`);
  };

  const handleResonate = async (postId: string) => {
    if (isInteracting) return;
    setIsInteracting(true);
    try {
      await dataService.resonateWithEntry(postId);
      // Reload fresh data to get updated counts and states
      await loadEntryDetails();
    } catch (error) {
      console.error('Error resonating with entry:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = async (parentId: string, content: string) => {
    setIsInteracting(true);
    try {
      await dataService.createBranch(parentId, content);
      // Reload fresh data to show the new branch
      await loadEntryDetails();
    } catch (error) {
      console.error('Error creating branch:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleAmplify = async (postId: string) => {
    if (isInteracting) return;
    setIsInteracting(true);
    try {
      await dataService.amplifyEntry(postId);
      // Reload fresh data to get updated counts and states
      await loadEntryDetails();
    } catch (error) {
      console.error('Error amplifying entry:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleShare = (postId: string) => {
    // console.log(`Share interaction on post ${postId}`);
  };

  if (isLoading) {
    return (
      <div className="conversation-thread">
        <div className="text-center py-8">
          <div className="text-text-secondary">Loading entry details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-thread">
      {/* Parent Context */}
      {entryData.parent && (
        <div className="thread-level parent-level">
          <div className="thread-connector">
            <div className="thread-line parent-line"></div>
            <div className="thread-node parent-node">↗</div>
          </div>
          <div className="thread-content">
            <PostDisplay
              post={entryData.parent}
              context="feed"
              displayMode="compact"
              showBranching={true}
              showInteractions={true}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              userHasResonated={entryData.parent.userHasResonated}
              userHasAmplified={entryData.parent.userHasAmplified}
              onDeepDive={handleDeepDive}
            />
          </div>
        </div>
      )}

      {/* Current Post - Being Viewed */}
      <div className="thread-level current-level viewing-post">
        <div className="thread-connector">
          <div className="thread-line current-line"></div>
          <div className="thread-node current-node">●</div>
        </div>
        <div className="viewing-indicator">
          <span className="viewing-label">Currently Viewing</span>
        </div>
        <div className="thread-content">
          <PostDisplay
            post={entryData.current}
            context="feed"
            displayMode="full"
            showBranching={true}
            showInteractions={true}
            onResonate={handleResonate}
            onBranch={handleBranch}
            onAmplify={handleAmplify}
            onShare={handleShare}
            userHasResonated={entryData.current.userHasResonated}
            userHasAmplified={entryData.current.userHasAmplified}
            className="current-viewing-post"
          />
        </div>
      </div>

      {/* Children */}
      {entryData.children.map((child, idx) => (
        <div key={child.id} className="thread-level child-level">
          <div className="thread-connector">
            <div className="thread-line child-line"></div>
            <div className="thread-node child-node">↳</div>
          </div>
          <div className="thread-content">
            <PostDisplay
              post={child}
              context="feed"
              displayMode="full"
              showBranching={true}
              showInteractions={true}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              onDeepDive={handleDeepDive}
              userHasResonated={child.userHasResonated}
              userHasAmplified={child.userHasAmplified}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 