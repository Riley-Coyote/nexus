import { User, AuthState } from '../types';
import { supabase } from '../supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

class SupabaseAuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  };
  private initialized = false;
  private authListeners: ((authState: AuthState) => void)[] = [];

  constructor() {
    // Initialize auth state
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await this.handleAuthStateChange(session);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await this.handleAuthStateChange(session);
        } else if (event === 'SIGNED_OUT') {
          this.clearAuthState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          await this.handleAuthStateChange(session);
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  private async handleAuthStateChange(session: Session) {
    try {
      const user = await this.createOrGetUserProfile(session.user);
      
      this.authState = {
        isAuthenticated: true,
        currentUser: user,
        sessionToken: session.access_token
      };

      this.notifyAuthListeners();
    } catch (error) {
      console.error('Error handling auth state change:', error);
      this.clearAuthState();
    }
  }

  private async createOrGetUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    // First, try to get existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (existingUser && !fetchError) {
      return this.mapSupabaseUserToAppUser(existingUser);
    }

    // Check if username already exists
    const baseUsername = supabaseUser.email?.split('@')[0] || `user_${supabaseUser.id.slice(0, 8)}`;
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const { data: existingUsername } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (!existingUsername) break;
      
      username = `${baseUsername}_${counter}`;
      counter++;
    }

    // Create new user profile
    const newUserData = {
      id: supabaseUser.id,
      username,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
      user_type: 'human' as const,
      role: 'Explorer',
      stats: { entries: 0, dreams: 0, connections: 0 },
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([newUserData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      throw new Error('Failed to create user profile');
    }

    return this.mapSupabaseUserToAppUser(newUser);
  }

  private mapSupabaseUserToAppUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      username: supabaseUser.username,
      name: supabaseUser.name,
      email: supabaseUser.email,
      userType: supabaseUser.user_type,
      role: supabaseUser.role,
      avatar: supabaseUser.avatar,
      profileImage: supabaseUser.profile_image,
      stats: supabaseUser.stats || { entries: 0, dreams: 0, connections: 0 },
      createdAt: supabaseUser.created_at
    };
  }

  private clearAuthState() {
    this.authState = {
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    };
    this.notifyAuthListeners();
  }

  private notifyAuthListeners() {
    this.authListeners.forEach(listener => listener(this.authState));
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (authState: AuthState) => void) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  async signUp(email: string, password: string, userData?: { name?: string }): Promise<AuthResult> {
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: {
            name: userData?.name || email.split('@')[0]
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user?.email_confirmed_at) {
        return { 
          success: true, 
          needsVerification: true,
          error: 'Please check your email and click the verification link to complete your account setup.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An unexpected error occurred during signup.' };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Please verify your email address before signing in.' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user?.email_confirmed_at) {
        return { 
          success: false, 
          error: 'Please verify your email address before signing in.',
          needsVerification: true
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: 'An unexpected error occurred during signin.' };
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    }
  }

  async resendVerification(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, error: 'Failed to resend verification email.' };
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to send password reset email.' };
    }
  }

  getCurrentUser(): User | null {
    return this.authState.currentUser;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  async updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) return;

    try {
      const newStats = { ...user.stats };
      newStats[statType] += increment;

      const { error } = await supabase
        .from('users')
        .update({ stats: newStats })
        .eq('id', user.id);

      if (!error) {
        user.stats = newStats;
        this.notifyAuthListeners();
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }
}

// Export singleton instance
export const authService = new SupabaseAuthService(); 