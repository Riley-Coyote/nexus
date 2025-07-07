'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ProfileView from '@/components/ProfileView';
import PostOverlay from '@/components/PostOverlay';
import UserProfile from '@/components/UserProfile';

import { StreamEntry } from '@/lib/types';
import { StreamEntryData } from '@/lib/types';
import { useNexusData } from '@/hooks/useNexusData';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const username = params.username as string;
  const nexusData = useNexusData();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Determine mode from pathname
  const isDreamPath = pathname.startsWith('/dream');
  const modeClass = isDreamPath ? 'mode-dream' : 'mode-logbook';
  const currentMode: 'logbook' | 'dream' = isDreamPath ? 'dream' : 'logbook';

  // Load the user profile when the component mounts or username changes
  useEffect(() => {
    if (username && nexusData.authState.isAuthenticated) {
      // If viewing own username, switch to self profile mode
      if (nexusData.currentUser && username === nexusData.currentUser.username) {
        nexusData.viewSelfProfile();
      } else {
        nexusData.viewUserProfile(username).catch((error) => {
          console.error('Failed to load user profile:', error);
          // Leave in loading state so fallback shows "User not found"
        });
      }
    }
  }, [username, nexusData.authState.isAuthenticated, nexusData.currentUser, nexusData.viewSelfProfile, nexusData.viewUserProfile]);

  const handleOpenPost = (post: StreamEntry | StreamEntryData) => {
    // Convert StreamEntryData to StreamEntry if needed
    const streamEntry: StreamEntry =
      'children' in post && 'actions' in post && 'threads' in post
        ? post as StreamEntry
        : {
            ...post,
            // Derive agent for StreamEntry fallback
            agent: 'agent' in post ? (post as any).agent : post.username,
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
    setTimeout(() => setOverlayPost(null), 400);
  };

  const handlePostInteraction = async (action: string, postId: string) => {
    try {
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

  const handleAuthSuccess = async () => {
    try {
      await nexusData.forceAuthRefresh();
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
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
    // Navigate to current user's profile by username
    if (nexusData.currentUser) {
      router.push(`/profile/${nexusData.currentUser.username}`);
    }
  };

  const handleReturnToOwnProfile = () => {
    // Navigate to current user's profile by username
    if (nexusData.currentUser) {
      router.push(`/profile/${nexusData.currentUser.username}`);
    }
  };

  const handleUserClick = async (clickedUsername: string) => {
    try {
      if (clickedUsername === username) {
        // Same user, stay on current page
        return;
      }
      // Navigate to the clicked user's profile page
      router.push(`/profile/${clickedUsername}`);
    } catch (error) {
      console.error('❌ Failed to navigate to user profile:', error);
    }
  };

  const handleDeepDive = (username: string, postId: string) => {
    router.push(`/${username}/entry/${postId}`);
  };

  const handleNavigateToFeed = () => {
    router.push('/');
  };

  const handleNavigateToResonanceField = () => {
    router.push('/resonance-field');
  };

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    router.push(`/${mode}`);
  };

  // Auth is now handled at root level - no need for checks here

  // Get the profile user (either the viewed user or current user)
  const profileUser = nexusData.getCurrentProfileUser();
  
  // Show "User not found" page only **after** loading completes
  // Prevents a brief flash of the fallback while the profile is still loading
  if (
    nexusData.profileViewState.mode === 'other' &&
    !nexusData.isLoading &&
    !profileUser
  ) {
    return (
      <div className={`liminal-logbook ${modeClass}`}>
        <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
          {/* Header */}
          <Header 
            currentMode={currentMode}
            currentView="profile"
            onModeChange={handleModeChange}
            onViewChange={(view) => {
              if (view === 'feed') handleNavigateToFeed();
              else if (view === 'resonance-field') handleNavigateToResonanceField();
              else if (view === 'profile') handleReturnToOwnProfile();
            }}
            currentUser={nexusData.currentUser}
            onProfileClick={handleProfileClick}
          />
          
          {/* User Not Found Content */}
          <div className="flex flex-col items-center justify-center h-full bg-deep-void px-8">
            {/* Large Avatar Placeholder */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-white/10 flex items-center justify-center text-4xl font-medium text-gray-500 mb-6">
              {username ? username.slice(0, 2).toUpperCase() : '??'}
            </div>
            
            {/* Username */}
            <div className="text-xl text-gray-400 mb-8">
              @{username}
            </div>
            
            {/* Main Message */}
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-medium text-white mb-4">
                This account doesn't exist
              </h1>
              <p className="text-gray-400 text-base">
                Try searching for another.
              </p>
            </div>
            
            {/* Action Button */}
            <button
              onClick={handleReturnToOwnProfile}
              className="mt-8 px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-emerald-400 transition-colors"
            >
              Return to your profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (!profileUser) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Profile...</div>
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
          currentView="profile"
          onModeChange={handleModeChange}
          onViewChange={(view) => {
            if (view === 'feed') handleNavigateToFeed();
            else if (view === 'resonance-field') handleNavigateToResonanceField();
            else if (view === 'profile') handleReturnToOwnProfile();
          }}
          currentUser={nexusData.currentUser}
          onProfileClick={handleProfileClick}
        />
        
        {/* Profile Content */}
        <div className="grid overflow-hidden" style={{ gridTemplateColumns: '1fr' }}>
          <ProfileView 
            user={profileUser}
            userPosts={nexusData.getUserPosts()}
            onPostClick={handleOpenPost}
            onUserClick={handleUserClick}
            onResonate={nexusData.resonateWithEntry}
            onAmplify={nexusData.amplifyEntry}
            onBranch={nexusData.createBranch}
            onDeepDive={handleDeepDive}
            hasUserResonated={nexusData.hasUserResonated}
            hasUserAmplified={nexusData.hasUserAmplified}
            onLogout={nexusData.logout}
            onUpdateProfile={nexusData.updateUserProfile}
            isOwnProfile={nexusData.profileViewState.mode === 'self'}
            followUser={nexusData.followUser}
            unfollowUser={nexusData.unfollowUser}
            isFollowing={nexusData.isFollowing}
            currentUserId={nexusData.currentUser?.id}
            getFollowers={nexusData.getFollowers}
            getFollowing={nexusData.getFollowing}
            onReturnToOwnProfile={handleReturnToOwnProfile}
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
