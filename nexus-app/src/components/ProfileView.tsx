'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, StreamEntry } from '@/lib/types';
import PostDisplay from './PostDisplay';
import { streamEntryToPost, getPostContext, getDisplayMode } from '@/lib/utils/postUtils';
// @ts-ignore
import FollowsModal from './FollowsModal';
import NotificationBanner from './NotificationBanner';
import ImageUpload from './ImageUpload';

interface ProfileViewProps {
  user: User;
  userPosts: StreamEntry[];
  onPostClick: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  onResonate: (postId: string) => Promise<void>;
  onAmplify: (postId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onDeepDive?: (username: string, postId: string) => void;
  hasUserResonated: (postId: string) => boolean;
  hasUserAmplified: (postId: string) => boolean;
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

export default function ProfileView({ 
  user, 
  userPosts, 
  onPostClick, 
  onUserClick,
  onResonate, 
  onAmplify, 
  onBranch,
  onDeepDive,
  hasUserResonated, 
  hasUserAmplified,
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

  // Character limits similar to X (Twitter)
  const NAME_MAX_LENGTH = 50;
  const BIO_MAX_LENGTH = 160;
  const LOCATION_MAX_LENGTH = 30;

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

    try {
      await onUpdateProfile({ 
        name, 
        bio, 
        location,
        profileImage: editedProfileImage,
        bannerImage: editedBannerImage
      });
      setIsEditing(false);
      setValidationError(null);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      // If backend returned a message use it, else generic
      setValidationError(error?.message || 'Failed to update profile.');
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user.name);
    setEditedBio(user.bio || '');
    setEditedLocation(user.location || '');
    setEditedProfileImage(user.profileImage || '');
    setEditedBannerImage(user.bannerImage || '');
    setIsEditing(false);
    setValidationError(null);
    setShowProfileImageUpload(false);
  };

  useEffect(() => {
    if (!isOwnProfile && checkIsFollowing) {
      checkIsFollowing(user.id)
        .then(setFollowingState)
        .catch(() => setFollowingState(false));
    }
    // Determine if viewed user follows me (for Follow back)
    if (!isOwnProfile && currentUserId && getFollowing) {
      (async () => {
        try {
          const theirFollowing = await getFollowing(user.id, 100, 0);
          setFollowsYou(theirFollowing.some((rel: any) => rel.user.id === currentUserId));
        } catch {/* ignore */}
      })();
    }
  }, [user.id, isOwnProfile, checkIsFollowing, currentUserId, getFollowing]);

  const handleFollowToggle = async () => {
    if (isFollowLoading || !followUser || !unfollowUser) return;
    setIsFollowLoading(true);
    try {
      const success = followingState ? await unfollowUser(user.id) : await followUser(user.id);
      if (success) {
        setFollowingState(!followingState);
        // Update counts locally
        setStats(prev => ({
          ...prev,
          followerCount: prev.followerCount + (followingState ? -1 : 1)
        }));
        refreshFollowerCount();
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const openFollowersModal = async () => {
    if (!getFollowers) return;
    try {
      const list = await getFollowers(user.id, 100, 0);
      setFollowsList(list);
      setFollowsModalType('followers');
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    }
  };

  const openFollowingModal = async () => {
    if (!getFollowing) return;
    try {
      const list = await getFollowing(user.id, 100, 0);
      setFollowsList(list);
      setFollowsModalType('following');
    } catch (error) {
      console.error('Failed to fetch following:', error);
    }
  };

  const closeFollowsModal = () => {
    setFollowsModalType(null);
    setFollowsList([]);
  };

  // Refresh follower count periodically and after follow toggle
  const refreshFollowerCount = async () => {
    if (getFollowers) {
      try {
        const all = await getFollowers(user.id, 1000, 0);
        setStats(s => ({ ...s, followerCount: all.length }));
      } catch {/* ignore */}
    }
  };

  const handleBranch = async (parentId: string, content: string) => {
    if (onBranch) {
      await onBranch(parentId, content);
    }
  };

  const handleDeepDive = (post: any) => {
    onDeepDive?.(post.username, post.id);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((streamEntry) => {
                const post = streamEntryToPost(streamEntry);
                const context = getPostContext(post);
                const displayMode = getDisplayMode('profile', post.content.length, !!post.parentId);
                return (
                  <PostDisplay
                    key={post.id}
                    post={post}
                    context={context}
                    displayMode={displayMode}
                    onPostClick={() => onPostClick(streamEntry)}
                    onUserClick={onUserClick}
                    onResonate={onResonate}
                    onAmplify={onAmplify}
                    onBranch={handleBranch}
                    onDeepDive={handleDeepDive}
                    userHasResonated={hasUserResonated(post.id)}
                    userHasAmplified={hasUserAmplified(post.id)}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No posts yet</p>
              </div>
            )}
          </div>
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