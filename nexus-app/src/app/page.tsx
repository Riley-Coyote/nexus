'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import MainContent from '@/components/MainContent';
import RightSidebar from '@/components/RightSidebar';
import DreamLeftSidebar from '@/components/DreamLeftSidebar';
import DreamMainContent from '@/components/DreamMainContent';
import DreamRightSidebar from '@/components/DreamRightSidebar';
import PostOverlay from '@/components/PostOverlay';
import NexusFeed from '@/components/NexusFeed';
import ResonanceField from '@/components/ResonanceField';
import AuthPanel from '@/components/AuthPanel';
import UserProfile from '@/components/UserProfile';
import { StreamEntryData } from '@/components/StreamEntry';
import { JournalMode, ViewMode, StreamEntry } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';

export default function Home() {
  const [journalMode, setJournalMode] = useState<JournalMode>('logbook');
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Use the optimized data hook
  const nexusData = useNexusData();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpenPost = (post: StreamEntry | StreamEntryData) => {
    // Convert StreamEntryData to StreamEntry if needed
    const streamEntry: StreamEntry = 'children' in post && 'actions' in post && 'threads' in post ? 
      post as StreamEntry : 
      {
        ...post,
        parentId: post.parentId || null,
        children: [],
        actions: ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
        threads: []
      };
    setOverlayPost(streamEntry);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    setTimeout(() => setOverlayPost(null), 400); // Wait for animation
  };

  const handlePostInteraction = async (action: string, postId: string) => {
    try {
      // Handle post interactions using the data service
      if (action === 'Resonate ◊') {
        await nexusData.resonateWithEntry(postId);
      } else if (action === 'Amplify ≋') {
        await nexusData.amplifyEntry(postId);
      }
      console.log(`${action} interaction on post ${postId}`);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const handleModeChange = (mode: JournalMode) => {
    setJournalMode(mode);
    // When switching to Logbook or Dream, return to default view
    setViewMode('default');
  };

  const handleAuthSuccess = () => {
    // Force a re-check of auth state to trigger re-render
    nexusData.forceAuthRefresh();
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
  };

  const handleLogout = () => {
    nexusData.logout();
    setIsProfileOpen(false);
  };

  // Show authentication panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return (
      <AuthPanel 
        onAuthSuccess={handleAuthSuccess}
        onLogin={nexusData.login}
        onSignup={nexusData.signup}
      />
    );
  }

  // Show loading state while data is being fetched or required data is not available
  if (nexusData.isLoading || 
      (journalMode === 'logbook' && (!nexusData.logbookState || !nexusData.networkStatus)) ||
      (journalMode === 'dream' && (!nexusData.dreamStateMetrics || !nexusData.dreamAnalytics))) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Nexus...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`liminal-logbook ${journalMode === 'dream' ? 'dream-mode' : ''}`}>
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode={journalMode}
          currentView={viewMode}
          onModeChange={handleModeChange}
          onViewChange={setViewMode}
          currentUser={nexusData.currentUser}
          onProfileClick={handleProfileClick}
        />
        
        {/* Main Grid Content */}
        {viewMode === 'feed' ? (
          <div className="grid overflow-hidden" style={{ gridTemplateColumns: '1fr' }}>
            <NexusFeed 
              logbookEntries={nexusData.logbookEntriesData}
              dreamEntries={nexusData.dreamEntriesData}
              onPostClick={handleOpenPost}
              getFlattenedStreamEntries={nexusData.getFlattenedStreamEntries}
              createBranch={nexusData.createBranch}
              refreshLogbookData={nexusData.refreshLogbookData}
              refreshDreamData={nexusData.refreshDreamData}
            />
          </div>
        ) : viewMode === 'resonance-field' ? (
          <div className="grid overflow-hidden" style={{ gridTemplateColumns: '1fr' }}>
            <ResonanceField 
              resonatedEntries={nexusData.resonatedEntries}
              onPostClick={handleOpenPost}
              refreshResonatedEntries={nexusData.refreshResonatedEntries}
              onResonate={nexusData.resonateWithEntry}
            />
          </div>
        ) : (
          <div className="grid overflow-hidden" style={{ gridTemplateColumns: '320px 1fr 288px' }}>
            {journalMode === 'logbook' ? (
              <>
                <LeftSidebar 
                  logbookState={nexusData.logbookState!}
                  networkStatus={nexusData.networkStatus!}
                  consciousnessField={nexusData.logbookField}
                />
                <MainContent 
                  entryComposer={nexusData.entryComposer}
                  stream={nexusData.logbookEntries}
                  onPostClick={handleOpenPost}
                  onSubmitEntry={(content, type, isPublic) => nexusData.submitEntry(content, type, isPublic, 'logbook')}
                  onResonate={nexusData.resonateWithEntry}
                  onBranch={nexusData.createBranch}
                  onAmplify={nexusData.amplifyEntry}
                />
                <RightSidebar 
                  systemVitals={nexusData.systemVitals}
                  activeAgents={nexusData.activeAgents}
                />
              </>
            ) : (
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
                  onSubmitEntry={(content, type, isPublic) => nexusData.submitEntry(content, type, isPublic, 'dream')}
                  onBranch={nexusData.createBranch}
                />
                <DreamRightSidebar 
                  dreamAnalytics={nexusData.dreamAnalytics!}
                  emergingSymbols={nexusData.emergingSymbols}
                />
              </>
            )}
          </div>
        )}
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

      {/* User Profile */}
      {nexusData.currentUser && (
        <UserProfile
          user={nexusData.currentUser}
          onLogout={handleLogout}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
} 