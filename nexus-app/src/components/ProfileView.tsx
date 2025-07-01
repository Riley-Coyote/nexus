'use client';

import React, { useState } from 'react';
import { User, StreamEntry } from '@/lib/types';
import PostDisplay from './PostDisplay';
import { streamEntryToPost, getPostContext, getDisplayMode } from '@/lib/utils/postUtils';

interface ProfileViewProps {
  user: User;
  userPosts: StreamEntry[];
  onPostClick: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  onResonate?: (entryId: string) => Promise<void>;
  onAmplify?: (entryId: string) => Promise<void>;
  hasUserResonated: (entryId: string) => boolean;
  hasUserAmplified: (entryId: string) => boolean;
  onLogout?: () => void;
  onUpdateProfile?: (updates: Partial<User>) => Promise<void>;
  isOwnProfile?: boolean;
  followUser?: (userId: string) => Promise<void>;
  unfollowUser?: (userId: string) => Promise<void>;
  isFollowing?: (userId: string) => boolean;
  onReturnToOwnProfile?: () => void;
}

export default function ProfileView({ 
  user, 
  userPosts, 
  onPostClick, 
  onUserClick,
  onResonate, 
  onAmplify, 
  hasUserResonated, 
  hasUserAmplified,
  onLogout,
  onUpdateProfile,
  isOwnProfile = true,
  followUser,
  unfollowUser,
  isFollowing: checkIsFollowing,
  onReturnToOwnProfile
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'resonance' | 'connections'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [isFollowing, setIsFollowing] = useState(checkIsFollowing ? checkIsFollowing(user.id) : false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveProfile = async () => {
    if (!onUpdateProfile) return;
    
    setIsUpdating(true);
    try {
      await onUpdateProfile(editedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!followUser || !unfollowUser) return;
    
    setIsUpdating(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.id);
        setIsFollowing(false);
      } else {
        await followUser(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((streamEntry) => {
                // Convert StreamEntry to Post format
                const post = streamEntryToPost(streamEntry);
                const context = getPostContext(post);
                const displayMode = getDisplayMode('profile', post.content.length, !!post.parentId);
                
                return (
                  <PostDisplay
                    key={post.id}
                    post={post}
                    context={context}
                    displayMode={displayMode}
                    onPostClick={(post) => onPostClick(streamEntry)} // Pass original StreamEntry to maintain compatibility
                    onUserClick={onUserClick}
                    onResonate={onResonate}
                    onAmplify={onAmplify}
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
        return (
          <div className="text-center py-8 text-gray-400">
            <p>Resonance field coming soon</p>
          </div>
        );
      case 'connections':
        return (
          <div className="text-center py-8 text-gray-400">
            <p>Connections coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start gap-6">
          <img 
            src={user.profileImage || user.avatar} 
            alt={user.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.name}
                    onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                    className="text-2xl font-light bg-transparent border-b border-white/20 focus:border-white/50 outline-none text-text-primary"
                  />
                ) : (
                  <h1 className="text-2xl font-light text-text-primary">{user.name}</h1>
                )}
                <p className="text-text-secondary">@{user.username}</p>
                {user.location && (
                  <p className="text-sm text-text-tertiary">{user.location}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!isOwnProfile && onReturnToOwnProfile && (
                  <button 
                    onClick={onReturnToOwnProfile}
                    className="px-4 py-2 text-sm bg-white/5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                  >
                    Back to My Profile
                  </button>
                )}
                {!isOwnProfile && followUser && unfollowUser ? (
                  <button 
                    onClick={handleFollowToggle}
                    disabled={isUpdating}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      isFollowing 
                        ? 'bg-white/10 text-text-secondary hover:text-text-primary' 
                        : 'bg-current-accent text-deep-void hover:opacity-90'
                    }`}
                  >
                    {isUpdating ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                ) : isOwnProfile ? (
                  <>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveProfile}
                          disabled={isUpdating}
                          className="px-4 py-2 text-sm bg-current-accent text-deep-void rounded-lg hover:opacity-90 transition-opacity"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditing(false);
                            setEditedUser(user);
                          }}
                          className="px-4 py-2 text-sm bg-white/5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm bg-white/5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                    {onLogout && (
                      <button 
                        onClick={onLogout}
                        className="px-4 py-2 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            
            {isEditing ? (
              <textarea
                value={editedUser.bio || ''}
                onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                placeholder="Add a bio..."
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-quaternary resize-none"
                rows={3}
              />
            ) : (
              <p className="text-text-tertiary mb-4">{user.bio || 'No bio available'}</p>
            )}
            
            <div className="flex gap-6 text-sm text-text-quaternary">
              <span>{user.stats.entries} entries</span>
              <span>{user.stats.dreams} dreams</span>
              <span>{user.stats.connections} connections</span>
              {user.followerCount !== undefined && (
                <>
                  <span>{user.followerCount} followers</span>
                  <span>{user.followingCount} following</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        {(['posts', 'resonance', 'connections'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white/10 text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-panel rounded-xl p-6">
        {renderTabContent()}
      </div>
    </div>
  );
} 