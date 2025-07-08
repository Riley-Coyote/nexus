import { createClient } from '@supabase/supabase-js';
import { User, AuthState } from '../types';
import { authService as mockAuthService } from './authService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    username?: string;
  };
  email_confirmed_at?: string;
};

// Interface for cached token data
interface CachedTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
  cached_at: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock auth service for development/testing
// ──────────────────────────────────────────────────────────────────────────────

class MockAuthBridge {
  private listeners: ((authState: AuthState) => void)[] = [];

  private notifyListeners() {
    const authState = mockAuthService.getAuthState();
    this.listeners.forEach(listener => listener(authState));
  }

  onAuthStateChange(callback: (authState: AuthState) => void) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(mockAuthService.getAuthState());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signIn(emailOrUsername: string, password: string): Promise<AuthResult> {
    const result = await mockAuthService.login(emailOrUsername, password);
    this.notifyListeners();
    return result;
  }

  async signUp(email: string, password: string, userData?: { name?: string; username?: string }): Promise<AuthResult> {
    const result = await mockAuthService.signup(userData?.username || email, password, email);
    this.notifyListeners();
    return result;
  }

  async signOut(): Promise<void> {
    mockAuthService.logout();
    this.notifyListeners();
  }

  async resendVerification(_email: string): Promise<AuthResult> {
    return { success: true };
  }

  async resetPassword(_email: string): Promise<AuthResult> {
    return { success: true };
  }

  async checkEmailAvailability(_email: string): Promise<{ available: boolean; error?: string }> {
    return { available: true };
  }

  getCurrentUser() {
    return mockAuthService.getCurrentUser();
  }

  isAuthenticated() {
    return mockAuthService.getAuthState().isAuthenticated;
  }

  getAuthState() {
    return mockAuthService.getAuthState();
  }

  async getAuthStateAsync() {
    return mockAuthService.getAuthState();
  }

  updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1) {
    return mockAuthService.updateUserStats(statType, increment);
  }

  async updatePasswordSecure(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    return await mockAuthService.updatePasswordSecure(oldPassword, newPassword);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Production Supabase auth service
// ──────────────────────────────────────────────────────────────────────────────

class SupabaseAuthService {
  private authState: AuthState = {
    isAuthLoading: true,
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  };
  private initialized = false;
  private authListeners: ((authState: AuthState) => void)[] = [];

  // Token cache keys
  private readonly TOKEN_CACHE_KEY = 'nexus_auth_cache';
  private readonly CACHE_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry

  constructor() {
    // Simple initialization - no complex promises
    this.initializeAuth();
  }

  private async initializeAuth() {
    console.log('🔄 Starting auth initialization...');
    
    try {
      // Step 1: Check cached token first
      const cachedAuth = this.getCachedAuthData();
      if (cachedAuth && this.isTokenValid(cachedAuth)) {
        console.log('✅ Using cached auth data');
        await this.setAuthFromCache(cachedAuth);
        this.markAsInitialized();
        return;
      }

      // Step 2: Check Supabase session (with timeout)
      console.log('🔄 Checking Supabase session...');
      const sessionResult = await this.getSessionWithTimeout();
      
      if (sessionResult.success && sessionResult.session) {
        console.log('✅ Found valid Supabase session');
        await this.handleAuthSession(sessionResult.session);
      } else {
        console.log('ℹ️ No valid session found');
        this.setUnauthenticatedState();
      }

      // Step 3: Set up auth listener (only once)
      this.setupAuthListener();
      
      this.markAsInitialized();

    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      this.setUnauthenticatedState();
      this.markAsInitialized();
    }
  }

  private getCachedAuthData(): CachedTokenData | null {
    // Skip localStorage access during SSR
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(this.TOKEN_CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedTokenData = JSON.parse(cached);
      
      // Validate cached data structure
      if (!data.access_token || !data.user || !data.expires_at) {
        console.log('🗑️ Invalid cached auth data structure');
        this.clearCachedAuthData();
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to parse cached auth data:', error);
      this.clearCachedAuthData();
      return null;
    }
  }

  private isTokenValid(cachedData: CachedTokenData): boolean {
    const now = Date.now();
    const expiryTime = cachedData.expires_at * 1000; // Convert to milliseconds
    const isExpired = now >= (expiryTime - this.CACHE_EXPIRY_BUFFER);
    
    // Also check if cached data is too old (max 24 hours)
    const cacheAge = now - cachedData.cached_at;
    const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    const isCacheStale = cacheAge > maxCacheAge;
    
    if (isExpired) {
      console.log('🕒 Cached token is expired');
      return false;
    }
    
    if (isCacheStale) {
      console.log('🕒 Cached token is stale');
      return false;
    }
    
    return true;
  }

  private async setAuthFromCache(cachedData: CachedTokenData) {
    try {
      // Try to get user profile from cache or create it
      const user = await this.createOrGetUserProfile(cachedData.user);
      
      this.atomicUpdateAuthState({
        isAuthLoading: false,
        isAuthenticated: true,
        currentUser: user,
        sessionToken: cachedData.access_token
      });
    } catch (error) {
      console.error('Failed to set auth from cache:', error);
      this.clearCachedAuthData();
      throw error;
    }
  }

  private async getSessionWithTimeout(): Promise<{ success: boolean; session: any; error?: string }> {
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 10000);
      });

      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        return { success: false, session: null, error: error.message };
      }
      
      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, session: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async handleAuthSession(session: any) {
    try {
      // Validate session
      if (!session.access_token || !session.user) {
        throw new Error('Invalid session data');
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        throw new Error('Session expired');
      }

      // Cache the session data
      this.cacheAuthData(session);

      // Create user profile
      const user = await this.createOrGetUserProfile(session.user);
      
      this.atomicUpdateAuthState({
        isAuthLoading: false,
        isAuthenticated: true,
        currentUser: user,
        sessionToken: session.access_token
      });

    } catch (error) {
      console.error('Error handling auth session:', error);
      this.clearCachedAuthData();
      this.setUnauthenticatedState();
    }
  }

  private cacheAuthData(session: any) {
    // Skip localStorage access during SSR
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData: CachedTokenData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
        cached_at: Date.now()
      };

      localStorage.setItem(this.TOKEN_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Auth data cached successfully');
    } catch (error) {
      console.warn('Failed to cache auth data:', error);
    }
  }

  private clearCachedAuthData() {
    // Skip localStorage access during SSR
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.TOKEN_CACHE_KEY);
      console.log('🗑️ Cleared cached auth data');
    } catch (error) {
      console.warn('Failed to clear cached auth data:', error);
    }
  }

  private setupAuthListener() {
    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state change:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await this.handleAuthSession(session);
        } else if (event === 'SIGNED_OUT') {
          this.clearAuthState();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed');
          this.cacheAuthData(session);
          this.atomicUpdateAuthState({
            sessionToken: session.access_token
          });
        }
      });
    } catch (error) {
      console.error('Failed to setup auth listener:', error);
    }
  }

  private setUnauthenticatedState() {
    this.clearCachedAuthData();
    this.atomicUpdateAuthState({
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    });
  }

  private markAsInitialized() {
    this.initialized = true;
    console.log('✅ Auth initialization complete');
  }

  private atomicUpdateAuthState(updates: Partial<AuthState>) {
    this.authState = {
      ...this.authState,
      ...updates
    };
    
    this.notifyAuthListeners();
  }

  private clearAuthState() {
    this.clearCachedAuthData();
    this.atomicUpdateAuthState({
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    });
  }

  private notifyAuthListeners() {
    this.authListeners.forEach(listener => {
      try {
        listener(this.authState);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  private async createOrGetUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    try {
      // Try to get existing user profile
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (existingUser && !fetchError) {
        return this.mapSupabaseUserToAppUser(existingUser);
      }

      // Create new user profile if it doesn't exist
      const newUser = await this.createNewUserProfile(supabaseUser);
      return newUser;

    } catch (error) {
      console.error('Failed to create or get user profile:', error);
             // Return minimal user data as fallback
       return {
         id: supabaseUser.id,
         username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
         email: supabaseUser.email || '',
         name: supabaseUser.user_metadata?.name || 'User',
         userType: 'human' as const,
         role: 'Explorer',
         avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
         bio: '',
         location: '',
         createdAt: new Date().toISOString(),
         stats: {
           entries: 0,
           dreams: 0,
           connections: 0
         }
       };
    }
  }

  private async createNewUserProfile(supabaseUser: SupabaseUser): Promise<User> {
    const username = supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user';
    const name = supabaseUser.user_metadata?.name || 'User';

         const { data, error } = await supabase
       .from('users')
       .insert([
         {
           id: supabaseUser.id,
           username,
           email: supabaseUser.email,
           name,
           user_type: 'human',
           role: 'Explorer',
           avatar: (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
           bio: '',
           location: '',
           stats: {
             entries: 0,
             dreams: 0,
             connections: 0
           }
         }
       ])
       .select()
       .single();

    if (error) throw error;
    return this.mapSupabaseUserToAppUser(data);
  }

     private mapSupabaseUserToAppUser(supabaseUser: any): User {
     return {
       id: supabaseUser.id,
       username: supabaseUser.username,
       email: supabaseUser.email,
       name: supabaseUser.name,
       userType: supabaseUser.user_type || 'human',
       role: supabaseUser.role || 'Explorer',
       avatar: supabaseUser.avatar || (supabaseUser.email?.slice(0, 2) || 'US').toUpperCase(),
       profileImage: supabaseUser.profile_image_url,
       bannerImage: supabaseUser.banner_image_url,
       bio: supabaseUser.bio || '',
       location: supabaseUser.location || '',
       createdAt: supabaseUser.created_at,
       stats: supabaseUser.stats || {
         entries: 0,
         dreams: 0,
         connections: 0
       },
       followerCount: supabaseUser.follower_count || 0,
       followingCount: supabaseUser.following_count || 0
     };
   }

  // Public methods
  onAuthStateChange(callback: (authState: AuthState) => void) {
    this.authListeners.push(callback);
    
    // Call immediately with current state
    callback(this.authState);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== callback);
    };
  }

  async signUp(email: string, password: string, userData?: { name?: string; username?: string }): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, needsVerification: true };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async signIn(emailOrUsername: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, needsVerification: true };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.clearAuthState();
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear state anyway
      this.clearAuthState();
    }
  }

  async resendVerification(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        return { available: false, error: 'Failed to check email availability' };
      }

      return { available: !data };
    } catch (error) {
      return { available: false, error: 'Failed to check email availability' };
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

  async getAuthStateAsync(): Promise<AuthState> {
    // If not initialized, wait for initialization with timeout
    if (!this.initialized) {
      const maxWait = 15000; // 15 seconds max wait
      const startTime = Date.now();
      
      while (!this.initialized && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!this.initialized) {
        console.warn('⚠️ Auth initialization timeout, returning current state');
        // Force non-loading state
        this.atomicUpdateAuthState({ isAuthLoading: false });
      }
    }
    
    return this.authState;
  }

  async updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1): Promise<void> {
    if (!this.authState.currentUser) return;

    try {
      const { error } = await supabase.rpc('update_user_stats', {
        user_id: this.authState.currentUser.id,
        stat_type: statType,
        increment_value: increment
      });

      if (error) {
        console.error('Failed to update user stats:', error);
      }
    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  async updatePasswordSecure(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this.authState.currentUser) {
      return { success: false, error: 'You must be signed in to change your password' };
    }

    if (!oldPassword || !newPassword) {
      return { success: false, error: 'Please provide both current and new passwords' };
    }

    // Validate new password strength
    if (newPassword.length < 12 || newPassword.length > 25) {
      return { success: false, error: 'New password must be between 12-25 characters' };
    }

    if (!/(?=.*[0-9])/.test(newPassword)) {
      return { success: false, error: 'New password must contain at least one number' };
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword)) {
      return { success: false, error: 'New password must contain at least one special character' };
    }

    try {
      // For Supabase, we need to use their secure password update function
      const { data, error } = await supabase.rpc('secure_update_password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update password' };
    }
  }
}

// Export the appropriate service based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockAuth = isDevelopment && process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

export const authService = useMockAuth ? new MockAuthBridge() : new SupabaseAuthService();