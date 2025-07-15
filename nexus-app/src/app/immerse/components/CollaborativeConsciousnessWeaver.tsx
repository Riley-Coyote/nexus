import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ThoughtThread as ThoughtThreadType, 
  SynapticAtmosphere as SynapticAtmosphereType, 
  BiometricSignature, 
  CognitiveGenome,
  ThoughtWeaveSession,
  WeavingConfig,
  InspirationCycle
} from '../types';
import { ThoughtThread } from './ThoughtThread';
import { SynapticAtmosphere } from './SynapticAtmosphere';
import { BiometricTracker } from './BiometricTracker';

interface CollaborativeConsciousnessWeaverProps {
  content: string;
  onContentChange: (content: string) => void;
  userId: string;
  isActive: boolean;
}

export const CollaborativeConsciousnessWeaver: React.FC<CollaborativeConsciousnessWeaverProps> = ({
  content,
  onContentChange,
  userId,
  isActive,
}) => {
  // Core state management
  const [threads, setThreads] = useState<ThoughtThreadType[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThoughtThreadType | null>(null);
  const [atmosphere, setAtmosphere] = useState<SynapticAtmosphereType | null>(null);
  const [currentSession, setCurrentSession] = useState<ThoughtWeaveSession | null>(null);
  const [biometricSignature, setBiometricSignature] = useState<BiometricSignature | null>(null);
  const [cognitiveGenome, setCognitiveGenome] = useState<CognitiveGenome | null>(null);
  const [inspirationCycle, setInspirationCycle] = useState<InspirationCycle | null>(null);
  
  // Interface state
  const [isBreathing, setIsBreathing] = useState(true);
  const [showBiometrics, setShowBiometrics] = useState(true);
  const [weavingMode, setWeavingMode] = useState<'auto' | 'manual'>('auto');
  const [atmosphereIntensity, setAtmosphereIntensity] = useState(0.7);
  
  // Configuration
  const [config, setConfig] = useState<WeavingConfig>({
    visualStyle: {
      threadThickness: 2,
      connectionOpacity: 0.7,
      atmosphereIntensity: 0.7,
      emotionalSaturation: 0.8,
    },
    interactionSensitivity: {
      gestureThreshold: 0.3,
      biometricSensitivity: 0.6,
      predictionAggression: 0.5,
    },
    cognitiveSettings: {
      geneStrengthThreshold: 0.4,
      connectionFormationRate: 0.6,
      atmosphereLayerCount: 4,
    },
  });

  // Refs for performance
  const contentRef = useRef<HTMLDivElement>(null);
  const weavingCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastContentUpdateRef = useRef<string>('');
  const thoughtGenerationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize atmosphere and session
  useEffect(() => {
    if (!isActive) return;

    // Initialize atmosphere
    const newAtmosphere: SynapticAtmosphereType = {
      id: `atmosphere-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      layers: [
        {
          id: 'surface',
          name: 'Surface Thoughts',
          depth: 0,
          visibility: 1,
          threads: [],
          connections: [],
          emotionalField: { temperature: 0, turbulence: 0, flow: { x: 0, y: 0, z: 0 } },
        },
        {
          id: 'conscious',
          name: 'Conscious Processing',
          depth: 0.3,
          visibility: 0.8,
          threads: [],
          connections: [],
          emotionalField: { temperature: 0, turbulence: 0.2, flow: { x: 0, y: 0, z: 0 } },
        },
        {
          id: 'subconscious',
          name: 'Subconscious Patterns',
          depth: 0.6,
          visibility: 0.6,
          threads: [],
          connections: [],
          emotionalField: { temperature: 0, turbulence: 0.4, flow: { x: 0, y: 0, z: 0 } },
        },
        {
          id: 'archetypal',
          name: 'Archetypal Connections',
          depth: 1,
          visibility: 0.4,
          threads: [],
          connections: [],
          emotionalField: { temperature: 0, turbulence: 0.6, flow: { x: 0, y: 0, z: 0 } },
        },
      ],
      focusPoint: { x: 0.5, y: 0.5, z: 0.5 },
      breathingCycle: {
        phase: 'inhale',
        duration: 8000,
        intensity: 0.7,
      },
    };

    setAtmosphere(newAtmosphere);

    // Initialize session
    const newSession: ThoughtWeaveSession = {
      id: `session-${Date.now()}`,
      userId,
      startTime: new Date(),
      threads: [],
      weavingActions: [],
      biometricData: [],
      cognitiveEvolution: {
        initialGenome: generateInitialGenome(),
        finalGenome: generateInitialGenome(),
        keyMutations: [],
      },
    };

    setCurrentSession(newSession);

    // Initialize cognitive genome
    setCognitiveGenome(generateInitialGenome());

    // Initialize inspiration cycle
    setInspirationCycle({
      id: `inspiration-${Date.now()}`,
      phase: 'gathering',
      duration: 5000,
      intensity: 0.5,
      contextSources: [],
      generatedInsights: [],
    });

  }, [isActive, userId]);

  // Generate initial cognitive genome
  const generateInitialGenome = useCallback((): CognitiveGenome => {
    return {
      id: `genome-${Date.now()}`,
      userId,
      genes: [
        {
          id: 'curiosity',
          type: 'emotional',
          pattern: 'inquiry-driven',
          strength: 0.7,
          firstSeen: new Date(),
          lastReinforced: new Date(),
          connections: [],
          emotionalSignature: { valence: 0.6, arousal: 0.8, dominance: 0.3 },
        },
        {
          id: 'analytical',
          type: 'logical',
          pattern: 'step-by-step',
          strength: 0.8,
          firstSeen: new Date(),
          lastReinforced: new Date(),
          connections: [],
          emotionalSignature: { valence: 0.3, arousal: 0.4, dominance: 0.7 },
        },
        {
          id: 'creative-synthesis',
          type: 'creative',
          pattern: 'connection-making',
          strength: 0.6,
          firstSeen: new Date(),
          lastReinforced: new Date(),
          connections: [],
          emotionalSignature: { valence: 0.8, arousal: 0.9, dominance: 0.5 },
        },
      ],
      dominantPatterns: {
        conceptual: ['systematic-thinking', 'pattern-recognition'],
        emotional: ['curiosity', 'excitement', 'contemplation'],
        logical: ['deductive-reasoning', 'evidence-based'],
        creative: ['analogical-thinking', 'synthesis'],
      },
      evolutionHistory: [],
      synapticNetwork: {
        nodes: ['curiosity', 'analytical', 'creative-synthesis'],
        edges: [],
        clusters: [],
      },
    };
  }, [userId]);

  // Generate AI suggestions based on content and biometrics
  const generateAISuggestions = useCallback(async (currentContent: string, biometrics?: BiometricSignature) => {
    if (!currentContent.trim()) return [];

    // Simulate AI thinking process
    const suggestions = [];
    
    // Base suggestions based on content
    const basesuggestions = [
      "This idea could benefit from a concrete example to illustrate the concept more clearly.",
      "Consider exploring the counterarguments to strengthen your position.",
      "What are the broader implications of this insight?",
      "How does this connect to your previous thoughts on this topic?",
      "This seems like a breakthrough moment - what led you to this realization?",
    ];

    // Modify suggestions based on biometric data
    if (biometrics) {
      if (biometrics.flowState.current > 0.7) {
        suggestions.push("You're in a flow state - consider diving deeper into this line of thinking.");
      }
      if (biometrics.cognitiveLoad.current > 0.7) {
        suggestions.push("You seem to be processing complex ideas. Take a moment to consolidate your thoughts.");
      }
      if (biometrics.confidence.current < 0.4) {
        suggestions.push("These ideas are developing well - trust your instincts and continue exploring.");
      }
    }

    // Add base suggestions
    suggestions.push(...basesuggestions.slice(0, 3));

    return suggestions;
  }, []);

  // Create thought threads from suggestions
  const createThoughtThreads = useCallback(async (suggestions: string[]) => {
    const newThreads: ThoughtThreadType[] = [];

    // Create foundation thread from current content
    if (content.trim()) {
      const foundationThread: ThoughtThreadType = {
        id: `foundation-${Date.now()}`,
        type: 'foundation',
        content: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
        geneticMarkers: cognitiveGenome?.genes || [],
        emotionalResonance: {
          temperature: 0.2,
          intensity: 0.8,
          pulseRate: 60,
        },
        weavability: 0.9,
        position: { x: 0.5, y: 0.3, z: 0.2 },
        connections: [],
        birthTimestamp: new Date(),
        lastInteraction: new Date(),
      };
      newThreads.push(foundationThread);
    }

    // Create suggestion threads
    suggestions.forEach((suggestion, index) => {
      const suggestionThread: ThoughtThreadType = {
        id: `suggestion-${Date.now()}-${index}`,
        type: 'suggestion',
        content: suggestion,
        geneticMarkers: cognitiveGenome?.genes.slice(0, 2) || [],
        emotionalResonance: {
          temperature: -0.1 + Math.random() * 0.8,
          intensity: 0.5 + Math.random() * 0.4,
          pulseRate: 45 + Math.random() * 30,
        },
        weavability: 0.6 + Math.random() * 0.3,
        position: { 
          x: 0.3 + Math.random() * 0.4, 
          y: 0.4 + Math.random() * 0.4, 
          z: 0.4 + Math.random() * 0.4 
        },
        connections: [],
        birthTimestamp: new Date(),
        lastInteraction: new Date(),
      };
      newThreads.push(suggestionThread);
    });

    return newThreads;
  }, [content, cognitiveGenome]);

  // Handle content changes and regenerate suggestions
  useEffect(() => {
    if (!isActive || content === lastContentUpdateRef.current) return;
    
    lastContentUpdateRef.current = content;

    // Debounce suggestion generation
    if (thoughtGenerationTimerRef.current) {
      clearTimeout(thoughtGenerationTimerRef.current);
    }

         thoughtGenerationTimerRef.current = setTimeout(async () => {
       const suggestions = await generateAISuggestions(content, biometricSignature || undefined);
       const newThreads = await createThoughtThreads(suggestions);
       setThreads(newThreads);
     }, 1000);

    return () => {
      if (thoughtGenerationTimerRef.current) {
        clearTimeout(thoughtGenerationTimerRef.current);
      }
    };
  }, [content, isActive, biometricSignature, generateAISuggestions, createThoughtThreads]);

  // Handle thread selection
  const handleThreadSelect = useCallback((thread: ThoughtThreadType) => {
    setSelectedThread(thread);
    
    // Update thread interaction timestamp
    const updatedThreads = threads.map(t => 
      t.id === thread.id ? { ...t, lastInteraction: new Date() } : t
    );
    setThreads(updatedThreads);
  }, [threads]);

  // Handle thread weaving
  const handleThreadWeave = useCallback((thread: ThoughtThreadType) => {
    if (!selectedThread || thread.id === selectedThread.id) return;

    // Create hybrid thread from weaving
    const hybridThread: ThoughtThreadType = {
      id: `hybrid-${Date.now()}`,
      type: 'hybrid',
      content: `${selectedThread.content} ${thread.content}`,
      geneticMarkers: [...selectedThread.geneticMarkers, ...thread.geneticMarkers],
      emotionalResonance: {
        temperature: (selectedThread.emotionalResonance.temperature + thread.emotionalResonance.temperature) / 2,
        intensity: Math.max(selectedThread.emotionalResonance.intensity, thread.emotionalResonance.intensity),
        pulseRate: (selectedThread.emotionalResonance.pulseRate + thread.emotionalResonance.pulseRate) / 2,
      },
      weavability: Math.min(selectedThread.weavability, thread.weavability) * 0.8,
      position: {
        x: (selectedThread.position.x + thread.position.x) / 2,
        y: (selectedThread.position.y + thread.position.y) / 2,
        z: (selectedThread.position.z + thread.position.z) / 2,
      },
      connections: [],
      birthTimestamp: new Date(),
      lastInteraction: new Date(),
    };

    // Update content with woven thoughts
    const weavedContent = hybridThread.content;
    onContentChange(weavedContent);

    // Add hybrid thread and remove original threads
    const updatedThreads = threads.filter(t => t.id !== selectedThread.id && t.id !== thread.id);
    updatedThreads.push(hybridThread);
    setThreads(updatedThreads);
    setSelectedThread(null);
  }, [selectedThread, threads, onContentChange]);

  // Handle atmosphere shift
  const handleAtmosphereShift = useCallback((focusPoint: { x: number; y: number; z: number }) => {
    if (!atmosphere) return;

    const updatedAtmosphere = {
      ...atmosphere,
      focusPoint,
    };
    setAtmosphere(updatedAtmosphere);
  }, [atmosphere]);

  // Handle biometric updates
  const handleBiometricUpdate = useCallback((signature: BiometricSignature) => {
    setBiometricSignature(signature);
    
    // Update session with biometric data
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        biometricData: [...currentSession.biometricData, signature],
      };
      setCurrentSession(updatedSession);
    }
  }, [currentSession]);

  // Update breathing cycle based on biometrics
  useEffect(() => {
    if (!atmosphere || !biometricSignature) return;

    const { flowState, cognitiveLoad } = biometricSignature;
    let newPhase: 'inhale' | 'hold' | 'exhale' | 'pause' = 'inhale';
    let newDuration = 8000;
    let newIntensity = 0.7;

    if (flowState.current > 0.7) {
      newPhase = 'hold';
      newDuration = 6000;
      newIntensity = 0.9;
    } else if (cognitiveLoad.current > 0.7) {
      newPhase = 'exhale';
      newDuration = 10000;
      newIntensity = 0.5;
    } else {
      newPhase = 'inhale';
      newDuration = 8000;
      newIntensity = 0.7;
    }

    setAtmosphere(prevAtmosphere => {
      if (!prevAtmosphere) return null;
      return {
        ...prevAtmosphere,
        breathingCycle: {
          phase: newPhase,
          duration: newDuration,
          intensity: newIntensity,
        },
      };
    });
  }, [biometricSignature]);

  if (!isActive || !atmosphere) return null;

  return (
    <div className="collaborative-consciousness-weaver">
      {/* Main Interface Grid */}
      <div className="interface-grid">
        {/* Biometric Sidebar */}
        <div className="biometric-sidebar">
          <BiometricTracker
            onBiometricUpdate={handleBiometricUpdate}
            isActive={showBiometrics}
            userId={userId}
          />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Content Editor */}
          <div 
            ref={contentRef}
            className="content-editor"
            contentEditable
            suppressContentEditableWarning={true}
            onInput={(e) => {
              const target = e.currentTarget;
              const newContent = target.textContent || '';
              // Prevent cursor jumping and reverse text issues
              const selection = window.getSelection();
              const cursorPosition = selection?.getRangeAt(0).startOffset || 0;
              
              onContentChange(newContent);
              
              // Restore cursor position after content update
              setTimeout(() => {
                if (selection && target.firstChild) {
                  const range = document.createRange();
                  const textNode = target.firstChild;
                  const maxPosition = textNode.textContent?.length || 0;
                  const safePosition = Math.min(cursorPosition, maxPosition);
                  
                  try {
                    range.setStart(textNode, safePosition);
                    range.setEnd(textNode, safePosition);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  } catch (error) {
                    // Handle edge cases gracefully
                    console.warn('Cursor position restoration failed:', error);
                  }
                }
              }, 0);
            }}
            onKeyDown={(e) => {
              // Prevent common contentEditable issues
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                document.execCommand('insertLineBreak');
              }
            }}
            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
          />

          {/* Real-time AI Suggestion Overlay */}
          <div className="ai-suggestion-overlay">
            {weavingMode === 'auto' && biometricSignature && (
              <div className="auto-suggestions">
                {biometricSignature.flowState.current > 0.7 && (
                  <div className="flow-suggestion">
                    ✨ You're in flow state - consider expanding this insight...
                  </div>
                )}
                {biometricSignature.cognitiveLoad.current > 0.7 && (
                  <div className="load-suggestion">
                    🧠 High cognitive load detected - take a moment to breathe...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Synaptic Atmosphere */}
          <div className="atmosphere-container">
            <SynapticAtmosphere
              atmosphere={atmosphere}
              threads={threads}
              onThreadSelect={handleThreadSelect}
              onThreadWeave={handleThreadWeave}
              onAtmosphereShift={handleAtmosphereShift}
              selectedThread={selectedThread}
              isBreathing={isBreathing}
            />
          </div>
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <div className="panel-section">
            <h3>Consciousness Controls</h3>
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={isBreathing}
                  onChange={(e) => setIsBreathing(e.target.checked)}
                />
                Breathing Cycle
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showBiometrics}
                  onChange={(e) => setShowBiometrics(e.target.checked)}
                />
                Biometric Tracking
              </label>
            </div>
          </div>

          <div className="panel-section">
            <h3>Weaving Mode</h3>
            <select
              value={weavingMode}
              onChange={(e) => setWeavingMode(e.target.value as 'auto' | 'manual')}
            >
              <option value="auto">Auto-Weaving</option>
              <option value="manual">Manual Weaving</option>
            </select>
            <div className="mode-description">
              {weavingMode === 'auto' ? (
                <span>🤖 AI automatically weaves thoughts based on your cognitive state</span>
              ) : (
                <span>✋ Manual control - click and drag to weave thoughts together</span>
              )}
            </div>
          </div>

          <div className="panel-section">
            <h3>Atmosphere Intensity</h3>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={atmosphereIntensity}
              onChange={(e) => setAtmosphereIntensity(parseFloat(e.target.value))}
            />
            <div className="intensity-value">{(atmosphereIntensity * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .collaborative-consciousness-weaver {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }

        .interface-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          grid-template-rows: 1fr auto;
          height: 100%;
          gap: 20px;
          padding: 20px;
        }

        .biometric-sidebar {
          grid-row: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          height: 100%;
        }

        .content-editor {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          outline: none;
          resize: none;
          overflow-y: auto;
          backdrop-filter: blur(10px);
          position: relative;
          min-height: 200px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }

        .content-editor:empty::before {
          content: "Begin weaving your thoughts...";
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          position: absolute;
          top: 20px;
          left: 20px;
          pointer-events: none;
        }

        .ai-suggestion-overlay {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          pointer-events: none;
        }

        .auto-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .flow-suggestion, .load-suggestion {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          color: #10B981;
          font-size: 12px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          animation: suggestionPulse 2s infinite;
          max-width: 200px;
        }

        .load-suggestion {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: #F59E0B;
        }

        @keyframes suggestionPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }

        .atmosphere-container {
          position: relative;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .control-panel {
          grid-column: 2;
          display: flex;
          gap: 30px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(10px);
          max-height: 200px;
        }

        .panel-section {
          flex: 1;
        }

        .panel-section h3 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .mode-description {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border-left: 3px solid #10B981;
        }

        .intensity-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin-top: 4px;
        }

        select, input[type="range"] {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: white;
          padding: 8px;
          font-size: 14px;
        }

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }

        input[type="range"] {
          width: 100%;
        }

        /* Responsive Design */
        @media (max-width: 1400px) {
          .interface-grid {
            grid-template-columns: 280px 1fr;
          }
        }

        @media (max-width: 1200px) {
          .interface-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
          }
          
          .biometric-sidebar {
            grid-row: 1;
            grid-column: 1;
          }
          
          .main-content {
            grid-row: 2;
            grid-column: 1;
          }
          
          .control-panel {
            grid-row: 3;
            grid-column: 1;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr;
          }
          
          .control-panel {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}; 