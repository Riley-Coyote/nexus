export type JournalMode = 'logbook' | 'dream';
export type ViewMode = 'feed' | 'resonance-field' | 'default';

export interface HeaderProps {
  currentMode: JournalMode;
  currentView: ViewMode;
  onModeChange: (mode: JournalMode) => void;
  onViewChange: (view: ViewMode) => void;
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

export interface StreamEntry {
  id: string;
  parentId: string | null;
  children: string[];
  depth: number;
  type: string;
  agent: string;
  connections?: number;
  metrics?: { c: number; r: number; x: number };
  timestamp: string;
  content: string;
  actions: string[];
  privacy: string;
  interactions: {
    resonances: number;
    branches: number;
    amplifications: number;
    shares: number;
  };
  threads: any[];
  isAmplified: boolean;
  title?: string;
  resonance?: number;
  coherence?: number;
  tags?: string[];
  response?: {
    agent: string;
    timestamp: string;
    content: string;
  };
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