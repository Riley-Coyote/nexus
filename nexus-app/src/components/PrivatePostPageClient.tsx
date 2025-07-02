"use client";

import React from 'react';
import { Post } from '@/lib/types';
import PostDetailClient from '@/components/PostDetailClient';
import Header from '@/components/Header';
import AuthPanel from '@/components/AuthPanel';
import { useNexusData } from '@/hooks/useNexusData';

interface PrivatePostPageClientProps {
  post: Post;
  parent: Post | null;
  childPosts: Post[];
  isDeepDive?: boolean;
}

export default function PrivatePostPageClient({ post, parent, childPosts, isDeepDive = false }: PrivatePostPageClientProps) {
  const nexusData = useNexusData();
  const currentUser = nexusData.currentUser;
  const isOwner = currentUser?.id === post.userId;

  // Custom header props for deep dive mode
  const getHeaderProps = () => {
    if (isDeepDive) {
      return {
        currentMode: "logbook" as const,
        currentView: "deep-dive" as const,
        currentUser,
        customTitle: "DEEP DIVE",
        customStatus: `Exploring Thread: ${post.username}`,
        hideNavigation: false
      };
    }
    return {
      currentMode: "logbook" as const,
      currentView: "feed" as const,
      currentUser
    };
  };

  // Show authentication panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={() => nexusData.forceAuthRefresh()} />;
  }

  // Show loading state while auth is initializing
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
        <Header {...getHeaderProps()} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </main>
      </div>
    );
  }

  // Check if post is private and user doesn't have access
  if (post.privacy === 'private' && !isOwner) {
    return (
      <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
        <Header {...getHeaderProps()} />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full text-center p-6 bg-white/10 rounded-lg">
            <h2 className="text-xl text-text-primary mb-2">This post is private</h2>
            <p className="text-text-secondary">You do not have permission to view this post.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
      <Header {...getHeaderProps()} />
      <main className="flex-1 flex flex-col items-center justify-start pt-8 px-4 sm:px-0">
        <div className="max-w-2xl w-full">
          <PostDetailClient post={post} parent={parent} childPosts={childPosts} />
        </div>
      </main>
    </div>
  );
} 