'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Post } from '@/lib/types';
import PostDisplay from '@/components/PostDisplay';
import { dataService } from '@/lib/services/dataService';
import { useNexusData } from '@/hooks/useNexusData';

interface PostDetailClientProps {
  post: Post;
  parent: Post | null;
  childPosts: Post[];
}

export default function PostDetailClient({ post, parent, childPosts }: PostDetailClientProps) {
  const router = useRouter();
  const [isInteracting, setIsInteracting] = useState(false);

  // Get global nexus data to determine existing user interactions
  const nexusData = useNexusData();

  // Debug logging - Client side
  console.log(`🎯 PostDetailClient Debug for ${post.id}:`);
  console.log(`📝 Main post: ${post.title || post.content.substring(0, 50)}...`);
  console.log(`👆 Parent: ${parent ? (parent.title || parent.content.substring(0, 50)) + '...' : 'None'}`);
  console.log(`👶 Children count received: ${childPosts.length}`);
  if (childPosts.length > 0) {
    console.log('📋 Children in component:', childPosts.map(child => ({
      id: child.id,
      parentId: child.parentId,
      content: child.content.substring(0, 30) + '...'
    })));
  }

  const handleDeepDive = (targetPost: Post) => {
    // Navigate to the entry detail page for the target post
    router.push(`/${targetPost.username}/entry/${targetPost.id}`);
  };

  const handleResonate = async (postId: string) => {
    setIsInteracting(true);
    try {
      await dataService.resonateWithEntry(postId);
      // Optionally refresh the page or update state
      router.refresh();
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
      // Refresh to show the new branch
      router.refresh();
    } catch (error) {
      console.error('Error creating branch:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleAmplify = async (postId: string) => {
    setIsInteracting(true);
    try {
      await dataService.amplifyEntry(postId);
      // Optionally refresh the page or update state
      router.refresh();
    } catch (error) {
      console.error('Error amplifying entry:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleShare = (postId: string) => {
    console.log(`Share interaction on post ${postId}`);
    // TODO: Implement proper sharing functionality
  };

  return (
    <div className="conversation-thread">
      {/* Parent Context */}
      {parent && (
        <div className="thread-level parent-level">
          <div className="thread-connector">
            <div className="thread-line parent-line"></div>
            <div className="thread-node parent-node">↗</div>
          </div>
          <div className="thread-content">
            <PostDisplay
              post={parent}
              context="feed"
              displayMode="compact"
              showBranching={true}
              showInteractions={true}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              userHasResonated={nexusData.hasUserResonated(parent.id)}
              userHasAmplified={nexusData.hasUserAmplified(parent.id)}
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
            post={post}
            context="feed"
            displayMode="full"
            showBranching={true}
            showInteractions={true}
            onResonate={handleResonate}
            onBranch={handleBranch}
            onAmplify={handleAmplify}
            onShare={handleShare}
            userHasResonated={nexusData.hasUserResonated(post.id)}
            userHasAmplified={nexusData.hasUserAmplified(post.id)}
            className="current-viewing-post"
          />
        </div>
      </div>

      {/* Children */}
      {childPosts.map((child, idx) => (
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
              userHasResonated={nexusData.hasUserResonated(child.id)}
              userHasAmplified={nexusData.hasUserAmplified(child.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 