'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const nexusData = useNexusData();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Determine mode from URL
  const modeFromUrl = searchParams.get('mode');
  const modeClass = modeFromUrl === 'dream' ? 'mode-dream' : 'mode-logbook';
  const currentMode = modeFromUrl === 'dream' ? 'dream' : 'logbook';

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

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    router.push(`/?mode=${mode}`);
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