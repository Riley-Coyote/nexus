import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BiometricSignature } from '../types';

interface BiometricTrackerProps {
  onBiometricUpdate: (signature: BiometricSignature) => void;
  isActive: boolean;
  userId: string;
}

export const BiometricTracker: React.FC<BiometricTrackerProps> = ({
  onBiometricUpdate,
  isActive,
  userId,
}) => {
  const [currentSignature, setCurrentSignature] = useState<BiometricSignature>({
    id: `bio-${Date.now()}`,
    userId,
    typingPressure: [],
    pausePatterns: [],
    keystrokeRhythm: [],
    flowState: {
      current: 0,
      average: 0,
      peakDuration: 0,
      lastPeak: new Date(),
    },
    cognitiveLoad: {
      current: 0,
      backspaceFrequency: 0,
      revisionPatterns: [],
    },
    confidence: {
      current: 0,
      wordChoiceHesitation: 0,
      sentenceRestructuring: 0,
    },
  });

  const keystrokeTimestamps = useRef<number[]>([]);
  const pauseStartTime = useRef<number>(0);
  const lastKeystrokeTime = useRef<number>(0);
  const backspaceCount = useRef<number>(0);
  const totalKeystrokes = useRef<number>(0);
  const sessionStartTime = useRef<number>(Date.now());
  const flowStateBuffer = useRef<number[]>([]);
  const cognitiveLoadBuffer = useRef<number[]>([]);
  const confidenceBuffer = useRef<number[]>([]);

  // Advanced pattern detection
  const [patterns, setPatterns] = useState({
    burstTyping: false,
    rhythmicTyping: false,
    hesitationPhase: false,
    flowState: false,
    cognitiveOverload: false,
  });

  // Calculate flow state based on typing rhythm and consistency
  const calculateFlowState = useCallback(() => {
    if (keystrokeTimestamps.current.length < 10) return 0;

    const recentTimestamps = keystrokeTimestamps.current.slice(-20);
    const intervals = recentTimestamps.slice(1).map((time, i) => time - recentTimestamps[i]);
    
    // Flow state indicators:
    // 1. Consistent rhythm (low variance in keystroke intervals)
    // 2. Sustained activity (no long pauses)
    // 3. Momentum (gradually increasing speed)
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const consistency = Math.max(0, 1 - variance / (avgInterval * avgInterval));
    
    // Check for sustained activity (no pauses > 3 seconds)
    const longPauses = intervals.filter(interval => interval > 3000).length;
    const sustainability = Math.max(0, 1 - longPauses / intervals.length);
    
    // Check for momentum (increasing speed over time)
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
    const momentum = Math.max(0, Math.min(1, (firstAvg - secondAvg) / firstAvg));
    
    const flowScore = (consistency * 0.4 + sustainability * 0.4 + momentum * 0.2);
    flowStateBuffer.current.push(flowScore);
    
    // Keep only last 50 measurements
    if (flowStateBuffer.current.length > 50) {
      flowStateBuffer.current.shift();
    }
    
    return flowScore;
  }, []);

  // Calculate cognitive load based on revision patterns and pause frequency
  const calculateCognitiveLoad = useCallback(() => {
    const now = Date.now();
    const timeWindow = 30000; // 30 seconds
    const recentKeystrokes = keystrokeTimestamps.current.filter(time => now - time < timeWindow);
    const recentPauses = currentSignature.pausePatterns.filter(pause => pause > 1000); // Pauses > 1 second
    
    // Cognitive load indicators:
    // 1. High backspace frequency
    // 2. Long pauses (thinking time)
    // 3. Irregular rhythm
    // 4. Decreasing speed over time
    
    const backspaceRatio = totalKeystrokes.current > 0 ? backspaceCount.current / totalKeystrokes.current : 0;
    const pauseFrequency = recentPauses.length / Math.max(1, recentKeystrokes.length);
    const rhythmVariance = keystrokeTimestamps.current.length > 5 ? 
      calculateRhythmVariance(keystrokeTimestamps.current.slice(-20)) : 0;
    
    const loadScore = Math.min(1, backspaceRatio * 0.4 + pauseFrequency * 0.4 + rhythmVariance * 0.2);
    cognitiveLoadBuffer.current.push(loadScore);
    
    if (cognitiveLoadBuffer.current.length > 50) {
      cognitiveLoadBuffer.current.shift();
    }
    
    return loadScore;
  }, [currentSignature.pausePatterns]);

  // Calculate confidence based on word choice hesitation and sentence restructuring
  const calculateConfidence = useCallback(() => {
    const recentRevisions = currentSignature.cognitiveLoad.revisionPatterns.slice(-10);
    const shortPauses = currentSignature.pausePatterns.filter(pause => pause > 200 && pause < 1000);
    
    // Confidence indicators:
    // 1. Low word choice hesitation (short pauses)
    // 2. Few sentence restructuring events
    // 3. Consistent forward progress
    
    const hesitationScore = Math.min(1, shortPauses.length / 20);
    const revisionScore = Math.min(1, recentRevisions.length / 5);
    const confidenceScore = Math.max(0, 1 - hesitationScore * 0.6 - revisionScore * 0.4);
    
    confidenceBuffer.current.push(confidenceScore);
    
    if (confidenceBuffer.current.length > 50) {
      confidenceBuffer.current.shift();
    }
    
    return confidenceScore;
  }, [currentSignature.pausePatterns, currentSignature.cognitiveLoad.revisionPatterns]);

  // Helper function to calculate rhythm variance
  const calculateRhythmVariance = (timestamps: number[]) => {
    if (timestamps.length < 3) return 0;
    
    const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]);
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return Math.min(1, variance / (avgInterval * avgInterval));
  };

  // Handle keystroke event
  const handleKeystroke = useCallback((event: KeyboardEvent) => {
    if (!isActive) return;
    
    const now = Date.now();
    const timeSinceLastKey = now - lastKeystrokeTime.current;
    
    // Record keystroke timing
    keystrokeTimestamps.current.push(now);
    if (keystrokeTimestamps.current.length > 100) {
      keystrokeTimestamps.current.shift();
    }
    
    // Record pause if there was one
    if (timeSinceLastKey > 100) { // Minimum pause threshold
      currentSignature.pausePatterns.push(timeSinceLastKey);
      if (currentSignature.pausePatterns.length > 100) {
        currentSignature.pausePatterns.shift();
      }
    }
    
    // Track backspaces
    if (event.key === 'Backspace') {
      backspaceCount.current++;
    }
    
    totalKeystrokes.current++;
    lastKeystrokeTime.current = now;
    
    // Update rhythm data
    if (keystrokeTimestamps.current.length >= 2) {
      const lastInterval = keystrokeTimestamps.current[keystrokeTimestamps.current.length - 1] - 
                          keystrokeTimestamps.current[keystrokeTimestamps.current.length - 2];
      currentSignature.keystrokeRhythm.push(lastInterval);
      if (currentSignature.keystrokeRhythm.length > 100) {
        currentSignature.keystrokeRhythm.shift();
      }
    }
    
    // Simulate typing pressure (would be real in actual implementation)
    const simulatedPressure = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
    currentSignature.typingPressure.push(simulatedPressure);
    if (currentSignature.typingPressure.length > 100) {
      currentSignature.typingPressure.shift();
    }
    
  }, [isActive, currentSignature]);

  // Detect advanced patterns
  const detectPatterns = useCallback(() => {
    const recentRhythm = currentSignature.keystrokeRhythm.slice(-20);
    const recentPauses = currentSignature.pausePatterns.slice(-10);
    
    // Burst typing: rapid keystrokes with short intervals
    const burstTyping = recentRhythm.length > 10 && 
      recentRhythm.filter(interval => interval < 150).length > recentRhythm.length * 0.7;
    
    // Rhythmic typing: consistent intervals
    const rhythmicTyping = recentRhythm.length > 10 && 
      calculateRhythmVariance(keystrokeTimestamps.current.slice(-20)) < 0.3;
    
    // Hesitation phase: long pauses and irregular rhythm
    const hesitationPhase = recentPauses.length > 0 && 
      recentPauses.filter(pause => pause > 2000).length > recentPauses.length * 0.3;
    
    // Flow state: sustained rhythmic typing with low cognitive load
    const flowState = rhythmicTyping && !hesitationPhase && 
      currentSignature.flowState.current > 0.7;
    
    // Cognitive overload: high backspace frequency and long pauses
    const cognitiveOverload = currentSignature.cognitiveLoad.current > 0.7 && 
      currentSignature.cognitiveLoad.backspaceFrequency > 0.2;
    
    setPatterns({
      burstTyping,
      rhythmicTyping,
      hesitationPhase,
      flowState,
      cognitiveOverload,
    });
  }, [currentSignature]);

  // Update biometric signature
  const updateSignature = useCallback(() => {
    if (!isActive) return;
    
    const flowScore = calculateFlowState();
    const loadScore = calculateCognitiveLoad();
    const confidenceScore = calculateConfidence();
    
    const updatedSignature: BiometricSignature = {
      ...currentSignature,
      flowState: {
        current: flowScore,
        average: flowStateBuffer.current.reduce((sum, score) => sum + score, 0) / flowStateBuffer.current.length,
        peakDuration: flowScore > 0.8 ? Date.now() - sessionStartTime.current : 0,
        lastPeak: flowScore > 0.8 ? new Date() : currentSignature.flowState.lastPeak,
      },
      cognitiveLoad: {
        current: loadScore,
        backspaceFrequency: totalKeystrokes.current > 0 ? backspaceCount.current / totalKeystrokes.current : 0,
        revisionPatterns: currentSignature.cognitiveLoad.revisionPatterns,
      },
      confidence: {
        current: confidenceScore,
        wordChoiceHesitation: currentSignature.pausePatterns.filter(pause => pause > 200 && pause < 1000).length,
        sentenceRestructuring: currentSignature.cognitiveLoad.revisionPatterns.length,
      },
    };
    
    setCurrentSignature(updatedSignature);
    onBiometricUpdate(updatedSignature);
    detectPatterns();
  }, [isActive, calculateFlowState, calculateCognitiveLoad, calculateConfidence, currentSignature, onBiometricUpdate, detectPatterns]);

  // Set up event listeners
  useEffect(() => {
    if (!isActive) return;
    
    document.addEventListener('keydown', handleKeystroke);
    
    // Update signature every 2 seconds
    const interval = setInterval(updateSignature, 2000);
    
    return () => {
      document.removeEventListener('keydown', handleKeystroke);
      clearInterval(interval);
    };
  }, [isActive, handleKeystroke, updateSignature]);

  // Visualization component for biometric data
  const BiometricVisualization: React.FC = () => (
    <div className="biometric-visualization">
      <div className="metrics-grid">
        <div className="metric-card flow-state">
          <div className="metric-label">Flow State</div>
          <div className="metric-value">
            {(currentSignature.flowState.current * 100).toFixed(0)}%
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${currentSignature.flowState.current * 100}%`,
                backgroundColor: currentSignature.flowState.current > 0.7 ? '#10B981' : '#F59E0B'
              }}
            />
          </div>
        </div>
        
        <div className="metric-card cognitive-load">
          <div className="metric-label">Cognitive Load</div>
          <div className="metric-value">
            {(currentSignature.cognitiveLoad.current * 100).toFixed(0)}%
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${currentSignature.cognitiveLoad.current * 100}%`,
                backgroundColor: currentSignature.cognitiveLoad.current > 0.7 ? '#EF4444' : '#F59E0B'
              }}
            />
          </div>
        </div>
        
        <div className="metric-card confidence">
          <div className="metric-label">Confidence</div>
          <div className="metric-value">
            {(currentSignature.confidence.current * 100).toFixed(0)}%
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${currentSignature.confidence.current * 100}%`,
                backgroundColor: currentSignature.confidence.current > 0.7 ? '#10B981' : '#F59E0B'
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="pattern-indicators">
        {patterns.flowState && (
          <div className="pattern-badge flow">🌊 Flow State</div>
        )}
        {patterns.burstTyping && (
          <div className="pattern-badge burst">⚡ Burst Typing</div>
        )}
        {patterns.rhythmicTyping && (
          <div className="pattern-badge rhythmic">🎵 Rhythmic</div>
        )}
        {patterns.hesitationPhase && (
          <div className="pattern-badge hesitation">🤔 Hesitation</div>
        )}
        {patterns.cognitiveOverload && (
          <div className="pattern-badge overload">🧠 Overload</div>
        )}
      </div>
    </div>
  );

  if (!isActive) return null;

  return (
    <div className="biometric-tracker">
      <BiometricVisualization />
      
      <style jsx>{`
        .biometric-tracker {
          position: relative;
          width: 100%;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }
        
        .biometric-visualization {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .metric-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 4px;
        }
        
        .metric-value {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }
        
        .metric-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .metric-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }
        
        .pattern-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .pattern-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          animation: patternPulse 2s infinite;
        }
        
        .pattern-badge.flow {
          background: rgba(16, 185, 129, 0.2);
          color: #10B981;
          border: 1px solid #10B981;
        }
        
        .pattern-badge.burst {
          background: rgba(245, 158, 11, 0.2);
          color: #F59E0B;
          border: 1px solid #F59E0B;
        }
        
        .pattern-badge.rhythmic {
          background: rgba(139, 92, 246, 0.2);
          color: #8B5CF6;
          border: 1px solid #8B5CF6;
        }
        
        .pattern-badge.hesitation {
          background: rgba(239, 68, 68, 0.2);
          color: #EF4444;
          border: 1px solid #EF4444;
        }
        
        .pattern-badge.overload {
          background: rgba(239, 68, 68, 0.2);
          color: #EF4444;
          border: 1px solid #EF4444;
        }
        
        @keyframes patternPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}; 