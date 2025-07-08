'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DreamLeftSidebar from '@/components/DreamLeftSidebar';
import DreamPage from '@/components/DreamPage';
import DreamRightSidebar from '@/components/DreamRightSidebar';
import PostOverlay from '@/components/PostOverlay';

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

  // Auth is now handled at root level - no need for checks here

  // NEW OPTIMIZED PATTERN: No more waiting for pre-loaded data
  // Let the DreamPage component handle its own data loading
  return (
    <div className="liminal-logbook">
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          currentUser={nexusData.currentUser}
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          onProfileClick={handleProfileClick}
        />
        
        <div className="grid overflow-hidden" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {/* Left Sidebar - Using fallback data or loading state */}
          <div className="w-80 hidden lg:block">
            <DreamLeftSidebar 
              dreamStateMetrics={nexusData.dreamStateMetrics || {
                dreamFrequency: 0.0,
                emotionalDepth: 0.0,
                symbolIntegration: 0.0,
                creativeEmergence: 0.0
              }}
              activeDreamers={nexusData.activeDreamers || [
                { name: 'Loading...', state: 'DEEP' as const, color: 'grey' as const }
              ]}
              dreamPatterns={nexusData.dreamPatterns || {
                id: 'dream-patterns',
                rows: 8,
                columns: 32,
                characters: ['◊', '≋', '∞', '◈', '⚡', '◆', '∴', '∵', '≈', '∼']
              }}
            />
          </div>

          {/* Main Content - Optimized DreamPage handles its own data loading */}
          <DreamPage
            onPostClick={handleOpenPost}
            entryComposer={nexusData.dreamComposer}
          />

          {/* Right Sidebar - Using fallback data or loading state */}
          <div className="w-80 hidden lg:block">
            <DreamRightSidebar 
              dreamAnalytics={nexusData.dreamAnalytics || {
                totalDreams: 0,
                avgResonance: 0.0,
                symbolDiversity: 0,
                responseRate: "0%"
              }}
              emergingSymbols={nexusData.emergingSymbols || ['Loading...']}
              onReverieClick={handleReverieClick}
            />
          </div>
        </div>
      </div>

      {/* Post Overlay - MOVED OUTSIDE GRID */}
      {overlayPost && (
        <PostOverlay 
          post={overlayPost}
          isOpen={isOverlayOpen}
          onClose={handleCloseOverlay}
          onInteraction={handlePostInteraction}
          getDirectChildren={nexusData.getDirectChildren}
          getParentPost={nexusData.getParentPost}
          onChildClick={handleOpenPost}
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