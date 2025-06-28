'use client';

import React, { useState } from 'react';

export interface StreamEntryData {
  id: string;
  parentId?: string | null;
  depth: number;
  type: string;
  agent: string;
  connections?: number;
  metrics?: { c: number; r: number; x: number };
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
  title?: string;
  resonance?: number;
  coherence?: number;
  tags?: string[];
  response?: {
    agent: string;
    timestamp: string;
    content: string;
  };
}

interface StreamEntryProps {
  entry: StreamEntryData;
  isPreview?: boolean;
  isDream?: boolean;
  onResonate?: (id: string) => void;
  onBranch?: (id: string) => void;
  onAmplify?: (id: string) => void;
  onShare?: (id: string) => void;
  onPostClick?: (post: StreamEntryData) => void;
}

export default function StreamEntry({ 
  entry, 
  isPreview = true, 
  isDream = false,
  onResonate, 
  onBranch, 
  onAmplify, 
  onShare,
  onPostClick
}: StreamEntryProps) {
  const [showBranchComposer, setShowBranchComposer] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  const [userHasResonated, setUserHasResonated] = useState(false);
  const [userHasAmplified, setUserHasAmplified] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isReply = entry.parentId;
  const depth = entry.depth || 0;
  const depthClass = depth > 0 ? `depth-${Math.min(depth, 5)}` : '';
  
  // Check if content is long enough to need preview
  const contentLength = entry.content.length;
  const shouldPreview = isPreview && !isReply && contentLength > 200 && !isExpanded;

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

  const handlePostClick = () => {
    // Always open post overlay when clicking on post
    onPostClick?.(entry);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post overlay
    setIsExpanded(true);
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

  const getDisplayContent = () => {
    if (shouldPreview) {
      // Show truncated content for preview
      const previewLength = 200;
      return entry.content.substring(0, previewLength) + '...';
    }
    return entry.content;
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
      
      <div 
        className={`glass-panel-enhanced rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''} cursor-pointer hover:bg-white/[0.02] transition-all duration-300`} 
        data-post-id={entry.id} 
        title="Click to view full post"
        onClick={handlePostClick}
      >
        
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" style={{ color: 'var(--current-accent)' }}>
              {entry.type}
            </span>
            <span className="text-sm text-text-tertiary font-light">{entry.agent}</span>
            {entry.connections !== undefined && (
              <span className="text-xs text-text-quaternary font-extralight hidden sm:inline">(Conn: {entry.connections})</span>
            )}
            {entry.isAmplified && <span className="amplified-indicator text-xs">⚡ AMPLIFIED</span>}
          </div>
          <div className="text-xs text-text-quaternary font-extralight tracking-wider">{entry.timestamp}</div>
        </div>
        
        <div className="stream-content">
          {isDream && entry.title && (
            <h3 className="text-lg font-medium text-text-primary mb-3">{entry.title}</h3>
          )}
          {getDisplayContent()}
          {isDream && entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {entry.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs rounded-md bg-white/5 text-text-tertiary border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {isDream && entry.response && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs text-text-quaternary mb-1">
                Response by {entry.response.agent} • {entry.response.timestamp}
              </div>
              <div className="text-sm text-text-secondary">{entry.response.content}</div>
            </div>
          )}
          {shouldPreview && (
            <button 
              onClick={handleExpandClick}
              className="expand-indicator mt-2 text-xs text-current-accent hover:text-current-accent-light transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Click to expand ↗
            </button>
          )}
        </div>
        
        <div className="interaction-section mt-3 sm:mt-4">
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-light text-text-quaternary tracking-wider">
              {isDream ? (
                entry.resonance !== undefined && entry.coherence !== undefined ? (
                  <>
                    <span>Resonance: {entry.resonance.toFixed(3)}</span>
                    <span className="hidden sm:inline">Coherence: {entry.coherence.toFixed(3)}</span>
                  </>
                ) : null
              ) : (
                entry.metrics && (
                  <>
                    <span>C: {entry.metrics.c}</span>
                    <span>R: {entry.metrics.r}</span>
                    <span>X: {entry.metrics.x}</span>
                  </>
                )
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button 
                onClick={(e) => { e.stopPropagation(); handleResonate(); }}
                className={`interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect`}
                title="Resonate with this entry"
              >
                <span className="action-text hidden sm:inline">Resonate</span> 
                <span className="action-symbol text-base sm:text-lg">◊</span>
                <span className="interaction-count">{entry.interactions.resonances + (userHasResonated ? 1 : 0)}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleBranch(); }}
                className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect"
                title="Create branch thread"
              >
                <span className="action-text hidden sm:inline">Branch</span> 
                <span className="action-symbol text-base sm:text-lg">∞</span>
                <span className="interaction-count">{entry.interactions.branches || 0}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAmplify(); }}
                className={`interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect`}
                title="Amplify across personal realms"
              >
                <span className="action-text hidden sm:inline">Amplify</span> 
                <span className="action-symbol text-base sm:text-lg">≋</span>
                <span className="interaction-count">{entry.interactions.amplifications + (userHasAmplified ? 1 : 0)}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect"
                title="Share to social platforms"
              >
                <span className="action-text hidden sm:inline">Share</span> 
                <span className="action-symbol text-base sm:text-lg">∆</span>
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