'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  // Local copies for optimistic updates
  const [mainPost, setMainPost] = useState<Post>(post);
  const [parentPost, setParentPost] = useState<Post | null>(parent);
  const [childrenPosts, setChildrenPosts] = useState<Post[]>(childPosts);

  // Per-post interaction flags (resonated / amplified)
  const [flags, setFlags] = useState<Record<string, { hasResonated: boolean; hasAmplified: boolean }>>({});

  const nexusData = useNexusData();

  // Load interaction states for all posts being displayed
  const loadInteractionStates = useCallback(async () => {
    if (!nexusData.currentUser) return;
    
    const allPosts = [post, ...(parent ? [parent] : []), ...childPosts];
    const entryIds = allPosts.map(p => p.id);
    
    try {
      // Force load the user interaction states for these specific entries
      await Promise.all(entryIds.map(id => 
        dataService.getUserInteractionState(nexusData.currentUser!.id, id)
      ));
      
      console.log('✅ PostDetailClient: Loaded interaction states for entries:', entryIds);
    } catch (error) {
      console.error('❌ PostDetailClient: Failed to load interaction states:', error);
    }
  }, [post.id, parent?.id, childPosts.map(c => c.id).join(','), nexusData.currentUser?.id]);

  // Load interaction states when component mounts or entries change
  useEffect(() => {
    loadInteractionStates();
  }, [loadInteractionStates]);

  // Initialise flags on mount and when resonated/amplified entries change
  useEffect(() => {
    const updateFlags = async () => {
      // Ensure interaction states are loaded first
      await loadInteractionStates();
      
      const initial: Record<string, { hasResonated: boolean; hasAmplified: boolean }> = {};
      [post, ...(parent ? [parent] : []), ...childPosts].forEach(p => {
        const hasResonated = nexusData.hasUserResonated(p.id);
        const hasAmplified = nexusData.hasUserAmplified(p.id);
        
        console.log(`🔍 PostDetailClient flags for ${p.id}:`, {
          hasResonated,
          hasAmplified,
          resonatedEntriesCount: nexusData.resonatedEntries.length,
          amplifiedEntriesCount: nexusData.amplifiedEntries.length
        });
        
        initial[p.id] = {
          hasResonated,
          hasAmplified
        };
      });
      setFlags(initial);
      console.log('🎯 PostDetailClient final flags:', initial);
    };
    
    updateFlags();
  }, [post.id, parent?.id, childPosts.length, nexusData.resonatedEntries, nexusData.amplifiedEntries, nexusData.hasUserResonated, nexusData.hasUserAmplified, loadInteractionStates]);

  const mutatePost = (id: string, mutator: (p: Post) => Post) => {
    if (mainPost.id === id) setMainPost(mutator(mainPost));
    if (parentPost && parentPost.id === id) setParentPost(mutator(parentPost));
    setChildrenPosts(prev => prev.map(c => (c.id === id ? mutator(c) : c)));
  };

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
    if (isInteracting) return;
    setIsInteracting(true);
    try {
      const newState = await dataService.resonateWithEntry(postId);

      // optimistic count + flag
      mutatePost(postId, p => ({
        ...p,
        interactions: {
          ...p.interactions,
          resonances: p.interactions.resonances + (newState ? 1 : -1)
        }
      }));

      setFlags(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          hasResonated: newState
        }
      }));
    } catch (error) {
      console.error('Error resonating with entry:', error);
      router.refresh();
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
    if (isInteracting) return;
    setIsInteracting(true);
    try {
      const newState = await dataService.amplifyEntry(postId);

      mutatePost(postId, p => ({
        ...p,
        interactions: {
          ...p.interactions,
          amplifications: p.interactions.amplifications + (newState ? 1 : -1)
        }
      }));

      setFlags(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          hasAmplified: newState
        }
      }));
    } catch (error) {
      console.error('Error amplifying entry:', error);
      router.refresh();
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
      {parentPost && (
        <div className="thread-level parent-level">
          <div className="thread-connector">
            <div className="thread-line parent-line"></div>
            <div className="thread-node parent-node">↗</div>
          </div>
          <div className="thread-content">
            <PostDisplay
              post={parentPost}
              context="feed"
              displayMode="compact"
              showBranching={true}
              showInteractions={true}
              onResonate={handleResonate}
              onBranch={handleBranch}
              onAmplify={handleAmplify}
              onShare={handleShare}
              userHasResonated={flags[parentPost.id]?.hasResonated}
              userHasAmplified={flags[parentPost.id]?.hasAmplified}
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
            post={mainPost}
            context="feed"
            displayMode="full"
            showBranching={true}
            showInteractions={true}
            onResonate={handleResonate}
            onBranch={handleBranch}
            onAmplify={handleAmplify}
            onShare={handleShare}
            userHasResonated={flags[mainPost.id]?.hasResonated}
            userHasAmplified={flags[mainPost.id]?.hasAmplified}
            className="current-viewing-post"
          />
        </div>
      </div>

      {/* Children */}
      {childrenPosts.map((child, idx) => (
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
              userHasResonated={flags[child.id]?.hasResonated}
              userHasAmplified={flags[child.id]?.hasAmplified}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 