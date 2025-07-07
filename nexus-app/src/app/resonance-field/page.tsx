'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ResonanceField from '@/components/ResonanceField';
import PostOverlay from '@/components/PostOverlay';
import UserProfile from '@/components/UserProfile';
import { Post, StreamEntry } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function ResonanceFieldPage() {
  const router = useRouter();
  const pathname = usePathname();
  const nexusData = useNexusData();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Determine mode from the pathname
  const isDreamPath = pathname.startsWith('/dream');
  const modeClass = isDreamPath ? 'mode-dream' : 'mode-logbook';
  const currentMode: 'logbook' | 'dream' = isDreamPath ? 'dream' : 'logbook';

  // Ensure first page is loaded when user is authenticated
  useEffect(() => {
    if (nexusData.authState.isAuthenticated && nexusData.currentUser) {
      nexusData.ensureResonatedEntriesLoaded?.();
    }
  }, [nexusData.authState.isAuthenticated, nexusData.currentUser]);

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
        await nexusData.resonateWithEntry(postId);
      } else if (action === 'Amplify ≋' || action === 'amplify') {
        await nexusData.amplifyEntry(postId);
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
    if (nexusData.currentUser) {
      router.push(`/profile/${nexusData.currentUser.username}`);
    }
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogout = () => {
    nexusData.logout();
    setIsProfileModalOpen(false);
    router.push('/');
  };

  const handleViewProfile = () => {
    setIsProfileModalOpen(false);
    if (nexusData.currentUser) {
      router.push(`/profile/${nexusData.currentUser.username}`);
    }
  };

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
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
          currentUser={nexusData.currentUser}
          onProfileClick={handleProfileClick}
        />
        
        {/* Resonance Field Content */}
        <div className="grid overflow-hidden grid-cols-1">
          <ResonanceField
            initialEntries={nexusData.resonatedEntries}
            getPosts={nexusData.getPosts}
            onPostClick={handleOpenPost}
            onResonate={nexusData.resonateWithEntry}
            onAmplify={nexusData.amplifyEntry}
            onBranch={nexusData.createBranch}
            hasUserResonated={nexusData.hasUserResonated}
            hasUserAmplified={nexusData.hasUserAmplified}
            onShare={handleShare}
            onDeepDive={(post) => handleDeepDive(post.username, post.id)}
            isUserStatesLoaded={nexusData.isUserStatesLoaded}
            loadUserStatesForPosts={nexusData.loadUserStatesForPosts}
          />
        </div>
      </div>
      
      {/* Post Overlay */}
      <PostOverlay 
        post={overlayPost}
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        onInteraction={handlePostInteraction}
        getDirectChildren={nexusData.getDirectChildren}
        getParentPost={nexusData.getParentPost}
        onChildClick={handleOpenPost}
      />

      {/* User Profile Modal */}
      {nexusData.currentUser && (
        <UserProfile
          user={nexusData.currentUser}
          onLogout={handleLogout}
          onViewProfile={handleViewProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
} 