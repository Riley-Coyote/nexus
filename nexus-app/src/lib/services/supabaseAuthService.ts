import { User, AuthState } from '../types';
import { supabase } from '../supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { authService as mockAuthService } from './authService';

// Re-declare the same mock-data flag that is used in dataService so we don't create a circular import.
// Set to 'false' by default so that mock auth is disabled and real Supabase auth is used.
const DEBUG_USE_MOCK_DATA = false; // 🔧 Keep in sync with dataService.ts
const USE_MOCK_DATA = false; // Mock mode fully disabled

export interface AuthResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock-mode bridge – adapts the local in-memory AuthService to the Supabase
// AuthService interface so that the rest of the codebase can stay unchanged.
// ──────────────────────────────────────────────────────────────────────────────
class MockAuthBridge {
  private listeners: ((authState: AuthState) => void)[] = [];

  private notifyListeners() {
    const authState = mockAuthService.getAuthState();
    this.listeners.forEach(listener => listener(authState));
  }

  // Subscribe to auth state changes (in-memory implementation)
  onAuthStateChange(callback: (authState: AuthState) => void) {
    this.listeners.push(callback);
    // Immediately emit current state so consumer can initialise
    callback(mockAuthService.getAuthState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // ───────── Core auth operations ─────────
  async signIn(emailOrUsername: string, password: string): Promise<AuthResult> {
    const username = emailOrUsername.includes('@') ? emailOrUsername.split('@')[0] : emailOrUsername;
    const result = await mockAuthService.login(username, password);
    if (result.success) {
      this.notifyListeners();
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  async signUp(email: string, password: string, userData?: { name?: string; username?: string }): Promise<AuthResult> {
    const username = userData?.username || (email.includes('@') ? email.split('@')[0] : email);
    const result = await mockAuthService.signup(username, password, email);
    if (result.success) {
      this.notifyListeners();
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  async signOut(): Promise<void> {
    mockAuthService.logout();
    this.notifyListeners();
  }

  // No-op in mock mode – treat as success so UI flow continues
  async resendVerification(_email: string): Promise<AuthResult> {
    return { success: true };
  }

  async resetPassword(_email: string): Promise<AuthResult> {
    return { success: true };
  }

  async checkEmailAvailability(_email: string): Promise<{ available: boolean; error?: string }> {
    // In mock mode, always return available
    return { available: true };
  }

  // ───────── State helpers ─────────
  getCurrentUser() {
    return mockAuthService.getAuthState().currentUser;
  }

  isAuthenticated() {
    return mockAuthService.getAuthState().isAuthenticated;
  }

  getAuthState() {
    return mockAuthService.getAuthState();
  }

  // Pass-through for stats updates so analytics still work in mock mode
  updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1) {
    mockAuthService.updateUserStats(statType, increment);
    this.notifyListeners();
  }
}
// ──────────────────────────────────────────────────────────────────────────────

class SupabaseAuthService {
  private authState: AuthState = {
    isAuthLoading: true,
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  };
  private initialized = false;
  private initializationFailed = false;
  private initializationStartTime: number = 0;
  private authListeners: ((authState: AuthState) => void)[] = [];
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationStartTime = Date.now();
    // Initialize auth state
    this.initialize();
  }

  private async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.initialized) return;
    
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization() {
    const initTimeout = 30000; // 30 second timeout
    
    try {
      // Wrap entire initialization in timeout
      const initializationProcess = async () => {
        // Check for existing session with timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 10000);
        });

        const { data, error } = await Promise.race([sessionPromise, sessionTimeoutPromise]);
        
        if (error) {
          console.warn('Session check error:', error);
          await this.cleanupInvalidSession();
          return;
        }
        
        if (data.session) {
          await this.handleAuthStateChange(data.session);
        }

        // Listen for auth changes - ONLY SET UP ONCE
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (this.initializationFailed) return; // Ignore if we've already failed
          
          // Handle session events
          if (event === 'SIGNED_IN' && session) {
            await this.handleAuthStateChange(session);
          } else if (event === 'SIGNED_OUT') {
            this.clearAuthState();
          } else if (event === 'TOKEN_REFRESHED' && session) {
            await this.handleAuthStateChange(session);
          } else if (event === 'USER_UPDATED' && session) {
            // Skip the profile fetch for simple USER_UPDATED events that don't change metadata we care about
            if (this.authState.currentUser?.id === session.user.id) {
              // Just update the session token, keep existing profile
              this.atomicUpdateAuthState({
                sessionToken: session.access_token
              });
            } else {
              // Different user or no cached profile - fetch it
              await this.handleAuthStateChange(session);
            }
          }
        });

        this.initialized = true;
        this.initializationFailed = false;
        
        this.atomicUpdateAuthState({
          isAuthLoading: false
        });
      };

      // Apply timeout to the entire initialization process
      await Promise.race([
        initializationProcess(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), initTimeout);
        })
      ]);

    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.initializationFailed = true;
      this.atomicUpdateAuthState({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
        sessionToken: null
      });
    } finally {
      this.initializationPromise = null;
      
      // CRITICAL: Ensure we NEVER stay in loading state indefinitely
      setTimeout(() => {
        if (this.authState.isAuthLoading) {
          console.warn('⚠️ Auth still loading after timeout, forcing non-loading state');
          this.atomicUpdateAuthState({
            isAuthLoading: false
          });
        }
      }, 5000); // 5 second final safety check
    }
  }

  private atomicUpdateAuthState(updates: Partial<AuthState>) {
    this.authState = {
      ...this.authState,
      ...updates
    };
    
    this.notifyAuthListeners();
  }

  private async cleanupInvalidSession() {
    console.log('Cleaning up invalid session...');
    try {
      // Clear potential localStorage entries that might be stale
      if (typeof window !== 'undefined') {
        // Clear common Supabase auth keys
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('supabase') && key.includes('auth')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Sign out to clear any stale Supabase session
      await supabase.auth.signOut({ scope: 'local' });
    } catch (cleanupError) {
      console.warn('Error during session cleanup:', cleanupError);
    }
    
    this.clearAuthState();
  }

  private async handleAuthStateChange(session: Session) {
    try {
      // Validate session before proceeding
      if (!session.access_token || !session.user) {
        throw new Error('Invalid session data');
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        throw new Error('Session expired');
      }

      const user = await this.createOrGetUserProfile(session.user);
      
      this.atomicUpdateAuthState({
        isAuthLoading: false,
        isAuthenticated: true,
        currentUser: user,
        sessionToken: session.access_token
      });

    } catch (error) {
      console.error('Error handling auth state change:', error);
      
      // Handle database timeout differently from auth/session errors
      if (error instanceof Error && error.message.includes('timeout')) {
        // Keep session valid; mark profile as stale and retry in background
        console.warn('Profile fetch timed out; keeping session valid and will retry later');
        this.atomicUpdateAuthState({
          isAuthLoading: false,
          isAuthenticated: true,
          currentUser: this.authState.currentUser, // Keep existing profile if available
          sessionToken: session.access_token
        });
        
        // Schedule background retry
        setTimeout(() => {
          this.retryProfileFetch(session.user);
        }, 5000); // Retry after 5 seconds
        
        return;
      }
      
      // Real auth/session problem → fall back to cleanupInvalidSession()
      await this.cleanupInvalidSession();
    }
  }

  private async createOrGetUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    return this.fetchUserWithRetry(supabaseUser.id, supabaseUser);
  }

  private async fetchUserWithRetry(userId: string, supabaseUser: SupabaseUser, attempts = 3): Promise<User> {
    for (let i = 0; i < attempts; i++) {
      try {
        // First, try to get existing user with extended timeout
        const fetchPromise = supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 30000); // Increased to 30 seconds
        });

        const { data: existingUser, error: fetchError } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);

        if (existingUser && !fetchError) {
          return this.mapSupabaseUserToAppUser(existingUser);
        }

        // If user doesn't exist, create new profile
        return await this.createNewUserProfile(supabaseUser);
      } catch (error) {
        console.warn(`User fetch attempt ${i + 1} failed:`, error);
        
        if (i === attempts - 1) {
          // Last attempt failed
          throw new Error(`Failed to create or retrieve user profile after ${attempts} attempts`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to create or retrieve user profile');
  }

  private async createNewUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    // Check if username already exists
    const baseUsername = supabaseUser.user_metadata?.username || 
                        supabaseUser.email?.split('@')[0] || 
                        `user_${supabaseUser.id.slice(0, 8)}`;
    let username = baseUsername;
    let counter = 1;

    // Find available username with timeout protection
    while (counter < 100) { // Prevent infinite loops
      try {
        const { data: existingUsername } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .single();

        if (!existingUsername) break;
        
        username = `${baseUsername}_${counter}`;
        counter++;
      } catch (error) {
        // If query fails, use the current username attempt
        break;
      }
    }

    // Create new user profile
    const newUserData = {
      id: supabaseUser.id,
      username,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
      role: 'Explorer',
      stats: { entries: 0, dreams: 0, connections: 0 },
      follower_count: 0,
      following_count: 0,
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
      userType: supabaseUser.user_type ?? 'human',
      role: supabaseUser.role,
      avatar: supabaseUser.avatar,
      profileImage: supabaseUser.profile_image_url,
      bannerImage: supabaseUser.banner_image_url,
      bio: supabaseUser.bio,
      location: supabaseUser.location,
      stats: {
        ...(supabaseUser.stats || { entries: 0, dreams: 0, connections: 0 }),
        connections: supabaseUser.follower_count ?? 0
      },
      followerCount: supabaseUser.follower_count || 0,
      followingCount: supabaseUser.following_count || 0,
      createdAt: supabaseUser.created_at
    };
  }

  private clearAuthState() {
    this.atomicUpdateAuthState({
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    });
  }

  private notifyAuthListeners() {
    this.authListeners.forEach(listener => listener(this.authState));
  }

  // ✅ NEW: Wait for initialization to complete
  private async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }
    
    // If no initialization promise exists, start initialization
    return this.initialize();
  }

  onAuthStateChange(callback: (authState: AuthState) => void) {
    this.authListeners.push(callback);
    
    // Immediately notify with current state
    callback(this.authState);
    
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  async signUp(email: string, password: string, userData?: { name?: string; username?: string }): Promise<AuthResult> {
    try {
      // Ensure initialization is complete
      await this.initialize();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: {
            name: userData?.name || email.split('@')[0],
            username: userData?.username || email.split('@')[0]
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
        }
        if (error.message.includes('rate limit')) {
          return { success: false, error: 'Too many attempts. Please wait a moment and try again.' };
        }
        if (error.message.includes('Password should be at least')) {
          return { success: false, error: 'Password must be at least 12 characters long with a number and special character.' };
        }
        if (error.message.includes('invalid email')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        if (error.message.includes('weak password')) {
          return { success: false, error: 'Password is too weak. Please use at least 12 characters with numbers and special characters.' };
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

  async signIn(emailOrUsername: string, password: string): Promise<AuthResult> {
    try {
      // Ensure initialization is complete
      await this.initialize();

      // Clear any existing session before attempting new sign-in
      await supabase.auth.signOut({ scope: 'local' });

      // Check if the input is a username (not an email) and convert to email
      let email = emailOrUsername;
      if (!emailOrUsername.includes('@')) {
        // It's a username, look up the email
        const { data: userData, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername)
          .single();

        if (lookupError || !userData?.email) {
          return { success: false, error: 'Invalid username or password. Please check your credentials and try again.' };
        }
        email = userData.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Please verify your email address before signing in.', needsVerification: true };
        }
        if (error.message.includes('rate limit')) {
          return { success: false, error: 'Too many attempts. Please wait a moment and try again.' };
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

      // Update auth state now that sign-in succeeded
      if (data.session) {
        await this.handleAuthStateChange(data.session);
      } else {
        // Fallback: fetch current session and update
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            await this.handleAuthStateChange(sessionData.session);
          } else {
            throw new Error('No session after successful sign-in');
          }
        } catch (sessionError) {
          console.error('Failed to get session after sign-in:', sessionError);
          return { success: false, error: 'Sign-in succeeded but session setup failed. Please try again.' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Signin error:', error);
      
      // On sign-in error, clean up any partial state
      await this.cleanupInvalidSession();
      
      return { success: false, error: 'An unexpected error occurred during signin.' };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign out error:', error);
    }
    
    // Clear user data from state
    this.clearAuthState();
    
    // Clear potential localStorage entries that might be stale
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = Object.keys(localStorage).filter(key =>
          key.startsWith('nexus_') || key.startsWith('liminal_')
        );
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.warn(`Failed to remove localStorage key ${key}:`, error);
          }
        });
      } catch (error) {
        console.error('Error clearing localStorage on signOut:', error);
        // Try to clear the most important keys manually
        try {
          localStorage.removeItem('nexus_session_token');
          localStorage.removeItem('nexus_user_data');
          localStorage.removeItem('nexus_users');
          localStorage.removeItem('nexusInteractionState');
        } catch (e) {
          console.warn('Manual localStorage cleanup also failed:', e);
        }
      }
    }
    
    // Notify listeners
    this.notifyAuthListeners();
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
        if (error.message.includes('rate limit')) {
          return { success: false, error: 'Please wait a moment before requesting another verification email.' };
        }
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
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?type=recovery`
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          return { success: false, error: 'Please wait a moment before requesting another password reset.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to send password reset email.' };
    }
  }

  async updatePasswordSecure(oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.functions.invoke('secure_update_password', {
        body: {
          oldPassword,
          newPassword
        }
      });

      if (error) {
        if (error.message.includes('Invalid old password')) {
          return { success: false, error: 'Your current password is incorrect.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Secure password update error:', error);
      return { success: false, error: 'Failed to update password. Please try again.' };
    }
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean; error?: string }> {
    try {
      // Don't check if email is invalid format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { available: false, error: 'Invalid email format' };
      }

      // Check if email is already registered in Supabase auth
      const { data, error } = await supabase.rpc('check_email_exists', { email_to_check: email });
      
      if (error) {
        // If the function doesn't exist, fall back to a signup attempt (will be cancelled)
        console.warn('check_email_exists function not found, using fallback method. Error:', error);
        return await this.checkEmailFallback(email);
      }

      return { available: !data };
    } catch (error) {
      console.error('Email availability check error:', error);
      return { available: true }; // Default to available on error to not block signup
    }
  }

  private async checkEmailFallback(email: string): Promise<{ available: boolean; error?: string }> {
    try {
      // Try to sign up with a dummy password to check if email exists
      const { error } = await supabase.auth.signUp({
        email,
        password: 'dummy_password_12345!', // This won't complete signup
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { available: false };
        }
        // Other errors don't indicate email unavailability
        return { available: true };
      }

      // If no error, email is available, but we need to clean up the partial signup
      // The user will need to verify their email anyway, so this is handled gracefully
      return { available: true };
    } catch (error) {
      console.error('Email fallback check error:', error);
      return { available: true }; // Default to available on error
    }
  }

  getCurrentUser(): User | null {
    return this.authState.currentUser;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // ✅ FIXED: Make getAuthState wait for initialization
  getAuthState(): AuthState {
    // If not initialized and still loading, return current state
    // The initialization will notify listeners when complete
    if (!this.initialized && this.authState.isAuthLoading) {
      return this.authState;
    }
    
    // If initialization failed, return current state
    if (this.initializationFailed) {
      return this.authState;
    }
    
    return this.authState;
  }

  // ✅ NEW: Async version that waits for initialization
  async getAuthStateAsync(): Promise<AuthState> {
    if (this.initialized) {
      return this.authState;
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.authState;
    }
    
    // If no initialization promise exists, start initialization
    await this.initialize();
    return this.authState;
  }

  async updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1): Promise<void> {
    const currentUser = this.authState.currentUser;
    if (!currentUser) return;

    try {
      // Update local state immediately for responsiveness
      const newStats = { ...currentUser.stats };
      newStats[statType] += increment;
      
      this.authState.currentUser = {
        ...currentUser,
        stats: newStats
      };
      
      this.notifyAuthListeners();

      // Update in database
      await supabase
        .from('users')
        .update({ stats: newStats })
        .eq('id', currentUser.id);
    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  private async retryProfileFetch(supabaseUser: SupabaseUser, attempt = 1) {
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second
    
    try {
      console.log(`Retrying profile fetch (attempt ${attempt}/${maxAttempts})`);
      const user = await this.createOrGetUserProfile(supabaseUser);
      
      // Update the current user profile if we got it
      if (this.authState.isAuthenticated) {
        this.authState = {
          ...this.authState,
          currentUser: user
        };
        this.notifyAuthListeners();
        console.log('Profile fetch retry successful');
      }
    } catch (error) {
      console.warn(`Profile fetch retry ${attempt} failed:`, error);
      
      // Exponential backoff retry
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        setTimeout(() => {
          this.retryProfileFetch(supabaseUser, attempt + 1);
        }, delay);
      } else {
        console.error('All profile fetch retries failed');
      }
    }
  }
}

// Export singleton instance so the rest of the app can import `authService`
// without worrying about whether we're in mock mode or live Supabase mode.
export const authService = USE_MOCK_DATA ? (new MockAuthBridge() as any) : new SupabaseAuthService();