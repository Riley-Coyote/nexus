// Enhanced suggestion system types
export interface EnhancedSuggestion {
  id: string;
  text: string;
  type: 'enhance' | 'expand' | 'clarify' | 'connect' | 'counter' | 'example';
  confidence: number; // 0-1
  emotionalTone: 'neutral' | 'warm' | 'analytical' | 'creative' | 'empathetic';
  contextRelevance: number; // 0-1
  suggestedAction: 'merge' | 'replace' | 'insert_before' | 'insert_after' | 'weave';
  originalTrigger?: string; // The text that triggered this suggestion
  metadata: {
    wordCount: number;
    complexity: 'simple' | 'moderate' | 'complex';
    focusAreas: string[];
    expectedImpact: string;
  };
}

// Drop zone detection types
export interface DropZone {
  type: 'paragraph' | 'sentence' | 'word' | 'between_paragraphs';
  position: {
    line: number;
    char: number;
    elementId?: string;
  };
  context: {
    beforeText: string;
    selectedText: string;
    afterText: string;
    paragraphText: string;
  };
  suggestedAction: 'merge' | 'replace' | 'insert' | 'weave';
}

// Enhanced drag state
export interface DragState {
  isDragging: boolean;
  draggedSuggestion: EnhancedSuggestion | null;
  currentDropZone: DropZone | null;
  hoverTime: number;
  dragDistance: number;
  isValidDrop: boolean;
  previewText?: string;
}

// AI content processing types
export interface ContentMergeRequest {
  originalText: string;
  suggestion: EnhancedSuggestion;
  dropZone: DropZone;
  userPreferences: UserEditingPreferences;
}

export interface ContentMergeResponse {
  mergedText: string;
  changeType: 'minor_edit' | 'significant_enhancement' | 'structural_change';
  preservedElements: string[];
  addedElements: string[];
  explanation: string;
  confidence: number;
}

export interface UserEditingPreferences {
  writingStyle: 'concise' | 'detailed' | 'academic' | 'creative' | 'conversational';
  preferredEditTypes: EnhancedSuggestion['type'][];
  boldnessLevel: 'conservative' | 'moderate' | 'bold';
  voicePreservation: number; // 0-1, how much to preserve original voice
}

// Biometric integration types  
export interface CognitiveState {
  flowState: number; // 0-1
  cognitiveLoad: number; // 0-1
  confidence: number; // 0-1
  writingRhythm: 'burst' | 'steady' | 'contemplative' | 'exploratory';
}

// Editor context types
export interface EditorContext {
  currentParagraph: string;
  previousContext: string;
  nextContext: string;
  selectionRange: { from: number; to: number };
  cursorPosition: { line: number; char: number };
  documentStats: {
    wordCount: number;
    paragraphCount: number;
    estimatedReadingTime: number;
  };
}

// Original BiometricTracker types (restored)
export interface BiometricSignature {
  id: string;
  userId: string;
  typingPressure: number[]; // Array of pressure values
  pausePatterns: number[]; // Array of pause durations
  keystrokeRhythm: number[]; // Intervals between keystrokes
  flowState: {
    current: number; // 0 to 1
    average: number;
    peakDuration: number;
    lastPeak: Date;
  };
  cognitiveLoad: {
    current: number; // 0 to 1
    backspaceFrequency: number;
    revisionPatterns: string[];
  };
  confidence: {
    current: number; // 0 to 1
    wordChoiceHesitation: number;
    sentenceRestructuring: number;
  };
} 