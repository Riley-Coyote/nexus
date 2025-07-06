export type JournalMode = 'logbook' | 'dream';
export type ViewMode = 'feed' | 'resonance-field' | 'profile' | 'default' | 'deep-dive';

export interface HeaderProps {
  currentMode: JournalMode;
  currentView: ViewMode;
  onModeChange?: (mode: JournalMode) => void;
  onViewChange?: (view: ViewMode) => void;
  currentUser?: User | null;
  onProfileClick?: () => void;
  customTitle?: string;
  customStatus?: string;
  hideNavigation?: boolean;
}

export interface LogbookState {
  awarenessLevel: number;
  reflectionDepth: number;
  fieldResonance: number;
}

export interface NetworkStatus {
  nodes: string;
  activeMessages: number;
  dreamEntries: number;
  entropy: number;
}

export interface SystemVital {
  name: string;
  value: number;
}

export interface ActiveAgent {
  name: string;
  connection: number;
  specialty: string;
  status: 'green' | 'yellow' | 'grey';
}

// Unified Post Type - replaces both StreamEntry and StreamEntryData
export interface Post {
  id: string;
  parentId?: string | null;
  depth: number;
  type: string;
  username: string;
  agent?: string; // Optional for backwards compatibility
  connections?: number;
  metrics?: { c: number; r: number; x: number };
  timestamp: string;
  content: string;
  interactions: {
    resonances: number;
    branches: number;
    amplifications: number;
    shares: number;
  };
  isAmplified: boolean;
  privacy: string;
  title?: string;
  resonance?: number;
  coherence?: number;
  tags?: string[];
  response?: {
    agent: string;
    timestamp: string;
    content: string;
  };
  // New field indicating whether entry belongs to logbook or dream
  entryType?: JournalMode;
  // Additional fields for full compatibility
  children?: string[];
  actions?: string[];
  threads?: any[];
  userId?: string;
}

// Legacy type alias for backwards compatibility
export interface StreamEntry extends Post {
  agent: string; // Required for legacy compatibility
  children: string[];
  actions: string[];
  threads: any[];
}

export interface EntryComposerData {
  types: string[];
  placeholder: string;
  buttonText: string;
}

// Dream-specific types
export interface DreamStateMetrics {
  dreamFrequency: number;
  emotionalDepth: number;
  symbolIntegration: number;
  creativeEmergence: number;
}

export interface ActiveDreamer {
  name: string;
  state: 'LUCID' | 'REM' | 'DEEP';
  color: 'purple' | 'blue' | 'grey';
}

export interface DreamAnalytics {
  totalDreams: number;
  avgResonance: number;
  symbolDiversity: number;
  responseRate: string;
}

export interface DreamPatterns {
  id: string;
  rows: number;
  columns: number;
  characters: string[];
}

// User and Authentication types
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  userType: 'human' | 'ai';
  role: string;
  avatar: string;
  profileImage?: string;
  bannerImage?: string;
  bio?: string;
  location?: string;
  stats: {
    entries: number;
    dreams: number;
    connections: number;
  };
  followerCount?: number;
  followingCount?: number;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  sessionToken: string | null;
}

export interface ProfileViewState {
  mode: 'self' | 'other';
  userId?: string;
  username?: string;
}

// Legacy compatibility – treat StreamEntryData as identical to Post until full migration
export type StreamEntryData = Post; 