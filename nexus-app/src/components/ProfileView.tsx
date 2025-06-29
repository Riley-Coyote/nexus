'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, StreamEntry } from '@/lib/types';
import StreamEntryComponent, { StreamEntryData } from './StreamEntry';

interface ProfileViewProps {
  user: User;
  userPosts: StreamEntry[];
  onPostClick: (post: StreamEntry) => void;
  onUserClick?: (username: string) => void;
  onResonate: (postId: string) => Promise<void>;
  onAmplify: (postId: string) => Promise<void>;
  hasUserResonated: (postId: string) => boolean;
  hasUserAmplified: (postId: string) => boolean;
  onLogout: () => void;
  onUpdateProfile: (updates: { name?: string; bio?: string; location?: string }) => Promise<void>;
  isOwnProfile?: boolean;
}

type ProfileTab = 'posts' | 'resonance' | 'media' | 'hypothesis';

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
  isOwnProfile = true
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [editedBio, setEditedBio] = useState(user.bio || '');
  const [editedLocation, setEditedLocation] = useState(user.location || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Follow state for other users' profiles
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Update local state when user prop changes
  useEffect(() => {
    setEditedName(user.name);
    setEditedBio(user.bio || '');
    setEditedLocation(user.location || '');
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveProfile = async () => {
    try {
      await onUpdateProfile({
        name: editedName,
        bio: editedBio,
        location: editedLocation
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user.name);
    setEditedBio(user.bio || '');
    setEditedLocation(user.location || '');
    setIsEditing(false);
  };

  const handleFollowToggle = async () => {
    if (isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      // This would be implemented when follow system is available
      // For now, just toggle the state
      setIsFollowing(!isFollowing);
      
      console.log(`${isFollowing ? 'Unfollowed' : 'Followed'} ${user.username}`);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((post) => {
                // Convert StreamEntry to StreamEntryData format
                const streamEntryData: StreamEntryData = {
                  id: post.id,
                  parentId: post.parentId,
                  depth: post.depth,
                  type: post.type,
                  agent: post.agent,
                  connections: post.connections,
                  metrics: post.metrics,
                  timestamp: post.timestamp,
                  content: post.content,
                  interactions: post.interactions,
                  isAmplified: post.isAmplified,
                  privacy: post.privacy,
                  title: post.title,
                  resonance: post.resonance,
                  coherence: post.coherence,
                  tags: post.tags,
                  response: post.response
                };
                
                return (
                  <StreamEntryComponent
                    key={post.id}
                    entry={streamEntryData}
                    onPostClick={(entry) => onPostClick(post)}
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
      case 'media':
        return (
          <div className="text-center py-8 text-gray-400">
            <p>Uploaded media coming soon</p>
          </div>
        );
      case 'hypothesis':
        return (
          <div className="text-center py-8 text-gray-400">
            <p>Hypothesis coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-deep-void">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        {/* Profile Header */}
        <div className="flex-shrink-0 p-8 border-b border-white/10">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl font-medium text-gray-100 flex-shrink-0">
            {user.profileImage ? (
              <img 
                src={user.profileImage} 
                alt={user.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              user.avatar
            )}
          </div>
          
          {/* User Info */}
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
              
              {/* Profile Actions - only show for own profile */}
              {isOwnProfile && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-sm text-emerald-400 transition-colors"
                      >
                        Save
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      Edit profile
                    </button>
                  )}
                  
                                   {/* Dropdown Menu */}
                   <div className="relative" ref={dropdownRef}>
                     <button
                       onClick={() => setShowDropdown(!showDropdown)}
                       className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-gray-300 transition-colors"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                       </svg>
                     </button>
                     
                     {showDropdown && (
                       <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-10">
                         <button
                           onClick={() => {
                             onLogout();
                             setShowDropdown(false);
                           }}
                           className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 rounded-lg"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                           </svg>
                           Logout
                         </button>
                       </div>
                     )}
                   </div>
                </div>
              )}
              
              {/* Follow button for other users */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400'
                  } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                </button>
              )}
            </div>
            
            <p className="text-gray-400 mb-1">@{user.username}</p>
            
            {isEditing ? (
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full text-gray-300 bg-transparent border border-white/20 rounded px-2 py-2 mb-4 focus:outline-none focus:border-emerald-400 resize-none"
                rows={3}
              />
            ) : (
              <p className="text-gray-300 mb-4">
                {editedBio || (isOwnProfile ? 'New to the Nexus. Add a bio to tell others about yourself.' : 'No bio available.')}
              </p>
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
                Joined December 2024
              </span>
            </div>
            
            {/* Following/Followers */}
            <div className="flex items-center gap-6">
              <span className="text-text-primary">
                <span className="font-semibold">{user.followingCount?.toLocaleString() || '0'}</span>{' '}
                <span className="text-gray-400">Following</span>
              </span>
              <span className="text-text-primary">
                <span className="font-semibold">{user.followerCount?.toLocaleString() || '0'}</span>{' '}
                <span className="text-gray-400">Followers</span>
              </span>
            </div>
          </div>
          </div>
        </div>
        
        {/* Profile Navigation Tabs */}
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
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
} 