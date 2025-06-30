'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import ProfileView from '@/components/ProfileView';
import PostOverlay from '@/components/PostOverlay';
import UserProfile from '@/components/UserProfile';
import AuthPanel from '@/components/AuthPanel';
import { StreamEntry } from '@/lib/types';
import { StreamEntryData } from '@/components/StreamEntry';
import { useNexusData } from '@/hooks/useNexusData';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const nexusData = useNexusData();
  
  // Post overlay state
  const [overlayPost, setOverlayPost] = useState<StreamEntry | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load the user profile when the component mounts or username changes
  useEffect(() => {
    if (username && nexusData.authState.isAuthenticated) {
      nexusData.viewUserProfile(username).catch((error) => {
        console.error('Failed to load user profile:', error);
        // Redirect to 404 or show error message
        router.push('/profile');
      });
    }
  }, [username, nexusData.authState.isAuthenticated]);

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

  const handleAuthSuccess = () => {
    nexusData.forceAuthRefresh();
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
    router.push('/profile');
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

  const handleNavigateToFeed = () => {
    router.push('/');
  };

  const handleNavigateToResonanceField = () => {
    router.push('/resonance-field');
  };

  const handleReturnToOwnProfile = () => {
    router.push('/profile');
  };

  const handleModeChange = (mode: 'logbook' | 'dream') => {
    // Navigate back to home page with the selected mode
    router.push(`/?mode=${mode}`);
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

  // Show loading state while data is being fetched
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Profile...</div>
        </div>
      </div>
    );
  }

  // Get the profile user (either the viewed user or current user)
  const profileUser = nexusData.getCurrentProfileUser();
  
  if (!profileUser) {
    return (
      <div className="liminal-logbook">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="liminal-logbook">
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode="logbook"
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
            hasUserResonated={nexusData.hasUserResonated}
            hasUserAmplified={nexusData.hasUserAmplified}
            onLogout={nexusData.logout}
            onUpdateProfile={nexusData.updateUserProfile}
            isOwnProfile={nexusData.profileViewState.mode === 'self'}
            followUser={nexusData.followUser}
            unfollowUser={nexusData.unfollowUser}
            isFollowing={nexusData.isFollowing}
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