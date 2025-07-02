'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Post } from '@/lib/types';
import PostDisplay from '@/components/PostDisplay';
import { dataService } from '@/lib/services/dataService';

interface PostDetailClientProps {
  post: Post;
  parent: Post | null;
  childPosts: Post[];
}

export default function PostDetailClient({ post, parent, childPosts }: PostDetailClientProps) {
  const router = useRouter();

  const handleDeepDive = (targetPost: Post) => {
    // Navigate to the entry detail page for the target post
    router.push(`/${targetPost.username}/entry/${targetPost.id}`);
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
              showBranching={false}
              showInteractions={false}
              onDeepDive={handleDeepDive}
            />
          </div>
        </div>
      )}

      {/* Current Post */}
      <div className="thread-level current-level">
        <div className="thread-connector">
          <div className="thread-line current-line"></div>
          <div className="thread-node current-node">●</div>
        </div>
        <div className="thread-content">
          <PostDisplay
            post={post}
            context="feed"
            displayMode="full"
            showBranching={true}
            showInteractions={true}
            onResonate={async (postId) => { await dataService.resonateWithEntry(postId); }}
            onBranch={async (parentId, content) => { await dataService.createBranch(parentId, content); }}
            onAmplify={async (postId) => { await dataService.amplifyEntry(postId); }}
            onShare={(postId) => console.log(`Share interaction on post ${postId}`)}
            onDeepDive={handleDeepDive}
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
              onResonate={async (postId) => { await dataService.resonateWithEntry(postId); }}
              onBranch={async (parentId, content) => { await dataService.createBranch(parentId, content); }}
              onAmplify={async (postId) => { await dataService.amplifyEntry(postId); }}
              onShare={(postId) => console.log(`Share interaction on post ${postId}`)}
              onDeepDive={handleDeepDive}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 