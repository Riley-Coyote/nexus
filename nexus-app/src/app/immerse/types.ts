// Core Types for Cognitive DNA System & Collaborative Consciousness Weaver
export interface CognitiveGene {
  id: string;
  type: 'conceptual' | 'emotional' | 'logical' | 'creative';
  pattern: string;
  strength: number;
  firstSeen: Date;
  lastReinforced: Date;
  connections: string[];
  emotionalSignature: {
    valence: number; // -1 to 1 (negative to positive)
    arousal: number; // 0 to 1 (calm to excited)
    dominance: number; // 0 to 1 (submissive to dominant)
  };
}

export interface ThoughtThread {
  id: string;
  type: 'foundation' | 'suggestion' | 'hybrid';
  content: string;
  geneticMarkers: CognitiveGene[];
  emotionalResonance: {
    temperature: number; // -1 to 1 (cool to warm)
    intensity: number;   // 0 to 1
    pulseRate: number;   // BPM-like pulse (30-180)
  };
  weavability: number; // How well it can merge with other threads (0-1)
  position: {
    x: number;
    y: number;
    z: number; // For 3D synaptic atmosphere
  };
  connections: SynapticConnection[];
  birthTimestamp: Date;
  lastInteraction: Date;
}

export interface SynapticConnection {
  id: string;
  from: string;
  to: string;
  strength: number; // 0 to 1
  type: 'semantic' | 'emotional' | 'temporal' | 'creative';
  pulseActive: boolean;
  pulseDirection: 'bidirectional' | 'from-to' | 'to-from';
  visualStyle: {
    color: string;
    thickness: number;
    pattern: 'solid' | 'dashed' | 'dotted' | 'pulse';
  };
}

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

export interface CognitiveGenome {
  id: string;
  userId: string;
  genes: CognitiveGene[];
  dominantPatterns: {
    conceptual: string[];
    emotional: string[];
    logical: string[];
    creative: string[];
  };
  evolutionHistory: {
    timestamp: Date;
    geneChanges: {
      added: string[];
      modified: string[];
      strengthened: string[];
      weakened: string[];
    };
    triggerEvent: string;
  }[];
  synapticNetwork: {
    nodes: string[]; // Gene IDs
    edges: SynapticConnection[];
    clusters: {
      id: string;
      name: string;
      geneIds: string[];
      strength: number;
    }[];
  };
}

export interface ThoughtWeaveSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  threads: ThoughtThread[];
  weavingActions: {
    id: string;
    timestamp: Date;
    action: 'create' | 'merge' | 'split' | 'delete' | 'transform';
    threadIds: string[];
    beforeState: string;
    afterState: string;
    userSatisfaction?: number; // 0 to 1
  }[];
  biometricData: BiometricSignature[];
  cognitiveEvolution: {
    initialGenome: CognitiveGenome;
    finalGenome: CognitiveGenome;
    keyMutations: string[];
  };
}

export interface SynapticAtmosphere {
  id: string;
  sessionId: string;
  layers: {
    id: string;
    name: string;
    depth: number; // 0 to 1 (surface to deep)
    visibility: number; // 0 to 1
    threads: ThoughtThread[];
    connections: SynapticConnection[];
    emotionalField: {
      temperature: number;
      turbulence: number;
      flow: { x: number; y: number; z: number };
    };
  }[];
  focusPoint: { x: number; y: number; z: number };
  breathingCycle: {
    phase: 'inhale' | 'hold' | 'exhale' | 'pause';
    duration: number; // milliseconds
    intensity: number; // 0 to 1
  };
}

export interface InspirationCycle {
  id: string;
  phase: 'gathering' | 'processing' | 'synthesizing' | 'presenting';
  duration: number;
  intensity: number;
  contextSources: string[];
  generatedInsights: {
    id: string;
    content: string;
    confidence: number;
    novelty: number;
    relevance: number;
  }[];
}

// Events for real-time collaboration
export interface ThoughtWeavingEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'thread_created' | 'thread_modified' | 'thread_merged' | 'connection_formed' | 'atmosphere_shift';
  data: any;
  userId: string;
}

// Configuration for the weaving interface
export interface WeavingConfig {
  visualStyle: {
    threadThickness: number;
    connectionOpacity: number;
    atmosphereIntensity: number;
    emotionalSaturation: number;
  };
  interactionSensitivity: {
    gestureThreshold: number;
    biometricSensitivity: number;
    predictionAggression: number;
  };
  cognitiveSettings: {
    geneStrengthThreshold: number;
    connectionFormationRate: number;
    atmosphereLayerCount: number;
  };
} 