'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import NexusFeed from '@/components/NexusFeed';
import UserProfile from '@/components/UserProfile';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import PostOverlay from '@/components/PostOverlay';
import { Post, StreamEntry } from '@/lib/types';
import { postToStreamEntry } from '@/lib/utils/postUtils';
import { dataService } from '@/lib/services/dataService';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { resonateWithEntry, amplifyEntry, createBranch } = useUserInteractions(user?.id);
  
  // Local state for UI
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Handle navigation
  const handleViewChange = (view: string) => {
    if (view === 'feed') {
      // Already on feed, do nothing
    } else if (view === 'resonance-field') {
      router.push('/resonance-field');
    } else if (view === 'profile' && user) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    router.push(`/${mode}`);
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogout = () => {
    // Logout handled by AuthContext
    setIsProfileModalOpen(false);
    router.push('/');
  };

  const handleViewProfile = () => {
    setIsProfileModalOpen(false);
    if (user) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleOpenPost = (post: Post | StreamEntry) => {
    const streamEntry: StreamEntry = 'children' in post && 'actions' in post ?
      post as StreamEntry :
      postToStreamEntry(post as Post);
    setOverlayPost(streamEntry);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setTimeout(() => setOverlayPost(null), 400);
  };

  const handlePostClick = (post: any) => {
    handleOpenPost(post);
  };

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  const handleShare = (postId: string) => {
    // Implement share functionality
    console.log('Share post:', postId);
  };

  // Fallback implementations for PostOverlay (optional)
  const getDirectChildren = async (postId: string) => {
    try {
      return await dataService.getDirectChildren(postId);
    } catch (error) {
      console.error('Failed to get direct children:', error);
      return [];
    }
  };

  const getParentPost = async (postId: string) => {
    try {
      return await dataService.getParentPost(postId);
    } catch (error) {
      console.error('Failed to get parent post:', error);
      return null;
    }
  };

  // Render main application UI
  return (
    <div className="liminal-logbook">
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode="logbook"
          currentView="feed"
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          currentUser={user}
          onProfileClick={handleProfileClick}
        />
        
        {/* Main Feed Content */}
        <div className="grid overflow-hidden" style={{ gridTemplateColumns: '1fr' }}>
          <NexusFeed
            onPostClick={handlePostClick}
            onUserClick={handleUserClick}
            createBranch={createBranch}
            onResonate={resonateWithEntry}
            onAmplify={amplifyEntry}
            onShare={handleShare}
            onDeepDive={handleDeepDive}
          />
        </div>
      </div>

      {/* User Profile Modal */}
      {user && (
        <UserProfile
          user={user}
          onLogout={handleLogout}
          onViewProfile={handleViewProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {overlayPost && (
        <PostOverlay 
          post={overlayPost}
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          getDirectChildren={getDirectChildren}
          getParentPost={getParentPost}
          onChildClick={handleOpenPost}
        />
      )}
    </div>
  );
} 