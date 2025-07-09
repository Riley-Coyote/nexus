'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@/lib/types';

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, userData?: { name?: string; username?: string }) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// =============================================================================
// SUPABASE CLIENT (SINGLETON)
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Automatic token refresh handled by Supabase
  },
});

// =============================================================================
// SESSION CACHE MANAGEMENT
// =============================================================================

interface CachedSession {
  user: User;
  expiresAt: number;
  accessToken: string;
}

const CACHE_KEY = 'nexus_session';
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes (refresh before 1hr expiry)

class SessionCache {
  static get(): CachedSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const session: CachedSession = JSON.parse(cached);
      
      // Validate session structure
      if (!session.user || !session.accessToken || !session.expiresAt) {
        console.warn('⚠️ SessionCache: Invalid session structure, clearing cache');
        this.clear();
        return null;
      }
      
      // Check if expired
      if (Date.now() > session.expiresAt) {
        console.log('ℹ️ SessionCache: Session expired, clearing cache');
        this.clear();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('❌ SessionCache: Error reading cache:', error);
      this.clear();
      return null;
    }
  }
  
  static set(user: User, accessToken: string): void {
    if (typeof window === 'undefined') return;
    
    const session: CachedSession = {
      user,
      expiresAt: Date.now() + CACHE_DURATION,
      accessToken,
    };
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(session));
      console.log('✅ SessionCache: Session cached for user:', user.username);
    } catch (error) {
      console.warn('⚠️ SessionCache: Failed to cache session:', error);
    }
  }
  
  static clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('✅ SessionCache: Cache cleared');
    } catch (error) {
      console.warn('⚠️ SessionCache: Failed to clear cache:', error);
    }
  }

  static clearAllAuthData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear all auth-related localStorage entries
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('nexus') ||
        key.includes('session')
      );
      
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to remove key:', key);
        }
      });
      
      console.log('✅ SessionCache: All auth data cleared');
    } catch (error) {
      console.error('❌ SessionCache: Failed to clear all auth data:', error);
    }
  }
}

// =============================================================================
// USER PROFILE HELPERS
// =============================================================================

async function fetchUserProfile(supabaseUser: any): Promise<User> {
  try {
    console.log('🔄 AuthContext: Fetching user profile for:', supabaseUser.email);

    // Add timeout to the database query
    const profileQueryPromise = supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile query timeout')), 8000); // 8 second timeout
    });

    const { data: profile, error } = await Promise.race([profileQueryPromise, timeoutPromise]);

    if (profile && !error) {
      console.log('✅ AuthContext: Successfully fetched profile for:', profile.username);
      return {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        name: profile.name || profile.username,
        userType: profile.user_type || 'human',
        role: profile.role || 'Explorer',
        avatar: profile.avatar || profile.username?.slice(0, 2).toUpperCase() || 'US',
        bio: profile.bio || '',
        location: profile.location || '',
        profileImage: profile.profile_image_url,
        bannerImage: profile.banner_image_url,
        stats: {
          entries: profile.entry_count || 0,
          dreams: profile.dream_count || 0,
          connections: profile.connection_count || 0,
        },
        followerCount: profile.follower_count || 0,
        followingCount: profile.following_count || 0,
        createdAt: profile.created_at,
      };
    }

    console.log('⚠️ AuthContext: No profile found, using fallback user');
    // Fallback user if profile doesn't exist
    return {
      id: supabaseUser.id,
      username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || 'User',
      userType: 'human',
      role: 'Explorer',
      avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
      bio: '',
      location: '',
      stats: { entries: 0, dreams: 0, connections: 0 },
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ AuthContext: Error fetching user profile:', error);
    
    // If it's a timeout or network error, still return a fallback user
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('network'))) {
      console.log('⚠️ AuthContext: Using fallback user due to timeout/network error');
      return {
        id: supabaseUser.id,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || 'User',
        userType: 'human',
        role: 'Explorer',
        avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
        bio: '',
        location: '',
        stats: { entries: 0, dreams: 0, connections: 0 },
        createdAt: new Date().toISOString(),
      };
    }
    
    throw error;
  }
}

