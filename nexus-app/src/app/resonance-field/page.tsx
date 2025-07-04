'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ResonanceField from '@/components/ResonanceField';
import PostOverlay from '@/components/PostOverlay';
import UserProfile from '@/components/UserProfile';
import AuthPanel from '@/components/AuthPanel';
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
      console.log(`${action} interaction on post ${postId}`);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const handleShare = (postId: string) => {
    // The share functionality is now handled natively in the PostDisplay component
    // We just need to provide this callback for compatibility
    console.log(`Share interaction on post ${postId}`);
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

  // Show auth panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={() => nexusData.forceAuthRefresh()} />;
  }

  // Show loading state while data is being fetched
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Resonance Field...</div>
        </div>
      </div>
    );
  }

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
            resonatedEntries={nexusData.resonatedEntries}
            onPostClick={handleOpenPost}
            refreshResonatedEntries={nexusData.refreshResonatedEntries}
            onResonate={nexusData.resonateWithEntry}
            onAmplify={nexusData.amplifyEntry}
            onBranch={nexusData.createBranch}
            hasUserAmplified={nexusData.hasUserAmplified}
            refreshAmplifiedEntries={nexusData.refreshAmplifiedEntries}
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