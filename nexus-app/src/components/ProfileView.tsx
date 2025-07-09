'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, StreamEntry, Post } from '@/lib/types';
import PostList from './PostList';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { StreamEntryWithUserStates } from '@/lib/database/types';
import { DatabaseFactory } from '@/lib/database/factory';
import { useAuth } from '@/lib/auth/AuthContext';
// @ts-ignore
import FollowsModal from './FollowsModal';
import NotificationBanner from './NotificationBanner';
import ImageUpload from './ImageUpload';

interface ProfileViewProps {
  user: User;
  userPosts?: StreamEntry[]; // Make optional since we'll fetch directly
  onPostClick: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onResonate: (postId: string) => Promise<void>;
  onAmplify: (postId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onDeepDive?: (username: string, postId: string) => void;
  onShare?: (id: string) => void;
  hasUserResonated?: (postId: string) => boolean; // Make optional since we'll use PostList's built-in logic
  hasUserAmplified?: (postId: string) => boolean; // Make optional since we'll use PostList's built-in logic
  onLogout: () => void;
  onUpdateProfile: (updates: { name?: string; bio?: string; location?: string; profileImage?: string; bannerImage?: string }) => Promise<void>;
  isOwnProfile?: boolean;
  followUser?: (userId: string) => Promise<boolean>;
  unfollowUser?: (userId: string) => Promise<boolean>;
  isFollowing?: (userId: string) => Promise<boolean>;
  onReturnToOwnProfile?: () => void;
  currentUserId?: string;
  getFollowers?: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
  getFollowing?: (userId: string, limit?: number, offset?: number) => Promise<any[]>;
}

type ProfileTab = 'posts' | 'resonance' | 'media' | 'hypothesis';

const PAGE_SIZE = 20;

export default function ProfileView({ 
  user, 
  userPosts, // Keep for backward compatibility but don't use it
  onPostClick, 
  onUserClick,
  onResonate, 
  onAmplify, 
  onBranch,
  onDeepDive,
  onShare,
  hasUserResonated, // Keep for backward compatibility but don't use it
  hasUserAmplified, // Keep for backward compatibility but don't use it
  onLogout,
  onUpdateProfile,
  isOwnProfile = true,
  followUser,
  unfollowUser,
  isFollowing: checkIsFollowing,
  onReturnToOwnProfile,
  currentUserId,
  getFollowers,
  getFollowing,
}: ProfileViewProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [editedBio, setEditedBio] = useState(user.bio || '');
  const [editedLocation, setEditedLocation] = useState(user.location || '');
  const [editedProfileImage, setEditedProfileImage] = useState(user.profileImage || '');
  const [editedBannerImage, setEditedBannerImage] = useState(user.bannerImage || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [followingState, setFollowingState] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);

  // Follows modal state
  const [followsModalType, setFollowsModalType] = useState<'followers' | 'following' | null>(null);
  const [followsList, setFollowsList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0
  });

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showProfileImageUpload, setShowProfileImageUpload] = useState(false);

  // OPTIMIZED: PostList state (same pattern as ResonanceField)
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isUserStatesLoaded, setIsUserStatesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Character limits similar to X (Twitter)
  const NAME_MAX_LENGTH = 50;
  const BIO_MAX_LENGTH = 160;
  const LOCATION_MAX_LENGTH = 30;

  // Convert StreamEntryWithUserStates to Post format (same as ResonanceField)
  const streamEntryWithUserStatesToPost = (entry: StreamEntryWithUserStates): Post => {
    const basePost = streamEntryToPost(entry);
    
    // Add user interaction states from the database query
    return {
      ...basePost,
      interactions: {
        resonances: entry.resonance_count || 0,
        branches: entry.branch_count || 0,
        amplifications: entry.amplification_count || 0,
        shares: entry.share_count || 0
      },
      // Store user interaction states for use by PostList
      userInteractionStates: {
        hasResonated: entry.has_resonated || false,
        hasAmplified: entry.has_amplified || false
      }
    };
  };

  // OPTIMIZED: Load profile entries using the new get_entries_with_user_states function
  const loadProfileEntries = async (requestedPage: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const offset = (requestedPage - 1) * PAGE_SIZE;
      
      console.log(`📡 Loading profile entries for user ${user.id} (page ${requestedPage}) with optimized single query...`);
      
      // Use the optimized database function that gets entries with user states in a single query
      const database = DatabaseFactory.getInstance();
      
      // Profile entries: get all posts by the profile user
      const entriesWithUserStates = await database.getProfileEntries?.(user.id, {
        targetUserId: currentUser?.id, // For checking user interaction states
        includePrivate: isOwnProfile, // Include private posts only for own profile
        offset,
        limit: PAGE_SIZE,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      
      if (!entriesWithUserStates) {
        console.warn('⚠️ getProfileEntries not available, showing empty profile');
        setHasMore(false);
        setIsUserStatesLoaded(true);
        return;
      }
      
      // Convert StreamEntryWithUserStates to Post format
      const convertedPosts = entriesWithUserStates.map((entry: StreamEntryWithUserStates) => 
        streamEntryWithUserStatesToPost(entry)
      );
      
      if (append) {
        setPosts(prevPosts => [...prevPosts, ...convertedPosts]);
      } else {
        setPosts(convertedPosts);
      }
      
      setHasMore(convertedPosts.length === PAGE_SIZE);
      setPage(requestedPage);
      setIsUserStatesLoaded(true);
      
      console.log(`✅ OPTIMIZED: Loaded ${convertedPosts.length} profile entries with user states in single query`);
      
    } catch (error) {
      console.error('❌ Error loading optimized profile entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile entries');
      setHasMore(false);
      setIsUserStatesLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (activeTab === 'posts') {
      loadProfileEntries(1, false);
    }
  }, []);

  // Reload when user or profile settings change
  useEffect(() => {
    if (activeTab === 'posts') {
      console.log('🔄 User or profile settings changed, reloading profile data');
      loadProfileEntries(1, false);
    }
  }, [user.id, isOwnProfile]);

  // Auth state management - reload when user changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // User just became authenticated - reload profile data if needed
      if (activeTab === 'posts' && !isUserStatesLoaded && !isLoading) {
        console.log('🔄 Auth completed, reloading profile data');
        loadProfileEntries(1, false);
      }
    }
  }, [isAuthenticated, currentUser, isUserStatesLoaded, activeTab]);

  // Load more entries for pagination
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    await loadProfileEntries(nextPage, true);
    setPage(nextPage);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isLoading) return;
    console.log('🔄 Manual refresh requested for profile');
    setPage(1);
    await loadProfileEntries(1, false);
  };

  // Branch refresh - reload data after branch creation
  const profileBranchRefresh = async () => {
    console.log('✅ Branch created - refreshing profile');
    await loadProfileEntries(1, false);
    setPage(1);
  };

  const handleBranch = React.useMemo(() => {
    return onBranch ? async (parentId: string, content: string) => {
      await onBranch(parentId, content);
      await profileBranchRefresh();
    } : undefined;
  }, [onBranch]);

  // Optimized user interaction state checks - use the data from the database query
  const hasUserResonatedOptimized = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasResonated || false;
  }, [posts]);

  const hasUserAmplifiedOptimized = React.useCallback((entryId: string) => {
    const post = posts.find(p => p.id === entryId);
    return post?.userInteractionStates?.hasAmplified || false;
  }, [posts]);

  // Enhanced interaction handlers that refresh data
  const handleResonate = React.useCallback(async (entryId: string) => {
    if (onResonate) {
      await onResonate(entryId);
      // Refresh profile posts to get updated interaction states
      await loadProfileEntries(1, false);
      setPage(1);
    }
  }, [onResonate]);

  const handleAmplify = React.useCallback(async (entryId: string) => {
    if (onAmplify) {
      await onAmplify(entryId);
      // Refresh profile posts to get updated interaction states
      await loadProfileEntries(1, false);
      setPage(1);
    }
  }, [onAmplify]);

  const handleDeepDive = (post: Post) => {
    onDeepDive?.(post.username, post.id);
  };

  useEffect(() => {
    setEditedName(user.name);
    setEditedBio(user.bio || '');
    setEditedLocation(user.location || '');
    setEditedProfileImage(user.profileImage || '');
    setEditedBannerImage(user.bannerImage || '');
    setStats({ followerCount: user.followerCount ?? 0, followingCount: user.followingCount ?? 0 });
    setValidationError(null);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveProfile = async () => {
    // Trim inputs to remove leading / trailing whitespace
    const name = editedName.trim();
    const bio = editedBio.trim();
    const location = editedLocation.trim();

    // Basic validations
    if (name.length === 0) {
      setValidationError('Name cannot be empty.');
      return;
    }
    if (name.length > NAME_MAX_LENGTH) {
      setValidationError(`Name is too long (max ${NAME_MAX_LENGTH} characters).`);
      return;
    }
    if (bio.length > BIO_MAX_LENGTH) {
      setValidationError(`Bio is too long (max ${BIO_MAX_LENGTH} characters).`);
      return;
    }
    if (location.length > LOCATION_MAX_LENGTH) {
      setValidationError(`Location is too long (max ${LOCATION_MAX_LENGTH} characters).`);
      return;
    }

    // Validate image URLs
    const profileImageUrl = editedProfileImage.trim();
    const bannerImageUrl = editedBannerImage.trim();
    
    if (profileImageUrl && !isValidImageUrl(profileImageUrl)) {
      setValidationError('Profile image URL is not valid. Please upload a new image.');
      return;
    }
    
    if (bannerImageUrl && !isValidImageUrl(bannerImageUrl)) {
      setValidationError('Banner image URL is not valid. Please upload a new image.');
      return;
    }

    try {
      // Create a clean update object with validated data
      const updates: { name?: string; bio?: string; location?: string; profileImage?: string; bannerImage?: string } = {
        name,
        bio,
        location
      };
      
      // Only include image URLs if they are valid
      if (profileImageUrl) {
        updates.profileImage = profileImageUrl;
      }
      if (bannerImageUrl) {
        updates.bannerImage = bannerImageUrl;
      }
      
      await onUpdateProfile(updates);
      setIsEditing(false);
      setValidationError(null);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      // If backend returned a message use it, else generic
      setValidationError(error?.message || 'Failed to update profile.');
    }
  };

  // Helper function to validate image URLs
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid (no image)
    
    try {
      // Check basic URL format
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
      }
      
      // Try to create URL object to validate format
      new URL(url);
      
      // Check if it's not corrupted data like "[object Object]"
      if (url.includes('[object') || url.includes('undefined') || url.includes('null')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user.name);
    setEditedBio(user.bio || '');
    setEditedLocation(user.location || '');
    setEditedProfileImage(user.profileImage || '');
    setEditedBannerImage(user.bannerImage || '');
    setValidationError(null);
    setIsEditing(false);
  };

  // Load following state when component mounts
  useEffect(() => {
    if (!isOwnProfile && checkIsFollowing && currentUserId) {
      const loadFollowingState = async () => {
        try {
          const following = await checkIsFollowing(user.id);
          setFollowingState(following);
        } catch (error) {
          console.error('Error checking following state:', error);
        }
      };
      loadFollowingState();
    }
  }, [isOwnProfile, user.id, checkIsFollowing, currentUserId]);

  const handleFollowToggle = async () => {
    if (isFollowLoading || !followUser || !unfollowUser) return;
    
    setIsFollowLoading(true);
    try {
      let success = false;
      if (followingState) {
        success = await unfollowUser(user.id);
      } else {
        success = await followUser(user.id);
      }
      
      if (success) {
        setFollowingState(!followingState);
        // Update local stats
        setStats(prev => ({
          ...prev,
          followerCount: followingState ? prev.followerCount - 1 : prev.followerCount + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling follow state:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const openFollowersModal = async () => {
    if (!getFollowers) return;
    try {
      const followers = await getFollowers(user.id, 100, 0);
      setFollowsList(followers);
      setFollowsModalType('followers');
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const openFollowingModal = async () => {
    if (!getFollowing) return;
    try {
      const following = await getFollowing(user.id, 100, 0);
      setFollowsList(following);
      setFollowsModalType('following');
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  const closeFollowsModal = () => {
    setFollowsModalType(null);
    setFollowsList([]);
  };

  const refreshFollowerCount = async () => {
    // This would need to be implemented to refresh follower count
    // For now, we'll just refetch the user data
    console.log('Refreshing follower count...');
    try {
      // You could implement a method to refresh user stats here
      // For example: const updatedUser = await getUserById(user.id);
    } catch (error) {
      console.error('Error refreshing follower count:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        // Following social media playbook - don't render posts until user interaction states are loaded
        if (!isUserStatesLoaded) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                <p className="text-text-tertiary text-sm">Loading posts with user interaction states...</p>
              </div>
            </div>
          );
        }

        // Error State
        if (error) {
          return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          );
        }

        // Use PostList component for consistent rendering
        return (
          <PostList
            posts={posts}
            context="profile"
            displayMode="preview"
            showInteractions={true}
            showBranching={true}
            enablePagination={true}
            pageSize={PAGE_SIZE}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
            onPostClick={onPostClick}
            onResonate={handleResonate}
            onAmplify={handleAmplify}
            onBranch={handleBranch}
            onShare={onShare}
            onDeepDive={handleDeepDive}
            hasUserResonated={hasUserResonatedOptimized}
            hasUserAmplified={hasUserAmplifiedOptimized}
          />
        );
      case 'resonance':
        return <div className="text-center py-8 text-gray-400"><p>Resonance field coming soon</p></div>;
      case 'media':
        return <div className="text-center py-8 text-gray-400"><p>Uploaded media coming soon</p></div>;
      case 'hypothesis':
        return <div className="text-center py-8 text-gray-400"><p>Hypothesis coming soon</p></div>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-deep-void">
      {/* Error banner */}
      <NotificationBanner
        show={!!validationError}
        onClose={() => setValidationError(null)}
        title={validationError || ''}
        variant="error"
        autoHide={false}
      />
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        {/* Banner Image */}
        <div className="flex-shrink-0 relative">
          <div className="h-48 w-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border-b border-white/10 overflow-hidden">
            {(isEditing ? editedBannerImage : user.bannerImage) ? (
              <img 
                src={isEditing ? editedBannerImage : user.bannerImage} 
                alt={`${user.name}'s banner`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl opacity-20">◉</div>
              </div>
            )}
            
            {/* Banner Edit Overlay */}
            {isEditing && isOwnProfile && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-100">Update Banner Image</h4>
                    <p className="text-sm text-gray-400 mt-1">Upload a new banner photo</p>
                  </div>
                  <ImageUpload
                    currentImageUrl={editedBannerImage}
                    onUpload={(url) => setEditedBannerImage(url)}
                    onError={(error) => setValidationError(error)}
                    type="banner"
                    userId={user.id}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Image - overlapping banner */}
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border-4 border-deep-void flex items-center justify-center text-2xl font-medium text-gray-100 flex-shrink-0 relative">
              {(isEditing ? editedProfileImage : user.profileImage) ? (
                <img src={isEditing ? editedProfileImage : user.profileImage} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : user.avatar}
              
              {/* Profile Image Edit Overlay */}
              {isEditing && isOwnProfile && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <button
                    onClick={() => setShowProfileImageUpload(true)}
                    className="text-white text-xs hover:text-emerald-400 transition-colors"
                    title="Edit profile image"
                  >
                    📷
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-shrink-0 p-8 pt-16 border-b border-white/10">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-medium text-text-primary bg-transparent border border-white/20 rounded px-2 py-1 focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <h1 className="text-2xl font-medium text-text-primary">{user.name}</h1>
                )}
                {isOwnProfile ? (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <><button onClick={handleSaveProfile} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-sm text-emerald-400 transition-colors">Save</button><button onClick={handleCancelEdit} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 transition-colors">Cancel</button></>
                    ) : null}
                    <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-gray-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                      </button>
                      {showDropdown && !isEditing && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-10">
                          <button onClick={() => { setIsEditing(true); setShowDropdown(false); }} className="w-full px-4 py-3 text-left text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2 rounded-lg">Edit profile</button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleFollowToggle} disabled={isFollowLoading} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${followingState ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400'} ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}> {isFollowLoading ? 'Loading...' : followingState ? 'Unfollow' : followsYou ? 'Follow back' : 'Follow'} </button>
                )}
              </div>
              <p className="text-gray-400 mb-1">@{user.username}</p>
              {isEditing ? (
                <textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)} className="w-full text-gray-300 bg-transparent border border-white/20 rounded px-2 py-2 mb-4 focus:outline-none focus:border-emerald-400 resize-none" rows={3} />
              ) : (
                <p className="text-gray-300 mb-4">{editedBio || (isOwnProfile ? 'New to the Nexus. Add a bio to tell others about yourself.' : 'No bio available.')}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="bg-transparent border border-white/20 rounded px-1 focus:outline-none focus:border-emerald-400"
                    />
                  ) : (
                    editedLocation || (isOwnProfile ? 'Add your location' : 'Location not specified')
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={openFollowingModal}
                  disabled={!getFollowing}
                  className="text-text-primary hover:underline disabled:opacity-50 disabled:cursor-default"
                >
                  <span className="font-semibold">{stats.followingCount.toLocaleString()}</span>{' '}
                  <span className="text-gray-400">Following</span>
                </button>
                <button
                  onClick={openFollowersModal}
                  disabled={!getFollowers}
                  className="text-text-primary hover:underline disabled:opacity-50 disabled:cursor-default"
                >
                  <span className="font-semibold">{stats.followerCount.toLocaleString()}</span>{' '}
                  <span className="text-gray-400">Followers</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 border-b border-white/10">
          <nav className="flex justify-center px-8">
            {[
              { id: 'posts', label: 'Public posts' },
              { id: 'resonance', label: 'Resonance field' },
              { id: 'media', label: 'Uploaded media' },
              { id: 'hypothesis', label: 'Hypothesis' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`py-4 px-6 text-sm transition-colors duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1"><div className="p-8">{renderTabContent()}</div></div>

        {/* Follows Modal */}
        <FollowsModal
          title={followsModalType === 'following' ? 'Following' : 'Followers'}
          follows={followsList}
          isOpen={followsModalType !== null}
          onClose={closeFollowsModal}
          onUserClick={onUserClick}
        />
      </div>

      {/* Profile Image Upload Modal */}
      {showProfileImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-100">Update Profile Image</h3>
                <p className="text-sm text-gray-400 mt-1">Upload a new profile photo</p>
              </div>
              <button
                onClick={() => setShowProfileImageUpload(false)}
                className="p-2 text-gray-400 hover:text-gray-300 rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ImageUpload
              currentImageUrl={editedProfileImage}
              onUpload={(url) => {
                setEditedProfileImage(url);
                setShowProfileImageUpload(false);
              }}
              onError={(error) => setValidationError(error)}
              type="profile"
              userId={user.id}
            />
          </div>
        </div>
      )}
    </div>
  );
} 