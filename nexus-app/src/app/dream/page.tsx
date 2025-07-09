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
import { useAuth } from '@/hooks/useAuth';
import { useLogbook } from '@/hooks/useLogbook';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { postToStreamEntry } from '@/lib/utils/postUtils';
import { dataService } from '@/lib/services/dataService';

export default function DreamPageWrapper() {
  const router = useRouter();
  const { user } = useAuth();
  const { logbookState, networkStatus, logbookField, systemVitals, activeAgents } = useLogbook();
  const { resonateWithEntry, amplifyEntry, createBranch } = useUserInteractions();
  
  // Get dream-specific entry composer
  const dreamComposer = dataService.getEntryComposer('dream');
  
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
      // Handle post interactions using the focused hooks
      if (action === 'Resonate ◊' || action === 'resonate') {
        await resonateWithEntry(postId);
      } else if (action === 'Amplify ≋' || action === 'amplify') {
        await amplifyEntry(postId);
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
      if (user) {
        router.push(`/profile/${user.username}`);
      }
    } else if (view === 'resonance-field') {
      router.push('/resonance-field');
    } else if (view === 'feed') {
      router.push('/');
    }
  };

  const handleProfileClick = () => {
    if (user) {
      router.push(`/profile/${user.username}`);
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

  // Auth is now handled at root level - no need for checks here

  // NEW OPTIMIZED PATTERN: No more waiting for pre-loaded data
  // Let the DreamPage component handle its own data loading
  return (
    <div className="liminal-logbook">
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          currentUser={user}
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          onProfileClick={handleProfileClick}
        />
        
        <div className="grid overflow-hidden" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {/* Left Sidebar - Using fallback data or loading state */}
          <div className="w-80 hidden lg:block">
            <DreamLeftSidebar 
              dreamStateMetrics={{
                dreamFrequency: 0.0,
                emotionalDepth: 0.0,
                symbolIntegration: 0.0,
                creativeEmergence: 0.0
              }}
              activeDreamers={[
                { name: 'Loading...', state: 'DEEP' as const, color: 'grey' as const }
              ]}
              dreamPatterns={{
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
            entryComposer={dreamComposer}
          />

          {/* Right Sidebar - Using fallback data or loading state */}
          <div className="w-80 hidden lg:block">
            <DreamRightSidebar 
              dreamAnalytics={{
                totalDreams: 0,
                avgResonance: 0.0,
                symbolDiversity: 0,
                responseRate: "0%"
              }}
              emergingSymbols={['Loading...']}
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
          getDirectChildren={getDirectChildren}
          getParentPost={getParentPost}
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