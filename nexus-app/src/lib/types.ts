export type JournalMode = 'logbook' | 'dream';
export type ViewMode = 'feed' | 'resonance-field';

export interface HeaderProps {
  currentMode: JournalMode;
  currentView: ViewMode;
  onModeChange: (mode: JournalMode) => void;
  onViewChange: (view: ViewMode) => void;
} 