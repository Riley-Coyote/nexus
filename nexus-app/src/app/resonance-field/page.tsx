'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ResonanceField from '@/components/ResonanceField';
import PostOverlay from '@/components/PostOverlay';
import UserProfile from '@/components/UserProfile';
import { Post, StreamEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { postToStreamEntry } from '@/lib/utils/postUtils';
import { dataService } from '@/lib/services/dataService';

export default function ResonanceFieldPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { resonateWithEntry, amplifyEntry, createBranch } = useUserInteractions();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Determine mode from the pathname
  const isDreamPath = pathname.startsWith('/dream');
  const modeClass = isDreamPath ? 'mode-dream' : 'mode-logbook';
  const currentMode: 'logbook' | 'dream' = isDreamPath ? 'dream' : 'logbook';

  const handleOpenPost = (post: Post | StreamEntry) => {
    // Convert Post to StreamEntry if needed
    const streamEntry: StreamEntry = 'children' in post && 'actions' in post && 'threads' in post ? 
      post as StreamEntry : 
      postToStreamEntry(post as Post);
    
    setOverlayPost(streamEntry);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setTimeout(() => setOverlayPost(null), 400);
  };

  const handlePostInteraction = async (action: string, postId: string) => {
    try {
      if (action === 'Resonate ◊' || action === 'resonate') {
        await resonateWithEntry(postId);
      } else if (action === 'Amplify ≋' || action === 'amplify') {
        await amplifyEntry(postId);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const handleShare = (postId: string) => {
    // The share functionality is now handled natively in the PostDisplay component
    // We just need to provide this callback for compatibility
  };

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    router.push(`/${mode}`);
  };

  const handleNavigateToFeed = () => {
    router.push('/');
  };

  const handleNavigateToProfile = () => {
    if (user) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    setIsProfileModalOpen(false);
    router.push('/');
  };

  const handleViewProfile = () => {
    setIsProfileModalOpen(false);
    if (user) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  // Fallback implementations for PostOverlay
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

  return (
    <div className={`liminal-logbook ${modeClass}`}>
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode={currentMode}
          currentView="resonance-field"
          onModeChange={handleModeChange}
          onViewChange={(view) => {
            if (view === 'feed') handleNavigateToFeed();
            else if (view === 'profile') handleNavigateToProfile();
          }}
          currentUser={user}
          onProfileClick={handleProfileClick}
        />
        
        {/* Resonance Field Content - Now using optimized direct loading */}
        <div className="grid overflow-hidden grid-cols-1">
          <ResonanceField
            onPostClick={handleOpenPost}
            onResonate={resonateWithEntry}
            onAmplify={amplifyEntry}
            onBranch={createBranch}
            onShare={handleShare}
            onDeepDive={(post) => handleDeepDive(post.username, post.id)}
          />
        </div>
      </div>
      
      {/* Post Overlay */}
      <PostOverlay 
        post={overlayPost}
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        onInteraction={handlePostInteraction}
        getDirectChildren={getDirectChildren}
        getParentPost={getParentPost}
        onChildClick={handleOpenPost}
      />

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
    </div>
  );
} 