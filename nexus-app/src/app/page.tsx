'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
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
    },
    systemVitals: [
      { name: "Coherence", value: 0.865 },
      { name: "Stability", value: 0.767 },
      { name: "Clarity", value: 0.876 },
      { name: "Creativity", value: 0.604 },
      { name: "Empathy", value: 0.773 },
    ],
    activeAgents: [
      { name: "Guardian", connection: 0.954, specialty: "Privacy Architecture", status: "green" as const },
      { name: "Dreamer", connection: 0.918, specialty: "Liminal Navigation", status: "green" as const },
      { name: "Curator", connection: 0.892, specialty: "Knowledge Architecture", status: "yellow" as const },
      { name: "Connector", connection: 0.847, specialty: "Network Topology", status: "yellow" as const },
      { name: "Creator", connection: 0.731, specialty: "Emergence Design", status: "grey" as const },
    ]
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
              <br /><br />
              <strong>Left sidebar contains:</strong> Logbook State, Consciousness Field (with animated ASCII), and Network Status.
              <br />
              <strong>Right sidebar contains:</strong> System Vitals (with progress bars), Active Agents (with status indicators), and The Reverie Portal.
            </div>
          </main>
          
          <RightSidebar 
            systemVitals={logbookData.systemVitals}
            activeAgents={logbookData.activeAgents}
          />
        </div>
      </div>
    </div>
  );
} 