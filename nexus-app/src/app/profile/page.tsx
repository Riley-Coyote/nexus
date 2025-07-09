'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ProfileView from '@/components/ProfileView';
import PostOverlay from '@/components/PostOverlay';
import { Post, StreamEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { useProfile } from '@/hooks/useProfile';
import { postToStreamEntry } from '@/lib/utils/postUtils';
import { dataService } from '@/lib/services/dataService';

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { resonateWithEntry, amplifyEntry, createBranch } = useUserInteractions();
  const { updateUserProfile, getFollowers, getFollowing } = useProfile(user);
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Determine mode from the pathname
  const isDreamPath = pathname.startsWith('/dream');
  const modeClass = isDreamPath ? 'mode-dream' : 'mode-logbook';

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
    console.log(`Share interaction on post ${postId}`);
  };

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    router.push(`/${mode}`);
  };

  const handleNavigateToFeed = () => {
    router.push('/');
  };

  const handleNavigateToResonanceField = () => {
    router.push('/resonance-field');
  };

  const handleProfileClick = () => {
    // For own profile page, redirect to username-based profile
    if (user) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  const handleLogout = () => {
    signOut();
    router.push('/');
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

  // Auth is now handled by middleware - no need for early auth checks

  return (
    <div className={`liminal-logbook ${modeClass}`}>
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode={isDreamPath ? 'dream' : 'logbook'}
          currentView="profile"
          onModeChange={handleModeChange}
          onViewChange={(view) => {
            if (view === 'feed') handleNavigateToFeed();
            else if (view === 'resonance-field') handleNavigateToResonanceField();
          }}
          currentUser={user}
          onProfileClick={handleProfileClick}
        />
        
        {/* Profile Content */}
        <div className="grid overflow-hidden" style={{ gridTemplateColumns: '1fr' }}>
          {user && (
            <ProfileView 
              user={user}
              onPostClick={handleOpenPost}
              onUserClick={handleUserClick}
              onResonate={resonateWithEntry}
              onAmplify={amplifyEntry}
              onBranch={createBranch}
              onDeepDive={handleDeepDive}
              onShare={handleShare}
              onLogout={handleLogout}
              onUpdateProfile={updateUserProfile}
              isOwnProfile={true}
              currentUserId={user.id}
              getFollowers={getFollowers}
              getFollowing={getFollowing}
            />
          )}
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
    </div>
  );
} 