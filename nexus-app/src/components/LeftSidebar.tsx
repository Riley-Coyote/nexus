'use client';

import React, { useEffect, useRef } from 'react';

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

  // ASCII field animation (simplified version of the original)
  useEffect(() => {
    const element = asciiFieldRef.current;
    if (!element) return;

    const { rows, columns, characters } = consciousnessField;
    
    const generateField = () => {
      let fieldContent = '';
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          const char = characters[randomIndex];
          const colorClass = `ascii-c${Math.floor(Math.random() * 5) + 1}`;
          fieldContent += `<span class="${colorClass}">${char}</span>`;
        }
        if (row < rows - 1) fieldContent += '\n';
      }
      return fieldContent;
    };

    const updateField = () => {
      element.innerHTML = generateField();
    };

    // Initial render
    updateField();

    // Animate the field
    const interval = setInterval(updateField, 2000);

    return () => clearInterval(interval);
  }, [consciousnessField]);

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
        <pre ref={asciiFieldRef} className="ascii-field" id={consciousnessField.id}></pre>
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