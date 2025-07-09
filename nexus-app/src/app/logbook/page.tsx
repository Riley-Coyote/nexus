'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import LogbookPage from '@/components/LogbookPage';
import RightSidebar from '@/components/RightSidebar';
import PostOverlay from '@/components/PostOverlay';
import NotificationBanner from '@/components/NotificationBanner';
import { Post, StreamEntry, JournalMode, ViewMode } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLogbook } from '@/hooks/useLogbook';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { postToStreamEntry } from '@/lib/utils/postUtils';
import { dataService } from '@/lib/services/dataService';

export default function LogbookPageWrapper() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { logbookState, networkStatus, logbookField, entryComposer, systemVitals, activeAgents } = useLogbook();
  const { resonateWithEntry, amplifyEntry, createBranch } = useUserInteractions();
  
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
    if (mode === 'dream') {
      router.push('/dream');
    } else {
      router.push('/logbook');
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
  // Let the LogbookPage component handle its own data loading
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
            <LeftSidebar 
              logbookState={logbookState || {
                awarenessLevel: 0.85,
                reflectionDepth: 0.92,
                fieldResonance: 0.78
              }}
              networkStatus={networkStatus || {
                nodes: "Loading...",
                activeMessages: 0,
                dreamEntries: 0,
                entropy: 0.0
              }}
              consciousnessField={logbookField || {
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
            entryComposer={entryComposer}
          />

          {/* Right Sidebar - Using fallback data or loading state */}
          <div className="w-80 hidden lg:block">
            <RightSidebar 
              systemVitals={systemVitals || [
                { name: 'Loading...', value: 0.0 }
              ]}
              activeAgents={activeAgents || [
                { name: 'Loading...', connection: 0.0, specialty: 'Initializing', status: 'grey' as const }
              ]}
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