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

// PHASE 3: Focused hooks instead of monolithic useNexusData
import { useAuth } from '@/hooks/useAuth';
import { useLogbook } from '@/hooks/useLogbook';
import { usePosts } from '@/hooks/usePosts';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { postToStreamEntry } from '@/lib/utils/postUtils';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // PHASE 3: Use focused hooks instead of monolithic useNexusData
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { logbookEntries, logbookState, networkStatus, isLoading: isLogbookLoading } = useLogbook(user?.id);
  const { posts, dreamEntries, refreshPosts, createBranch } = usePosts(user?.id);
  const { resonateWithEntry, amplifyEntry } = useUserInteractions(user?.id);
  
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
    if (postId && logbookEntries) {
      const post = logbookEntries.find(p => p.id === postId) || 
                   dreamEntries.find(p => p.id === postId);
      if (post) {
        setOverlayPost(post);
        setIsOverlayOpen(true);
      }
    }
  }, [searchParams, logbookEntries, dreamEntries]);

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
      // Handle post interactions using focused hooks
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
      if (user) {
        router.push(`/profile/${user.username}`);
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

  const handleAuthSuccess = async () => {
    // With focused hooks, auth refresh is handled automatically
    // No need for manual force refresh
    console.log('Auth success - hooks will handle state updates automatically');
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogout = () => {
    // Logout will be handled by AuthProvider through useAuth
    setIsProfileModalOpen(false);
  };

  const handleViewProfile = () => {
    setIsProfileModalOpen(false);
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

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  // Auth is now handled by middleware - no need for checks here

  // Show loading state if required logbook data is not available when in logbook mode
  if (viewMode === 'default' && journalMode === 'logbook' && 
      (isLogbookLoading || !logbookState || !networkStatus)) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Logbook....</div>
        </div>
      </div>
    );
  }

  // Show loading state if required dream data is not available when in dream mode
  if (viewMode === 'default' && journalMode === 'dream' && isLogbookLoading) {
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
          currentUser={user}
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
              createBranch={createBranch}
              refreshLogbookData={refreshPosts}
              refreshDreamData={refreshPosts}
              onResonate={resonateWithEntry}
              onAmplify={amplifyEntry}
              onShare={handleShare}
              onDeepDive={handleDeepDive}
            />
          )}
          
          {/* Logbook View */}
          {viewMode === 'default' && journalMode === 'logbook' && (
            <>
              <LeftSidebar 
                logbookState={logbookState!}
                networkStatus={networkStatus!}
                consciousnessField={logbookState?.consciousnessField}
              />
              <MainContent 
                entryComposer={logbookState?.entryComposer}
                stream={logbookEntries}
                onSubmitEntry={(content, type, isPublic) => {
                  // TODO: Implement submit entry with focused hooks
                  console.log('Submit entry:', content, type, isPublic, 'logbook');
                }}
                onResonate={resonateWithEntry}
                onBranch={createBranch}
                onAmplify={amplifyEntry}
                onShare={handleShare}
                onDeepDive={handleDeepDive}
                onPostClick={handleOpenPost}
                onUserClick={handleUserClick}
                hasUserResonated={(postId: string) => {
                  // TODO: Implement with focused hooks
                  return false;
                }}
                hasUserAmplified={(postId: string) => {
                  // TODO: Implement with focused hooks  
                  return false;
                }}
              />
              <RightSidebar 
                systemVitals={logbookState?.systemVitals}
                activeAgents={logbookState?.activeAgents}
                onReverieClick={handleReverieClick}
              />
            </>
          )}
          
          {/* Dream View */}
          {viewMode === 'default' && journalMode === 'dream' && (
            <>
              <DreamLeftSidebar 
                dreamStateMetrics={logbookState?.dreamStateMetrics || null}
                activeDreamers={logbookState?.activeDreamers || []}
                dreamPatterns={logbookState?.dreamPatterns || []}
              />
              <DreamMainContent 
                dreamComposer={logbookState?.dreamComposer}
                sharedDreams={dreamEntries}
                onPostClick={handleOpenPost}
                onUserClick={handleUserClick}
                onSubmitEntry={async (content, type, isPublic) => {
                  // TODO: Implement submit entry with focused hooks
                  console.log('Submit entry:', content, type, isPublic, 'dream');
                }}
                onBranch={createBranch}
                onResonate={resonateWithEntry}
                onAmplify={amplifyEntry}
                onShare={handleShare}
                onDeepDive={handleDeepDive}
                hasUserResonated={(postId: string) => {
                  // TODO: Implement with focused hooks
                  return false;
                }}
                hasUserAmplified={(postId: string) => {
                  // TODO: Implement with focused hooks
                  return false;
                }}
              />
              <DreamRightSidebar 
                dreamAnalytics={logbookState?.dreamAnalytics || null}
                emergingSymbols={logbookState?.emergingSymbols || []}
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
        getDirectChildren={(postId: string) => {
          // TODO: Implement with focused hooks
          return [];
        }}
        getParentPost={(postId: string) => {
          // TODO: Implement with focused hooks
          return null;
        }}
        onChildClick={handleOpenPost}
      />

      {/* User Profile Modal */}
      {user && (
        <UserProfile
          user={user}
          onLogout={handleLogout}
          onViewProfile={handleViewProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
} 