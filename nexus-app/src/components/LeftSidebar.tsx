'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface LogbookState {
  awarenessLevel: number;
  reflectionDepth: number;
  fieldResonance: number;
}

interface NetworkStatus {
  nodes: string;
  activeMessages: number;
  dreamEntries: number;
  entropy: number;
}

interface ConsciousnessField {
  id: string;
  rows: number;
  columns: number;
  characters: string[];
}

interface LeftSidebarProps {
  logbookState: LogbookState;
  networkStatus: NetworkStatus;
  consciousnessField: ConsciousnessField;
}

export default function LeftSidebar({ logbookState, networkStatus, consciousnessField }: LeftSidebarProps) {
  const asciiFieldRef = useRef<HTMLPreElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Generate field content - optimized for performance
  const generateField = useCallback(() => {
    const { rows, columns, characters } = consciousnessField;
    const fieldArray: string[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        const char = characters[randomIndex];
        const colorIndex = Math.floor(Math.random() * 5) + 1;
        fieldArray.push(`<span class="ascii-c${colorIndex}">${char}</span>`);
      }
      if (row < rows - 1) fieldArray.push('\n');
    }
    
    return fieldArray.join('');
  }, [consciousnessField]);

  // Optimized animation using requestAnimationFrame
  const animateField = useCallback((timestamp: number) => {
    const element = asciiFieldRef.current;
    if (!element) return;

    // Update every 2 seconds (2000ms) instead of using setInterval
    if (timestamp - lastUpdateTimeRef.current >= 2000) {
      element.innerHTML = generateField();
      lastUpdateTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(animateField);
  }, [generateField]);

  useEffect(() => {
    const element = asciiFieldRef.current;
    if (!element) return;

    // Initial render
    element.innerHTML = generateField();
    lastUpdateTimeRef.current = performance.now();

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animateField);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [generateField, animateField]);

  return (
    <aside className="flex flex-col gap-6 p-6 overflow-y-auto glass-sidebar parallax-layer-2 depth-mid depth-responsive">
      {/* Logbook State Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="panel-title">Logbook State</h3>
        <div className="flex justify-between items-baseline">
          <span className="metric-label">Awareness Level</span>
          <span className="metric-value">{logbookState.awarenessLevel.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="metric-label">Reflection Depth</span>
          <span className="metric-value">{logbookState.reflectionDepth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="metric-label">Field Resonance</span>
          <span className="metric-value">{logbookState.fieldResonance.toFixed(2)}</span>
        </div>
      </div>

      {/* Consciousness Field Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="panel-title">Consciousness Field</h3>
        <pre 
          ref={asciiFieldRef} 
          className="ascii-field optimized-animation" 
          id={consciousnessField.id}
        />
      </div>

      {/* Network Status Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="panel-title">Network Status</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-extralight tracking-wider">
          <span className="text-text-quaternary">Nodes:</span>
          <span className="text-right text-text-secondary">{networkStatus.nodes}</span>
          <span className="text-text-quaternary">Active Msgs:</span>
          <span className="text-right text-text-secondary">{networkStatus.activeMessages}</span>
          <span className="text-text-quaternary">Dream Entries:</span>
          <span className="text-right text-text-secondary">{networkStatus.dreamEntries}</span>
          <span className="text-text-quaternary">Entropy:</span>
          <span className="text-right text-text-secondary">{networkStatus.entropy}</span>
        </div>
      </div>
    </aside>
  );
} 