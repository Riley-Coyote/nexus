'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import LogbookPage from '@/components/LogbookPage';
import RightSidebar from '@/components/RightSidebar';
import PostOverlay from '@/components/PostOverlay';
import AuthPanel from '@/components/AuthPanel';
import NotificationBanner from '@/components/NotificationBanner';
import { Post, StreamEntry, JournalMode, ViewMode } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function LogbookPageWrapper() {
  const router = useRouter();
  const nexusData = useNexusData();
  
  // State management
  const [journalMode] = useState<JournalMode>('logbook');
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
    if (mode === 'dream') {
      router.push('/dream');
    } else {
      router.push('/logbook');
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

  // Show authentication panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  // NEW OPTIMIZED PATTERN: No more waiting for pre-loaded data
  // Let the LogbookPage component handle its own data loading
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
        {/* Left Sidebar - Using fallback data or loading state */}
        <div className="w-80 hidden lg:block">
          <LeftSidebar 
            logbookState={nexusData.logbookState || {
              awarenessLevel: 0.85,
              reflectionDepth: 0.92,
              fieldResonance: 0.78
            }}
            networkStatus={nexusData.networkStatus || {
              nodes: "Loading...",
              activeMessages: 0,
              dreamEntries: 0,
              entropy: 0.0
            }}
            consciousnessField={nexusData.logbookField || {
              id: 'logbook-field',
              rows: 8,
              columns: 32,
              characters: ['◊', '≋', '∞', '◈', '⚡', '◆', '∴', '∵', '≈', '∼']
            }}
          />
        </div>

        {/* Main Content - Optimized LogbookPage handles its own data loading */}
        <LogbookPage
          onPostClick={handleOpenPost}
          entryComposer={nexusData.entryComposer}
        />

        {/* Right Sidebar - Using fallback data or loading state */}
        <div className="w-80 hidden lg:block">
          <RightSidebar 
            systemVitals={nexusData.systemVitals || [
              { name: 'Loading...', value: 0.0 }
            ]}
            activeAgents={nexusData.activeAgents || [
              { name: 'Loading...', connection: 0.0, specialty: 'Initializing', status: 'grey' as const }
            ]}
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