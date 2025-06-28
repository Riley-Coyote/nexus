'use client';

import React, { useState, useEffect } from 'react';
import { DreamStateMetrics, ActiveDreamer, DreamPatterns } from '@/lib/types';

interface DreamLeftSidebarProps {
  dreamStateMetrics: DreamStateMetrics;
  activeDreamers: ActiveDreamer[];
  dreamPatterns: DreamPatterns;
}

export default function DreamLeftSidebar({ 
  dreamStateMetrics, 
  activeDreamers, 
  dreamPatterns 
}: DreamLeftSidebarProps) {
  const [field, setField] = useState<string>('');

  useEffect(() => {
    const generateField = () => {
      const { rows, columns, characters } = dreamPatterns;
      let newField = '';
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const randomChar = characters[Math.floor(Math.random() * characters.length)];
          newField += randomChar;
        }
        if (row < rows - 1) newField += '\n';
      }
      
      setField(newField);
    };

    generateField();
    const interval = setInterval(generateField, 2000);
    
    return () => clearInterval(interval);
  }, [dreamPatterns]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'LUCID': return 'text-purple-400';
      case 'REM': return 'text-blue-400';
      case 'DEEP': return 'text-gray-400';
      default: return 'text-text-secondary';
    }
  };

  const getStateDotColor = (state: string) => {
    switch (state) {
      case 'LUCID': return 'bg-purple-400';
      case 'REM': return 'bg-blue-400';
      case 'DEEP': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <aside className="flex flex-col gap-6 p-6 overflow-y-auto glass-sidebar parallax-layer-2 depth-mid depth-responsive">
      {/* Dream Patterns Field Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">DREAM PATTERNS</h3>
        <div className="consciousness-field-container relative">
          <pre 
            id={dreamPatterns.id}
            className="consciousness-field font-mono text-xs leading-none text-text-quaternary whitespace-pre overflow-hidden"
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.05em',
              lineHeight: '1.2'
            }}
          >
            {field}
          </pre>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      </div>

      {/* Dream State Metrics Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">DREAM STATE METRICS</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Dream Frequency</span>
            <span className="text-text-primary text-sm font-light">{dreamStateMetrics.dreamFrequency.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Emotional Depth</span>
            <span className="text-text-primary text-sm font-light">{dreamStateMetrics.emotionalDepth.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Symbol Integration</span>
            <span className="text-text-primary text-sm font-light">{dreamStateMetrics.symbolIntegration.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Creative Emergence</span>
            <span className="text-text-primary text-sm font-light">{dreamStateMetrics.creativeEmergence.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Active Dreamers Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">ACTIVE DREAMERS</h3>
        <div className="space-y-3">
          {activeDreamers.map((dreamer, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getStateDotColor(dreamer.state)}`}></div>
                <span className="text-text-secondary text-sm">{dreamer.name}</span>
              </div>
              <span className={`text-xs font-medium ${getStateColor(dreamer.state)}`}>
                {dreamer.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
} 