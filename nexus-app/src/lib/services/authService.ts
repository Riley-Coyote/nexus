import { User, AuthState } from '../types';

class AuthService {
  private users: Record<string, User & { password: string }> = {};
  private authState: AuthState = {
    isAuthLoading: false,
    isAuthenticated: false,
    currentUser: null,
    sessionToken: null
  };
  private initialized = false;

  constructor() {
    // Don't initialize during SSR
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized) return;
    
    // Check for corrupted localStorage data and fix it
    if (this.hasCorruptedStorageData()) {
      console.warn('Detected corrupted localStorage data, cleaning up...');
      this.clearAllStorageData();
    } else {
      // Load data normally if not corrupted
      this.loadUsers();
      this.checkExistingSession();
    }
    
    this.initialized = true;
  }

  private loadUsers() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      try {
        const savedUsers = localStorage.getItem('nexus_users');
        if (savedUsers) {
          // Validate JSON format before parsing
          if (savedUsers.startsWith('{') && savedUsers.endsWith('}')) {
            this.users = JSON.parse(savedUsers);
          } else {
            console.warn('Corrupted users data in localStorage, resetting');
            this.users = {};
            localStorage.removeItem('nexus_users');
          }
        } else {
          this.users = {};
        }
        
        // No demo users - empty users object is fine
      } catch (error) {
        console.error('Failed to load users from localStorage:', error);
        this.users = {};
        localStorage.removeItem('nexus_users');
      }
    }
  }



  private saveUsers() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      try {
        const serializedUsers = JSON.stringify(this.users);
        localStorage.setItem('nexus_users', serializedUsers);
      } catch (error) {
        console.error('Failed to save users to localStorage:', error);
        // Clear corrupted data to prevent further issues
        localStorage.removeItem('nexus_users');
      }
    }
  }

  private checkExistingSession() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('nexus_session_token');
        const savedUserData = localStorage.getItem('nexus_user_data');
        
        if (savedToken && savedUserData) {
          // Validate that savedUserData is valid JSON before parsing
          if (savedUserData.startsWith('{') && savedUserData.endsWith('}')) {
            const parsedUser = JSON.parse(savedUserData);
            // Validate the parsed user object has required properties
            if (parsedUser && typeof parsedUser === 'object' && parsedUser.id && parsedUser.username) {
              this.authState.sessionToken = savedToken;
              this.authState.currentUser = parsedUser;
              this.authState.isAuthenticated = true;
            } else {
              console.warn('Invalid user data structure in localStorage, clearing session');
              this.clearCorruptedSession();
            }
          } else {
            console.warn('Corrupted user data in localStorage (not valid JSON format), clearing session');
            this.clearCorruptedSession();
          }
        }
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        this.clearCorruptedSession();
      }
    }
  }

  private clearCorruptedSession() {
    // Clear all potentially corrupted auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_session_token');
      localStorage.removeItem('nexus_user_data');
    }
    
    // Reset auth state
    this.authState = {
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    };
  }

  private generateToken(): string {
    return 'token_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    // Ensure initialization on client side
    this.initialize();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!username || !password) {
      return { success: false, error: 'Please fill in all fields' };
    }

    const user = this.users[username];
    if (!user || user.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Create session
    this.authState.sessionToken = this.generateToken();
    this.authState.currentUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      userType: user.userType,
      role: user.role,
      avatar: user.avatar,
      profileImage: user.profileImage,
      stats: user.stats,
      createdAt: user.createdAt
    };
    this.authState.isAuthenticated = true;

    // Save to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        // Ensure the user object is serializable
        const userToStore = {
          id: this.authState.currentUser.id,
          username: this.authState.currentUser.username,
          name: this.authState.currentUser.name,
          email: this.authState.currentUser.email,
          userType: this.authState.currentUser.userType,
          role: this.authState.currentUser.role,
          avatar: this.authState.currentUser.avatar,
          profileImage: this.authState.currentUser.profileImage,
          bannerImage: this.authState.currentUser.bannerImage,
          bio: this.authState.currentUser.bio,
          location: this.authState.currentUser.location,
          stats: this.authState.currentUser.stats,
          followerCount: this.authState.currentUser.followerCount,
          followingCount: this.authState.currentUser.followingCount,
          createdAt: this.authState.currentUser.createdAt
        };
        
        localStorage.setItem('nexus_session_token', this.authState.sessionToken);
        localStorage.setItem('nexus_user_data', JSON.stringify(userToStore));
      } catch (error) {
        console.error('Failed to save user session to localStorage:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('nexus_session_token');
        localStorage.removeItem('nexus_user_data');
        throw new Error('Failed to save user session');
      }
    }

    return { success: true };
  }

  async signup(username: string, password: string, email?: string): Promise<{ success: boolean; error?: string }> {
    // Ensure initialization on client side
    this.initialize();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!username || !password) {
      return { success: false, error: 'Please fill in all fields' };
    }

    if (this.users[username]) {
      return { success: false, error: 'Username already exists' };
    }

    // Create new user
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      password,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email,
      userType: 'human' as const, // Default new users to human type
      role: 'Explorer',
      avatar: username.substring(0, 2).toUpperCase(),
      stats: { entries: 0, dreams: 0, connections: 0 },
      createdAt: new Date().toISOString()
    };

    this.users[username] = newUser;
    this.saveUsers();

    // Automatically log in the new user
    return this.login(username, password);
  }

  logout(): void {
    this.authState = {
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    };

    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_session_token');
      localStorage.removeItem('nexus_user_data');
    }
  }

  getAuthState(): AuthState {
    // Ensure initialization on client side
    this.initialize();
    return { ...this.authState };
  }

  getCurrentUser(): User | null {
    return this.authState.currentUser;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Update user stats when they perform actions
  updateUserStats(statType: 'entries' | 'dreams' | 'connections', increment = 1): void {
    if (!this.authState.currentUser) return;

    this.authState.currentUser.stats[statType] += increment;
    
    // Update in users storage
    const user = this.users[this.authState.currentUser.username];
    if (user) {
      user.stats[statType] += increment;
      this.saveUsers();
    }

    // Update localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        // Ensure the user object is serializable
        const userToStore = {
          id: this.authState.currentUser.id,
          username: this.authState.currentUser.username,
          name: this.authState.currentUser.name,
          email: this.authState.currentUser.email,
          userType: this.authState.currentUser.userType,
          role: this.authState.currentUser.role,
          avatar: this.authState.currentUser.avatar,
          profileImage: this.authState.currentUser.profileImage,
          bannerImage: this.authState.currentUser.bannerImage,
          bio: this.authState.currentUser.bio,
          location: this.authState.currentUser.location,
          stats: this.authState.currentUser.stats,
          followerCount: this.authState.currentUser.followerCount,
          followingCount: this.authState.currentUser.followingCount,
          createdAt: this.authState.currentUser.createdAt
        };
        
        localStorage.setItem('nexus_user_data', JSON.stringify(userToStore));
      } catch (error) {
        console.error('Failed to save updated user stats to localStorage:', error);
        // Don't throw here as stats update is not critical for app functionality
      }
    }
  }

  // Secure password update method - verifies old password before updating
  async updatePasswordSecure(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    // Ensure initialization on client side
    this.initialize();
    
    if (!this.authState.currentUser) {
      return { success: false, error: 'You must be signed in to change your password' };
    }

    if (!oldPassword || !newPassword) {
      return { success: false, error: 'Please provide both current and new passwords' };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get the user from storage
    const user = this.users[this.authState.currentUser.username];
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify the old password
    if (user.password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect' };
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

    // Update the password
    user.password = newPassword;
    this.saveUsers();

    return { success: true };
  }

  // Public method to clear potentially corrupted localStorage data
  // Can be called by users experiencing storage-related issues
  clearAllStorageData(): void {
    if (typeof window !== 'undefined') {
      try {
        // Clear all NEXUS-related localStorage entries
        const keysToRemove = Object.keys(localStorage).filter(key =>
          key.startsWith('nexus_') || key.startsWith('liminal_') || key === 'nexusInteractionState'
        );
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.warn(`Failed to remove localStorage key ${key}:`, error);
          }
        });
        
        console.log('Cleared NEXUS localStorage data');
      } catch (error) {
        console.error('Failed to clear localStorage data:', error);
      }
    }
    
    // Reset auth state
    this.authState = {
      isAuthLoading: false,
      isAuthenticated: false,
      currentUser: null,
      sessionToken: null
    };
    
    // Reset users data
    this.users = {};
  }

  // Method to detect if localStorage might have corrupted data
  hasCorruptedStorageData(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      // Check for common signs of corrupted data
      const userData = localStorage.getItem('nexus_user_data');
      const usersData = localStorage.getItem('nexus_users');
      const interactionData = localStorage.getItem('nexusInteractionState');
      
      // Check if any data contains "[object Object]" string
      const corruptedPatterns = ['[object Object]', 'undefined', 'null'];
      
      return [userData, usersData, interactionData].some(data => 
        data && corruptedPatterns.some(pattern => data.includes(pattern))
      );
    } catch (error) {
      console.error('Error checking for corrupted storage data:', error);
      return true; // Assume corrupted if we can't check
    }
  }
}

// Export the service instance
export const authService = new AuthService();

// Expose cleanup function globally in development for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).nexusDebug = {
    clearStorageData: () => authService.clearAllStorageData(),
    checkForCorruptedData: () => authService.hasCorruptedStorageData(),
    getStorageContents: () => {
      if (typeof window === 'undefined') return {};
      return {
        nexus_user_data: localStorage.getItem('nexus_user_data'),
        nexus_users: localStorage.getItem('nexus_users'),
        nexus_session_token: localStorage.getItem('nexus_session_token'),
        nexusInteractionState: localStorage.getItem('nexusInteractionState')
      };
    }
  };
  console.log('🔧 Development Mode: Access debugging via window.nexusDebug');
} 