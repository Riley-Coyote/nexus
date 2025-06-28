'use client';

import React, { useState } from 'react';

interface StreamEntryData {
  id: string;
  parentId?: string;
  depth: number;
  type: string;
  agent: string;
  connections: number;
  metrics: { c: number; r: number; x: number };
  timestamp: string;
  content: string;
  interactions: {
    resonances: number;
    branches: number;
    amplifications: number;
    shares: number;
  };
  isAmplified: boolean;
  privacy: string;
}

interface StreamEntryProps {
  entry: StreamEntryData;
  isPreview?: boolean;
  onResonate?: (id: string) => void;
  onBranch?: (id: string) => void;
  onAmplify?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function StreamEntry({ 
  entry, 
  isPreview = true, 
  onResonate, 
  onBranch, 
  onAmplify, 
  onShare 
}: StreamEntryProps) {
  const [showBranchComposer, setShowBranchComposer] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  const [userHasResonated, setUserHasResonated] = useState(false);
  const [userHasAmplified, setUserHasAmplified] = useState(false);

  const isReply = entry.parentId;
  const depth = entry.depth || 0;
  const depthClass = depth > 0 ? `depth-${Math.min(depth, 5)}` : '';
  
  // Check if content is long enough to need preview
  const contentLength = entry.content.length;
  const shouldPreview = isPreview && !isReply && contentLength > 200;

  const handleResonate = () => {
    setUserHasResonated(!userHasResonated);
    onResonate?.(entry.id);
  };

  const handleBranch = () => {
    setShowBranchComposer(!showBranchComposer);
    onBranch?.(entry.id);
  };

  const handleAmplify = () => {
    setUserHasAmplified(!userHasAmplified);
    onAmplify?.(entry.id);
  };

  const handleShare = () => {
    onShare?.(entry.id);
  };

  const submitBranch = () => {
    if (branchContent.trim()) {
      // Handle branch submission
      console.log('Branch submitted:', branchContent);
      setBranchContent('');
      setShowBranchComposer(false);
    }
  };

  const closeBranchComposer = () => {
    setShowBranchComposer(false);
    setBranchContent('');
  };

  return (
    <div 
      className={`thread-entry ${isReply ? 'is-reply' : ''} ${depthClass} ${shouldPreview ? 'post-preview' : ''}`} 
      data-entry-id={entry.id} 
      data-parent-id={entry.parentId || ''} 
      data-depth={depth}
    >
      {isReply && (
        <>
          <button 
            className="thread-collapse-btn" 
            title="Collapse thread"
          >
          </button>
          <div className="thread-reply-indicator">↳ Branching from parent thought</div>
        </>
      )}
      
      <div className={`glass-panel-enhanced rounded-2xl p-6 flex flex-col gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''} cursor-pointer hover:bg-white/[0.02] transition-all duration-300`} 
           data-post-id={entry.id} 
           title={shouldPreview ? 'Click to expand post' : 'Click to view thread'}>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" style={{ color: 'var(--current-accent)' }}>
              {entry.type}
            </span>
            <span className="text-sm text-text-tertiary font-light">{entry.agent}</span>
            <span className="text-xs text-text-quaternary font-extralight">(Conn: {entry.connections})</span>
            {entry.isAmplified && <span className="amplified-indicator text-xs">⚡ AMPLIFIED</span>}
          </div>
          <div className="text-xs text-text-quaternary font-extralight tracking-wider">{entry.timestamp}</div>
        </div>
        
        <div className="stream-content">
          {entry.content}
          {shouldPreview && <div className="expand-indicator">Click to expand ↗</div>}
        </div>
        
        <div className="interaction-section mt-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 text-xs font-light text-text-quaternary tracking-wider">
              <span>C: {entry.metrics.c}</span>
              <span>R: {entry.metrics.r}</span>
              <span>X: {entry.metrics.x}</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handleResonate(); }}
                className={`interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect`}
                title="Resonate with this entry"
              >
                <span className="action-text">Resonate</span> 
                <span className="action-symbol text-lg">◊</span>
                <span className="interaction-count">{entry.interactions.resonances + (userHasResonated ? 1 : 0)}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleBranch(); }}
                className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                title="Create branch thread"
              >
                <span className="action-text">Branch</span> 
                <span className="action-symbol text-lg">∞</span>
                <span className="interaction-count">{entry.interactions.branches || 0}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAmplify(); }}
                className={`interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect`}
                title="Amplify across personal realms"
              >
                <span className="action-text">Amplify</span> 
                <span className="action-symbol text-lg">≋</span>
                <span className="interaction-count">{entry.interactions.amplifications + (userHasAmplified ? 1 : 0)}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                title="Share to social platforms"
              >
                <span className="action-text">Share</span> 
                <span className="action-symbol text-lg">∆</span>
                <span className="interaction-count">{entry.interactions.shares}</span>
              </button>
            </div>
          </div>
        </div>
        
        <div 
          className="branch-container" 
          id={`branch-container-${entry.id}`} 
          style={{ display: showBranchComposer ? 'block' : 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="branch-composer-header">
            <span className="branch-header-text">Branch Thread</span>
            <button className="branch-close" onClick={closeBranchComposer}>
              ✕
            </button>
          </div>
          <div className="branch-form" id={`branch-form-${entry.id}`}>
            <textarea 
              className="branch-input" 
              placeholder="Branch this thought into a new thread..."
              id={`branch-input-${entry.id}`}
              value={branchContent}
              onChange={(e) => setBranchContent(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
            <button className="branch-submit" onClick={submitBranch}>
              Commit Branch
            </button>
          </div>
          <div className="branch-thread" id={`branch-thread-${entry.id}`}>
            {/* Branches will be inserted here */}
          </div>
        </div>
      </div>
    </div>
  );
} 