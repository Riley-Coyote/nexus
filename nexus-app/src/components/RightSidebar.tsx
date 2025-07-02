'use client';

import React from 'react';

interface SystemVital {
  name: string;
  value: number;
}

interface ActiveAgent {
  name: string;
  connection: number;
  specialty: string;
  status: 'green' | 'yellow' | 'grey';
}

interface RightSidebarProps {
  systemVitals: SystemVital[];
  activeAgents: ActiveAgent[];
  onReverieClick?: () => void;
}

export default function RightSidebar({ systemVitals, activeAgents, onReverieClick }: RightSidebarProps) {
  const handleReverieClick = () => {
    if (onReverieClick) {
      onReverieClick();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-emerald-400';
      case 'yellow': return 'bg-yellow-400';
      case 'grey': 
      default: return 'bg-gray-500';
    }
  };

  return (
    <aside className="flex flex-col gap-6 p-6 overflow-y-auto glass-sidebar parallax-layer-2 depth-mid depth-responsive">
      {/* System Vitals Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="panel-title">System Vitals</h3>
        <div className="flex flex-col gap-3">
          {systemVitals.map((vital, index) => (
            <div key={index} className="w-full">
              <div className="flex justify-between items-baseline mb-1">
                <span className="metric-label">{vital.name}</span>
                <span className="text-sm font-light text-text-secondary">{vital.value.toFixed(3)}</span>
              </div>
              <div className="w-full bg-black/20 h-1 rounded-full overflow-hidden">
                <div 
                  className="h-1 rounded-full transition-all duration-1000 ease-out" 
                  style={{ 
                    width: `${vital.value * 100}%`, 
                    backgroundColor: 'var(--current-accent)' 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Agents Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <h3 className="panel-title">Active Agents</h3>
        <div className="flex flex-col gap-3">
          {activeAgents.map((agent, index) => (
            <div key={index} className="glass-card rounded-lg p-3 flex items-start gap-3 shadow-level-1 interactive-panel">
              <div className={`status-dot mt-1.5 ${getStatusColor(agent.status)}`}></div>
              <div className="flex-grow">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-sm font-light text-text-secondary">{agent.name}</h4>
                  <span className="text-xs text-text-tertiary">{agent.connection.toFixed(3)}</span>
                </div>
                <p className="text-xs text-text-quaternary font-extralight">{agent.specialty}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Reverie Portal Panel */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1 reverie-container">
        <h3 className="panel-title">The Reverie Portal</h3>
        <div className="reverie-portal flex flex-col items-center justify-center text-center gap-4 p-4 rounded-lg">
          <div 
            className="text-6xl font-thin transition-transform duration-1000 hover:scale-110" 
            style={{ color: 'var(--current-accent)', opacity: 0.7 }}
          >
            ∞
          </div>
          <button 
            onClick={handleReverieClick}
            className="text-sm font-light tracking-wider interactive-btn bg-black/20 hover:bg-emerald-active/20 px-4 py-2 rounded-md transition-colors ripple-effect"
          >
            Enter Reverie
          </button>
        </div>
      </div>
    </aside>
  );
} 