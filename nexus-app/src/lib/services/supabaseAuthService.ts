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
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  };
  private initialized = false;
  private authListeners: ((authState: AuthState) => void)[] = [];
  private initializationPromise: Promise<void> | null = null;

  constructor() {
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
    try {
      // Check for existing session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 10000);
      });

      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        console.warn('Session check error:', error);
        await this.cleanupInvalidSession();
        return;
      }
      
      if (data.session) {
        await this.handleAuthStateChange(data.session);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
        
        if (event === 'SIGNED_IN' && session) {
          await this.handleAuthStateChange(session);
        } else if (event === 'SIGNED_OUT') {
          this.clearAuthState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          await this.handleAuthStateChange(session);
        } else if (event === 'USER_UPDATED' && session) {
          await this.handleAuthStateChange(session);
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing auth:', error);
      // On initialization error, clear any stale state
      await this.cleanupInvalidSession();
    } finally {
      this.initializationPromise = null;
    }
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
      
      this.authState = {
        isAuthenticated: true,
        currentUser: user,
        sessionToken: session.access_token
      };

      this.notifyAuthListeners();
    } catch (error) {
      console.error('Error handling auth state change:', error);
      
      // Enhanced cleanup for various error scenarios
      await this.cleanupInvalidSession();
    }
  }

  private async createOrGetUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    try {
      // First, try to get existing user with timeout
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000);
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
      console.error('Error in createOrGetUserProfile:', error);
      throw new Error('Failed to create or retrieve user profile');
    }
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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      // Always clear local state regardless of API call success
      this.clearAuthState();
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
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
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

  async checkEmailAvailability(email: string): Promise<{ available: boolean; error?: string }> {
    try {
      console.log('🔍 SupabaseAuthService: Checking email availability for:', email);
      
      // Don't check if email is invalid format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format:', email);
        return { available: false, error: 'Invalid email format' };
      }

      // Check if email is already registered in Supabase auth
      console.log('📡 Calling check_email_exists function...');
      const { data, error } = await supabase.rpc('check_email_exists', { email_to_check: email });
      
      if (error) {
        // If the function doesn't exist, fall back to a signup attempt (will be cancelled)
        console.warn('⚠️ check_email_exists function not found, using fallback method. Error:', error);
        return await this.checkEmailFallback(email);
      }

      console.log('✅ check_email_exists response - data:', data, 'available:', !data);
      return { available: !data };
    } catch (error) {
      console.error('❌ Email availability check error:', error);
      return { available: true }; // Default to available on error to not block signup
    }
  }

  private async checkEmailFallback(email: string): Promise<{ available: boolean; error?: string }> {
    try {
      console.log('🔄 Using fallback method for email check:', email);
      
      // Try to sign up with a dummy password to check if email exists
      const { error } = await supabase.auth.signUp({
        email,
        password: 'dummy_password_12345!', // This won't complete signup
      });

      if (error) {
        console.log('🔍 Fallback signup error:', error.message);
        if (error.message.includes('already registered')) {
          console.log('❌ Email already registered via fallback');
          return { available: false };
        }
        // Other errors don't indicate email unavailability
        console.log('✅ Email available (other error in fallback)');
        return { available: true };
      }

      // If no error, email is available, but we need to clean up the partial signup
      // The user will need to verify their email anyway, so this is handled gracefully
      console.log('✅ Email available via fallback (no error)');
      return { available: true };
    } catch (error) {
      console.error('❌ Email fallback check error:', error);
      return { available: true }; // Default to available on error
    }
  }

  getCurrentUser(): User | null {
    return this.authState.currentUser;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getAuthState(): AuthState {
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
}

// Export singleton instance so the rest of the app can import `authService`
// without worrying about whether we're in mock mode or live Supabase mode.
export const authService = USE_MOCK_DATA ? (new MockAuthBridge() as any) : new SupabaseAuthService();