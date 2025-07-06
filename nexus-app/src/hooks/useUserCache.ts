import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/types';

interface UserCacheData {
  id: string;
  username: string;
  name: string;
  profileImage?: string;
  avatar: string;
}

interface UserCacheEntry {
  data: UserCacheData;
  timestamp: number;
}

// Global cache for user data
const userCache = new Map<string, UserCacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useUserCache() {
  const [cachedUsers, setCachedUsers] = useState<Map<string, UserCacheData>>(new Map());
  const cacheSubscribers = useRef<Set<() => void>>(new Set());

  // Subscribe to cache updates
  useEffect(() => {
    const updateCallback = () => {
      const currentData = new Map();
      userCache.forEach((entry, key) => {
        if (Date.now() - entry.timestamp < CACHE_DURATION) {
          currentData.set(key, entry.data);
        }
      });
      setCachedUsers(currentData);
    };

    cacheSubscribers.current.add(updateCallback);
    updateCallback(); // Initial load

    return () => {
      cacheSubscribers.current.delete(updateCallback);
    };
  }, []);

  const getUserData = (userId: string): UserCacheData | null => {
    const entry = userCache.get(userId);
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      userCache.delete(userId);
      notifySubscribers();
      return null;
    }
    
    return entry.data;
  };

  const setUserData = (userId: string, userData: UserCacheData) => {
    userCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
    notifySubscribers();
  };

  const setUserFromFullUser = (user: User) => {
    const userData: UserCacheData = {
      id: user.id,
      username: user.username,
      name: user.name,
      profileImage: user.profileImage,
      avatar: user.avatar
    };
    setUserData(user.id, userData);
  };

  const notifySubscribers = () => {
    cacheSubscribers.current.forEach(callback => callback());
  };

  const preloadUsers = (userIds: string[]) => {
    // This could be enhanced to batch-fetch missing users from the database
    // For now, it just returns the current cache state
    const missing = userIds.filter(id => !getUserData(id));
    if (missing.length > 0) {
      // TODO: Implement batch user fetching here
      console.log('Missing user data for:', missing);
    }
  };

  const clearExpiredCache = () => {
    const now = Date.now();
    userCache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_DURATION) {
        userCache.delete(key);
      }
    });
    notifySubscribers();
  };

  return {
    getUserData,
    setUserData,
    setUserFromFullUser,
    preloadUsers,
    clearExpiredCache,
    cachedUsers
  };
} 