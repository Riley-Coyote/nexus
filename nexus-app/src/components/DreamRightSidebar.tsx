'use client';

import React from 'react';
import { DreamAnalytics } from '@/lib/types';

interface DreamRightSidebarProps {
  dreamAnalytics: DreamAnalytics;
  emergingSymbols: string[];
}

export default function DreamRightSidebar({ 
  dreamAnalytics, 
  emergingSymbols 
}: DreamRightSidebarProps) {
  return (
    <aside className="flex flex-col gap-6 p-6 overflow-y-auto glass-sidebar parallax-layer-2 depth-mid depth-responsive">
      {/* Dream Analytics Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">DREAM ANALYTICS</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Total Dreams:</span>
            <span className="text-text-primary text-sm font-light">{dreamAnalytics.totalDreams}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Avg Resonance:</span>
            <span className="text-text-primary text-sm font-light">{dreamAnalytics.avgResonance.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Symbol Diversity:</span>
            <span className="text-text-primary text-sm font-light">{dreamAnalytics.symbolDiversity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-quaternary text-xs tracking-wider">Response Rate:</span>
            <span className="text-text-primary text-sm font-light">{dreamAnalytics.responseRate}</span>
          </div>
        </div>
      </div>

      {/* Emerging Symbols Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">EMERGING SYMBOLS</h3>
        <div className="grid grid-cols-2 gap-2">
          {emergingSymbols.map((symbol, index) => (
            <div 
              key={index}
              className="text-xs text-text-tertiary hover:text-current-accent transition-colors cursor-pointer"
            >
              {symbol}
            </div>
          ))}
        </div>
      </div>

      {/* Dream Connections Panel */}
      <div className="glass-panel rounded-xl p-5 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="text-text-secondary text-sm font-light mb-4 tracking-wide">DREAM CONNECTIONS</h3>
        <div className="text-center py-8">
          <div className="text-6xl text-purple-400 mb-4">
            ∞
          </div>
          <button className="interactive-btn w-full py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-current-accent border border-white/10 hover:border-current-accent/30 transition-all duration-300 ripple-effect">
            Explore
          </button>
        </div>
      </div>
    </aside>
  );
} 