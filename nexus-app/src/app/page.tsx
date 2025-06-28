'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { JournalMode, ViewMode } from '@/lib/types';

export default function HomePage() {
  const [currentMode, setCurrentMode] = useState<JournalMode>('logbook');
  const [currentView, setCurrentView] = useState<ViewMode>('feed');

  // Data from the original application
  const logbookData = {
    logbookState: {
      awarenessLevel: 0.89,
      reflectionDepth: 0.68,
      fieldResonance: 0.52
    },
    logbookField: {
      id: 'logbook-field',
      rows: 16,
      columns: 44,
      characters: [' ', '·', '∘', '○', '●']
    },
    networkStatus: {
      nodes: "1,247",
      activeMessages: 42,
      dreamEntries: 21,
      entropy: 0.234
    }
  };

  return (
    <div className="relative z-10 h-screen w-full flex flex-col parallax-layer-3 bg-deep-void text-text-primary font-mono font-extralight">
      {/* WebGL Canvas placeholder */}
      <canvas id="webgl-canvas" className="fixed top-0 left-0 w-full h-full z-0"></canvas>
      
      <div id="app-container" className="relative z-10 h-screen w-full flex flex-col parallax-layer-3">
        <Header 
          currentMode={currentMode}
          currentView={currentView}
          onModeChange={setCurrentMode}
          onViewChange={setCurrentView}
        />
        
        <div className="flex-grow w-full max-w-[1600px] mx-auto grid grid-cols-[320px_1fr_320px] gap-8 overflow-hidden main-layout atmosphere-layer-2">
          <LeftSidebar 
            logbookState={logbookData.logbookState}
            networkStatus={logbookData.networkStatus}
            consciousnessField={logbookData.logbookField}
          />
          
          <main className="py-8 px-10 flex flex-col gap-8 overflow-y-auto parallax-layer-3 atmosphere-layer-2">
            <div className="text-lg text-text-primary">Main Content Area</div>
            <div className="text-sm text-text-secondary">Current Mode: <span className="text-current-accent">{currentMode}</span></div>
            <div className="text-sm text-text-secondary">Current View: <span className="text-current-accent">{currentView}</span></div>
            <div className="text-xs text-text-quaternary">
              This is where the main feed/content will be displayed. The header above should look exactly like the original.
              The left sidebar now contains the three panels: Logbook State, Consciousness Field (with animated ASCII), and Network Status.
            </div>
          </main>
          
          <div className="flex flex-col gap-6 p-6 overflow-y-auto glass-sidebar parallax-layer-2 depth-mid depth-responsive">
            <div className="text-sm text-text-secondary">Right Sidebar</div>
            <div className="text-xs text-text-quaternary">Sidebar content will go here</div>
          </div>
        </div>
      </div>
    </div>
  );
} 