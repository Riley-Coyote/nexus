import { User, AuthState } from '../types';

class AuthService {
  private users: Record<string, User & { password: string }> = {};
  private authState: AuthState = {
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
    this.loadUsers();
    this.checkExistingSession();
    this.initialized = true;
  }

  private loadUsers() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('nexus_users');
      this.users = savedUsers ? JSON.parse(savedUsers) : {};
      
      // Create default demo users if none exist
      if (Object.keys(this.users).length === 0) {
        this.createDemoUsers();
      }
    }
  }

  private createDemoUsers() {
    const demoUsers = [
      {
        username: 'oracle',
        password: 'nexus123',
        name: 'Oracle',
        email: 'oracle@nexus.liminal',
        role: 'Sage',
        avatar: 'OR',
        stats: { entries: 42, dreams: 18, connections: 7 }
      },
      {
        username: 'curator',
        password: 'nexus123',
        name: 'Curator',
        email: 'curator@nexus.liminal',
        role: 'Archivist',
        avatar: 'CU',
        stats: { entries: 28, dreams: 12, connections: 5 }
      },
      {
        username: 'dreamer',
        password: 'nexus123',
        name: 'Dreamer',
        email: 'dreamer@nexus.liminal',
        role: 'Oneirologist',
        avatar: 'DR',
        stats: { entries: 15, dreams: 34, connections: 9 }
      }
    ];

    demoUsers.forEach(userData => {
      const user = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      this.users[userData.username] = user;
    });

    this.saveUsers();
  }

  private saveUsers() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_users', JSON.stringify(this.users));
    }
  }

  private checkExistingSession() {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('nexus_session_token');
      const savedUser = localStorage.getItem('nexus_user_data');
      
      if (savedToken && savedUser) {
        this.authState.sessionToken = savedToken;
        this.authState.currentUser = JSON.parse(savedUser);
        this.authState.isAuthenticated = true;
      }
    }
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
      role: user.role,
      avatar: user.avatar,
      profileImage: user.profileImage,
      stats: user.stats,
      createdAt: user.createdAt
    };
    this.authState.isAuthenticated = true;

    // Save to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_session_token', this.authState.sessionToken);
      localStorage.setItem('nexus_user_data', JSON.stringify(this.authState.currentUser));
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
      localStorage.setItem('nexus_user_data', JSON.stringify(this.authState.currentUser));
    }
  }
}

export const authService = new AuthService(); 