// =============================================================================
// AUTH CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  // Ref to track if we're in the middle of initialization
  const initializingRef = useRef(false);

  // =============================================================================
  // INITIALIZE AUTHENTICATION
  // =============================================================================

  const initializeAuth = useCallback(async () => {
    console.log('🔄 AuthContext: Starting initialization...');
    
    try {
      // Step 1: Check cache first (fast path)
      const cachedSession = SessionCache.get();
      if (cachedSession) {
        console.log('✅ AuthContext: Using cached session for user:', cachedSession.user.username);
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: cachedSession.user,
          error: null,
        });
        return;
      }

      console.log('🔄 AuthContext: No valid cache, checking Supabase session...');

      // Step 2: Check Supabase session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 8000); // Reduced to 8 seconds
      });

      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        console.error('❌ AuthContext: Session check error:', error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: error.message,
        });
        return;
      }

      if (session?.user) {
        console.log('✅ AuthContext: Found Supabase session for user:', session.user.email);
        try {
          // Add timeout wrapper for the entire profile fetch operation
          const profilePromise = fetchUserProfile(session.user);
          const profileTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch operation timeout')), 10000);
          });

          const user = await Promise.race([profilePromise, profileTimeoutPromise]);
          SessionCache.set(user, session.access_token);
          
          console.log('✅ AuthContext: Successfully loaded user profile:', user.username);
          setState({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
          });
        } catch (profileError) {
          console.error('❌ AuthContext: Failed to fetch user profile:', profileError);
          
          // Create a more robust fallback user
          const fallbackUser: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'User',
            userType: 'human',
            role: 'Explorer',
            avatar: (session.user.email?.slice(0, 2) || 'US').toUpperCase(),
            bio: '',
            location: '',
            stats: { entries: 0, dreams: 0, connections: 0 },
            createdAt: new Date().toISOString(),
          };
          
          console.log('⚠️ AuthContext: Using fallback user due to profile fetch error');
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: fallbackUser,
            error: null, // Don't show error to user since we have a fallback
          });
        }
      } else {
        console.log('ℹ️ AuthContext: No Supabase session found');
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('❌ AuthContext: Initialization failed:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }, []);

  // =============================================================================
  // AUTH ACTIONS
  // =============================================================================

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { success: false, error: 'Please verify your email before signing in' };
      }

      // Auth state will be updated by the listener
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    userData?: { name?: string; username?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, needsVerification: true };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign up failed' 
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      SessionCache.clear();
      
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 AuthContext: Force refresh requested');
    
    // Clear all potentially corrupted auth data
    SessionCache.clearAllAuthData();
    
    // Also clear Supabase auth state
    try {
      await supabase.auth.signOut();
      console.log('✅ AuthContext: Supabase auth cleared');
    } catch (error) {
      console.warn('⚠️ AuthContext: Failed to clear Supabase auth:', error);
    }
    
    // Reset state to loading
    setState({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      error: null,
    });
    
    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Re-initialize
    try {
      await initializeAuth();
    } catch (error) {
      console.error('❌ AuthContext: Refresh failed:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: 'Failed to refresh authentication',
      });
    }
  }, [initializeAuth]);

  // =============================================================================
  // SETUP AUTH STATE LISTENER
  // =============================================================================

  useEffect(() => {
    console.log('🔄 AuthContext: Setting up auth state listener...');
    
    // Failsafe timeout - never let loading state persist indefinitely
    const failsafeTimeout = setTimeout(() => {
      console.warn('⚠️ AuthContext: Failsafe timeout triggered - forcing loading to false');
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: prev.error || 'Authentication took too long. Please check your connection and try refreshing.' 
      }));
      initializingRef.current = false;
    }, 12000); // Reduced to 12 second timeout

    // Initialize auth on mount
    if (!initializingRef.current) {
      initializingRef.current = true;
      initializeAuth()
        .catch((error) => {
          console.error('❌ AuthContext: Initialization failed completely:', error);
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: 'Authentication failed to initialize',
          });
        })
        .finally(() => {
          initializingRef.current = false;
          clearTimeout(failsafeTimeout);
        });
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth event received:', event);

        // Don't process events during initialization to avoid conflicts
        if (initializingRef.current) {
          console.log('⏳ AuthContext: Skipping auth event during initialization');
          return;
        }

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ AuthContext: Processing SIGNED_IN event for:', session.user.email);
            
            try {
              const user = await fetchUserProfile(session.user);
              SessionCache.set(user, session.access_token);
              
              setState({
                isLoading: false,
                isAuthenticated: true,
                user,
                error: null,
              });
              console.log('✅ AuthContext: SIGNED_IN processed successfully');
            } catch (error) {
              console.error('❌ AuthContext: Error processing SIGNED_IN:', error);
              setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: 'Failed to load user profile' 
              }));
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('✅ AuthContext: Processing SIGNED_OUT event');
            SessionCache.clear();
            setState({
              isLoading: false,
              isAuthenticated: false,
              user: null,
              error: null,
            });
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('🔄 AuthContext: Processing TOKEN_REFRESHED event');
            // Update cache with new token
            if (state.user) {
              SessionCache.set(state.user, session.access_token);
            }
          }
        } catch (error) {
          console.error('❌ AuthContext: Auth event handler error:', error);
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Authentication event failed' 
          }));
        }
      }
    );

    return () => {
      console.log('🔄 AuthContext: Cleaning up auth listener');
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  // =============================================================================
  // PROVIDE CONTEXT
  // =============================================================================

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { supabase };
export type { AuthState, AuthContextType }; 