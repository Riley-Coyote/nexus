'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '../lib/services/supabaseAuthService';
import { AuthState, User } from '../lib/types';

export interface AuthHook {
  // Auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, options?: { name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  forceAuthRefresh: () => Promise<void>;
}

/**
 * Focused authentication hook - handles ONLY auth state and actions
 * Extracted from useNexusData to follow single responsibility principle
 */
export const useAuth = (): AuthHook => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthLoading: true,
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  });

  // Auth actions
  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);
      if (result.success) {
        setAuthState(authService.getAuthState());
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, options?: { name?: string }) => {
    try {
      const result = await authService.signUp(email, password, options);
      if (result.success) {
        setAuthState(authService.getAuthState());
      } else {
        throw new Error(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setAuthState(authService.getAuthState());
  }, []);

  const forceAuthRefresh = useCallback(async () => {
    console.log('🔄 Force auth refresh requested');
    
    try {
      // Clear any cached auth data and force re-initialization
      if (typeof window !== 'undefined') {
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('nexus')
        );
        authKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn('Failed to clear key:', key);
          }
        });
      }
      
      // Get fresh auth state (the service will handle re-initialization)
      const freshAuthState = await authService.getAuthStateAsync();
      console.log('🔐 Force auth refresh completed:', {
        isAuthenticated: freshAuthState.isAuthenticated,
        currentUser: freshAuthState.currentUser?.username || 'null'
      });
      
      setAuthState(freshAuthState);
      
    } catch (error) {
      console.error('❌ Force auth refresh failed:', error);
      // Set fallback auth state on error
      setAuthState({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
        sessionToken: null
      });
    }
  }, []);

  // Initialize auth state and set up listener
  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    
    // Get initial auth state
    const initialAuthState = authService.getAuthState();
    setAuthState(initialAuthState);
    
    // Set up auth state change listener  
    const unsubscribe = authService.onAuthStateChange(async (newAuthState: AuthState) => {
      console.log('🔄 Auth state changed:', {
        isAuthenticated: newAuthState.isAuthenticated,
        currentUser: newAuthState.currentUser?.username || 'null'
      });
      
      setAuthState(prevState => {
        const isStateChanged = 
          prevState.isAuthLoading !== newAuthState.isAuthLoading ||
          prevState.isAuthenticated !== newAuthState.isAuthenticated ||
          prevState.currentUser?.id !== newAuthState.currentUser?.id;
        
        return isStateChanged ? newAuthState : prevState;
      });
    });
    
    return unsubscribe;
  }, []);

  return {
    // Auth state
    user: authState.currentUser,
    isLoading: authState.isAuthLoading,
    isAuthenticated: authState.isAuthenticated,
    sessionToken: authState.sessionToken,
    
    // Auth actions
    login,
    signup,
    logout,
    forceAuthRefresh
  };
}; 