'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import MainContent from '@/components/MainContent';
import RightSidebar from '@/components/RightSidebar';
import DreamLeftSidebar from '@/components/DreamLeftSidebar';
import DreamMainContent from '@/components/DreamMainContent';
import DreamRightSidebar from '@/components/DreamRightSidebar';
import PostOverlay from '@/components/PostOverlay';
import NexusFeed from '@/components/NexusFeed';

import UserProfile from '@/components/UserProfile';
import NotificationBanner from '@/components/NotificationBanner';
import { Post, StreamEntry, JournalMode, ViewMode } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const nexusData = useNexusData();
  
  // State management
  const [journalMode, setJournalMode] = useState<JournalMode>(() =>
    pathname.startsWith('/dream') ? 'dream' : 'logbook'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    pathname === '/' || pathname === '/feed' ? 'feed' : 'default'
  );
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Banner state for Reverie clicks
  const [showReverieBanner, setShowReverieBanner] = useState(false);

  // Handle URL parameters for direct post access
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId && nexusData.logbookEntries) {
      const post = nexusData.logbookEntries.find(p => p.id === postId) || 
                   nexusData.sharedDreams.find(p => p.id === postId);
      if (post) {
        setOverlayPost(post);
        setIsOverlayOpen(true);
      }
    }
  }, [searchParams, nexusData.logbookEntries, nexusData.sharedDreams]);

  // Sync journal/view state when path changes
  useEffect(() => {
    if (pathname === '/' || pathname === '/feed') {
      setViewMode('feed');
      // OPTIMIZED: No longer trigger old data loading - let NexusFeed handle its own optimized data loading
      // This allows NexusFeed to use the optimized get_entries_with_user_states SQL function
    } else if (pathname.startsWith('/dream')) {
      setJournalMode('dream');
      setViewMode('default');
    } else if (pathname.startsWith('/logbook')) {
      setJournalMode('logbook');
      setViewMode('default');
    }
  }, [pathname]);

  // OPTIMIZED: No longer trigger old data loading after auth - let NexusFeed handle its own optimized data loading
  // This prevents interference with the optimized get_entries_with_user_states SQL function flow

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
    // We just need to provide this callback for tracking and analytics
    console.log(`Share interaction on post ${postId}`);
  };

  const handleModeChange = (mode: JournalMode) => {
    setJournalMode(mode);
    setViewMode('default');
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
      setViewMode('feed');
      router.push('/');
    } else {
      setViewMode(view);
    }
  };

  const handleAuthSuccess = () => {
    // Force a re-check of auth state to trigger re-render
    nexusData.forceAuthRefresh();
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogout = () => {
    nexusData.logout();
    setIsProfileModalOpen(false);
  };

  const handleViewProfile = () => {
    setIsProfileModalOpen(false);
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

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  // Auth is now handled at root level - no need for checks here

  // Show loading state if required logbook data is not available when in logbook mode
  if (viewMode === 'default' && journalMode === 'logbook' && 
      (!nexusData.logbookState || !nexusData.networkStatus)) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Logbook...</div>
        </div>
      </div>
    );
  }

  // Show loading state if required dream data is not available when in dream mode
  if (viewMode === 'default' && journalMode === 'dream' && 
      (!nexusData.dreamStateMetrics || !nexusData.dreamAnalytics)) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Dreams...</div>
        </div>
      </div>
    );
  }

  // Render main application UI
  return (
    <div className={`liminal-logbook ${journalMode === 'dream' ? 'mode-dream' : 'mode-logbook'}`}>
      {/* Floating Reverie Banner */}
      <NotificationBanner
        show={showReverieBanner}
        onClose={() => setShowReverieBanner(false)}
        title="Reverie Portal Coming Soon"
        subtitle="Deep consciousness exploration is in development"
        variant={journalMode === 'dream' ? 'dream' : 'logbook'}
      />
      
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          onModeChange={handleModeChange}
          onViewChange={handleViewChange}
          currentUser={nexusData.currentUser}
          onProfileClick={handleProfileClick}
        />
        
        {/* Main Content Area */}
        <div className={`grid overflow-hidden ${
          viewMode === 'feed'
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-[300px_1fr_300px]'
        }`}>
          
          {/* Feed View */}
          {viewMode === 'feed' && (
            <NexusFeed 
              onPostClick={handleOpenPost}
              onUserClick={handleUserClick}
              createBranch={nexusData.createBranch}
              refreshLogbookData={nexusData.refreshLogbookData}
              refreshDreamData={nexusData.refreshDreamData}
              onResonate={nexusData.resonateWithEntry}
              onAmplify={nexusData.amplifyEntry}
              onShare={handleShare}
              onDeepDive={handleDeepDive}
            />
          )}
          
          {/* Logbook View */}
          {viewMode === 'default' && journalMode === 'logbook' && (
            <>
              <LeftSidebar 
                logbookState={nexusData.logbookState!}
                networkStatus={nexusData.networkStatus!}
                consciousnessField={nexusData.logbookField}
              />
              <MainContent 
                entryComposer={nexusData.entryComposer}
                stream={nexusData.logbookEntries}
                onSubmitEntry={(content, type, isPublic) => nexusData.submitEntry(content, type, isPublic, 'logbook')}
                onResonate={nexusData.resonateWithEntry}
                onBranch={nexusData.createBranch}
                onAmplify={nexusData.amplifyEntry}
                onShare={handleShare}
                onDeepDive={handleDeepDive}
                onPostClick={handleOpenPost}
                onUserClick={handleUserClick}
                hasUserResonated={nexusData.hasUserResonated}
                hasUserAmplified={nexusData.hasUserAmplified}
              />
              <RightSidebar 
                systemVitals={nexusData.systemVitals}
                activeAgents={nexusData.activeAgents}
                onReverieClick={handleReverieClick}
              />
            </>
          )}
          
          {/* Dream View */}
          {viewMode === 'default' && journalMode === 'dream' && (
            <>
              <DreamLeftSidebar 
                dreamStateMetrics={nexusData.dreamStateMetrics!}
                activeDreamers={nexusData.activeDreamers}
                dreamPatterns={nexusData.dreamPatterns}
              />
              <DreamMainContent 
                dreamComposer={nexusData.dreamComposer}
                sharedDreams={nexusData.sharedDreams}
                onPostClick={handleOpenPost}
                onUserClick={handleUserClick}
                onSubmitEntry={(content, type, isPublic) => nexusData.submitEntry(content, type, isPublic, 'dream')}
                onBranch={nexusData.createBranch}
                onResonate={nexusData.resonateWithEntry}
                onAmplify={nexusData.amplifyEntry}
                onShare={handleShare}
                onDeepDive={handleDeepDive}
                hasUserResonated={nexusData.hasUserResonated}
                hasUserAmplified={nexusData.hasUserAmplified}
              />
              <DreamRightSidebar 
                dreamAnalytics={nexusData.dreamAnalytics!}
                emergingSymbols={nexusData.emergingSymbols}
                onReverieClick={handleReverieClick}
              />
            </>
          )}
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