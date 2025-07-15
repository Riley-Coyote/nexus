// Core Types for Immersive Journal BiometricTracker

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