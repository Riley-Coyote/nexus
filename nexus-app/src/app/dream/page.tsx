'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DreamLeftSidebar from '@/components/DreamLeftSidebar';
import DreamPage from '@/components/DreamPage';
import DreamRightSidebar from '@/components/DreamRightSidebar';
import PostOverlay from '@/components/PostOverlay';
import AuthPanel from '@/components/AuthPanel';
import NotificationBanner from '@/components/NotificationBanner';
import { Post, StreamEntry, JournalMode, ViewMode } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function DreamPageWrapper() {
  const router = useRouter();
  const nexusData = useNexusData();
  
  // State management
  const [journalMode] = useState<JournalMode>('dream');
  const [viewMode] = useState<ViewMode>('default');
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Banner state for Reverie clicks
  const [showReverieBanner, setShowReverieBanner] = useState(false);

  // Handle opening posts (unified handler for both Post and StreamEntry)
  const handleOpenPost = (post: Post | StreamEntry) => {
    // Convert Post to StreamEntry if needed
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

  const handlePostInteraction = async (action: string, postId: string) => {
    try {
      // Handle post interactions using the data service
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
    console.log(`Share interaction on post ${postId}`);
  };

  const handleModeChange = (mode: JournalMode) => {
    if (mode === 'logbook') {
      router.push('/logbook');
    } else {
      router.push('/dream');
    }
  };

  const handleViewChange = (view: ViewMode) => {
    if (view === 'profile') {
      if (nexusData.currentUser) {
        router.push(`/profile/${nexusData.currentUser.username}`);
      }
    } else if (view === 'resonance-field') {
      router.push('/resonance-field');
    } else if (view === 'feed') {
      router.push('/');
    }
  };

  const handleAuthSuccess = async () => {
    // Force a re-check of auth state to trigger re-render
    try {
      await nexusData.forceAuthRefresh();
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
      // Continue rendering - the error is logged but shouldn't block UI
    }
  };

  const handleProfileClick = () => {
    if (nexusData.currentUser) {
      router.push(`/profile/${nexusData.currentUser.username}`);
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  const handleReverieClick = () => {
    setShowReverieBanner(true);
  };

  const handleDeepDive = (post: Post) => {
    router.push(`/${post.username}/entry/${post.id}`);
  };

  const handleSubmitEntry = async (content: string, type: string, isPublic: boolean) => {
    try {
      await nexusData.submitEntry(content, type, isPublic, 'dream');
      console.log('Entry submitted successfully');
    } catch (error) {
      console.error('Failed to submit entry:', error);
    }
  };

  const handleBranch = async (parentId: string, content: string) => {
    try {
      await nexusData.createBranch(parentId, content);
      console.log('Branch created successfully');
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  const handleResonate = async (entryId: string) => {
    try {
      await nexusData.resonateWithEntry(entryId);
      console.log('Resonance updated successfully');
    } catch (error) {
      console.error('Failed to resonate:', error);
    }
  };

  const handleAmplify = async (entryId: string) => {
    try {
      await nexusData.amplifyEntry(entryId);
      console.log('Amplification updated successfully');
    } catch (error) {
      console.error('Failed to amplify:', error);
    }
  };

  // Show authentication panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  // Show loading state while auth is initializing
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          currentUser={nexusData.currentUser}
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          onProfileClick={handleProfileClick}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary">Loading Dreams...</div>
        </main>
      </div>
    );
  }

  // Show loading state if required dream data is not available
  if (!nexusData.dreamStateMetrics || !nexusData.dreamAnalytics) {
    return (
      <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          currentUser={nexusData.currentUser}
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          onProfileClick={handleProfileClick}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary">Loading Dreams...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
      <Header 
        currentMode={journalMode}
        currentView={viewMode}
        currentUser={nexusData.currentUser}
        onModeChange={handleModeChange}
        onViewChange={handleViewChange}
        onProfileClick={handleProfileClick}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 hidden lg:block">
          <DreamLeftSidebar 
            dreamStateMetrics={nexusData.dreamStateMetrics}
            activeDreamers={nexusData.activeDreamers}
            dreamPatterns={nexusData.dreamPatterns}
          />
        </div>

        {/* Main Content - Optimized DreamPage */}
        <DreamPage
          onPostClick={handleOpenPost}
          entryComposer={nexusData.dreamComposer}
        />

        {/* Right Sidebar */}
        <div className="w-80 hidden lg:block">
          <DreamRightSidebar 
            dreamAnalytics={nexusData.dreamAnalytics}
            emergingSymbols={nexusData.emergingSymbols}
            onReverieClick={handleReverieClick}
          />
        </div>
      </div>

      {/* Post Overlay */}
      {overlayPost && (
        <PostOverlay 
          post={overlayPost}
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          onInteraction={handlePostInteraction}
        />
      )}

      {/* Notification Banner */}
      {showReverieBanner && (
        <NotificationBanner 
          show={showReverieBanner}
          title="Reverie mode is in development. Coming soon!"
          onClose={() => setShowReverieBanner(false)}
        />
      )}
    </div>
  );
} 