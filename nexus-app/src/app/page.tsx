'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import MainContent from '@/components/MainContent';
import RightSidebar from '@/components/RightSidebar';
import DreamLeftSidebar from '@/components/DreamLeftSidebar';
import DreamMainContent from '@/components/DreamMainContent';
import DreamRightSidebar from '@/components/DreamRightSidebar';
import PostOverlay from '@/components/PostOverlay';
import NexusFeed from '@/components/NexusFeed';
import AuthPanel from '@/components/AuthPanel';
import UserProfile from '@/components/UserProfile';
import { Post, StreamEntry, JournalMode, ViewMode } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nexusData = useNexusData();
  
  // State management
  const modeFromUrl = searchParams.get('mode');
  const [journalMode, setJournalMode] = useState<JournalMode>(
    modeFromUrl === 'dream' ? 'dream' : 'logbook'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  const handleModeChange = (mode: JournalMode) => {
    setJournalMode(mode);
    setViewMode('default');
    // Update the URL to reflect the new mode
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('mode', mode);
    router.push(`/?${params.toString()}`);
  };

  const handleViewChange = (view: ViewMode) => {
    // Always preserve the mode in the URL
    const modeParam = `?mode=${journalMode}`;
    if (view === 'profile') {
      if (nexusData.currentUser) {
        router.push(`/profile/${nexusData.currentUser.username}${modeParam}`);
      }
    } else if (view === 'resonance-field') {
      router.push(`/resonance-field${modeParam}`);
    } else if (view === 'feed') {
      setViewMode('feed');
      router.push(`/${modeParam}`);
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
      router.push(`/profile/${nexusData.currentUser.username}?mode=${journalMode}`);
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}?mode=${journalMode}`);
  };

  // Show auth panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  // Show loading state while data is being fetched
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Nexus...</div>
        </div>
      </div>
    );
  }

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
              logbookEntries={nexusData.logbookEntriesData}
              dreamEntries={nexusData.dreamEntriesData}
              onPostClick={handleOpenPost}
              onUserClick={handleUserClick}
              getFlattenedStreamEntries={nexusData.getFlattenedStreamEntries}
              createBranch={nexusData.createBranch}
              refreshLogbookData={nexusData.refreshLogbookData}
              refreshDreamData={nexusData.refreshDreamData}
              onResonate={nexusData.resonateWithEntry}
              onAmplify={nexusData.amplifyEntry}
              hasUserResonated={nexusData.hasUserResonated}
              hasUserAmplified={nexusData.hasUserAmplified}
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
                onShare={(id) => console.log('Share functionality to be implemented', id)}
                onPostClick={handleOpenPost}
                onUserClick={handleUserClick}
                hasUserResonated={nexusData.hasUserResonated}
                hasUserAmplified={nexusData.hasUserAmplified}
              />
              <RightSidebar 
                systemVitals={nexusData.systemVitals}
                activeAgents={nexusData.activeAgents}
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
                hasUserResonated={nexusData.hasUserResonated}
                hasUserAmplified={nexusData.hasUserAmplified}
              />
              <DreamRightSidebar 
                dreamAnalytics={nexusData.dreamAnalytics!}
                emergingSymbols={nexusData.emergingSymbols}
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