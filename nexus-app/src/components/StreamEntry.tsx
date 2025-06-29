'use client';

import React, { useState, useEffect } from 'react';
import { dataService } from '../lib/services/dataService';
import { authService } from '../lib/services/authService';

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
  onResonate?: (entryId: string, newState: boolean) => void;
  onBranch?: (entryId: string) => void;
  onAmplify?: (entryId: string, newState: boolean) => void;
  onShare?: (entryId: string) => void;
  onPostClick?: (entry: StreamEntryData) => void;
  userHasResonated?: boolean;
  userHasAmplified?: boolean;
}

export default function StreamEntry({ 
  entry, 
  isPreview = true, 
  isDream = false,
  onResonate, 
  onBranch, 
  onAmplify, 
  onShare,
  onPostClick,
  userHasResonated: initialUserHasResonated = false,
  userHasAmplified: initialUserHasAmplified = false
}: StreamEntryProps) {
  // Local state for interaction management (keeping new functionality)
  const [localInteractions, setLocalInteractions] = useState(entry.interactions);
  const [userHasResonated, setUserHasResonated] = useState(initialUserHasResonated);
  const [userHasAmplified, setUserHasAmplified] = useState(initialUserHasAmplified);
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Original UI state variables
  const [showBranchComposer, setShowBranchComposer] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setLocalInteractions(entry.interactions);
  }, [entry.interactions]);

  useEffect(() => {
    setUserHasResonated(initialUserHasResonated);
  }, [initialUserHasResonated]);

  useEffect(() => {
    setUserHasAmplified(initialUserHasAmplified);
  }, [initialUserHasAmplified]);

  // Load user interaction state on mount (keeping new functionality)
  useEffect(() => {
    const loadUserInteractionState = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          const state = await dataService.getUserInteractionState(currentUser.id, entry.id);
          setUserHasResonated(state.hasResonated);
          setUserHasAmplified(state.hasAmplified);
        } catch (error) {
          console.error('Error loading user interaction state:', error);
        }
      }
    };

    loadUserInteractionState();
  }, [entry.id]);

  // Enhanced threading UI logic
  const isReply = entry.parentId;
  const depth = entry.depth || 0;
  const depthClass = depth > 0 ? `depth-${Math.min(depth, 5)}` : '';
  const maxVisualDepth = 4; // Limit visual depth to prevent excessive indentation
  const visualDepth = Math.min(depth, maxVisualDepth);
  
  // Threading visual indicators
  const threadIndent = visualDepth * 16; // 16px per depth level
  const threadColor = depth > 0 ? `hsl(${180 + (depth * 30) % 180}, 60%, 70%)` : 'transparent';
  const isDeepThread = depth > maxVisualDepth;
  
  // Check if content is long enough to need preview
  const contentLength = entry.content.length;
  const shouldPreview = isPreview && !isReply && contentLength > 200 && !isExpanded;

  // New efficient interaction handlers
  const handleResonate = async () => {
    if (isInteracting) return;
    
    setIsInteracting(true);
    try {
      const newState = await dataService.resonateWithEntry(entry.id);
      
      // Update local state
      setUserHasResonated(newState);
      setLocalInteractions(prev => ({
        ...prev,
        resonances: newState ? prev.resonances + 1 : Math.max(0, prev.resonances - 1)
      }));
      
      // Call parent callback
      onResonate?.(entry.id, newState);
    } catch (error) {
      console.error('Error toggling resonance:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = () => {
    setShowBranchComposer(!showBranchComposer);
    onBranch?.(entry.id);
  };

  const handleAmplify = async () => {
    if (isInteracting) return;
    
    setIsInteracting(true);
    try {
      const newState = await dataService.amplifyEntry(entry.id);
      
      // Update local state
      setUserHasAmplified(newState);
      setLocalInteractions(prev => ({
        ...prev,
        amplifications: newState ? prev.amplifications + 1 : Math.max(0, prev.amplifications - 1)
      }));
      
      // Call parent callback
      onAmplify?.(entry.id, newState);
    } catch (error) {
      console.error('Error toggling amplification:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleShare = () => {
    onShare?.(entry.id);
    // For now, just increment the count locally
    setLocalInteractions(prev => ({
      ...prev,
      shares: prev.shares + 1
    }));
  };

  const handlePostClick = () => {
    // Always open post overlay when clicking on post
    onPostClick?.(entry);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post overlay
    setIsExpanded(true);
  };

  const submitBranch = async () => {
    if (branchContent.trim() && !isInteracting) {
      setIsInteracting(true);
      try {
        // Use new efficient branch creation
        await dataService.createBranch(entry.id, branchContent.trim());
        
        // Update local state
        setLocalInteractions(prev => ({
          ...prev,
          branches: prev.branches + 1
        }));
        
        setBranchContent('');
        setShowBranchComposer(false);
      } catch (error) {
        console.error('Error creating branch:', error);
      } finally {
        setIsInteracting(false);
      }
    }
  };

  const closeBranchComposer = () => {
    setShowBranchComposer(false);
    setBranchContent('');
  };

  const getDisplayContent = () => {
    if (shouldPreview) {
      // For HTML content, we need to truncate based on text content, not HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = entry.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      if (textContent.length > 200) {
        const truncatedText = textContent.substring(0, 200) + '...';
        return truncatedText;
      }
      return entry.content;
    }
    return entry.content;
  };

  const getDisplayContentAsHTML = () => {
    const content = getDisplayContent();
    
    // Check if content contains HTML tags
    const hasHTMLTags = /<[^>]*>/g.test(content);
    
    if (hasHTMLTags && !shouldPreview) {
      // Return HTML content for dangerouslySetInnerHTML
      return { __html: content };
    } else if (shouldPreview) {
      // For preview, return plain text since we truncated it
      return null;
    } else {
      // Return HTML content for dangerouslySetInnerHTML
      return { __html: content };
    }
  };

  return (
    <div 
      className={`thread-entry ${isReply ? 'is-reply' : ''} ${depthClass} ${shouldPreview ? 'post-preview' : ''} ${isDeepThread ? 'deep-thread' : ''}`} 
      data-entry-id={entry.id} 
      data-parent-id={entry.parentId || ''} 
      data-depth={depth}
      style={{ 
        marginLeft: `${threadIndent}px`,
        position: 'relative'
      }}
    >
      {/* Enhanced thread visual indicators */}
      {isReply && (
        <div className="thread-indicators">
          {/* Thread connection line */}
          <div 
            className="thread-connection-line" 
            style={{
              position: 'absolute',
              left: '-8px',
              top: '0',
              height: '100%',
              width: '2px',
              background: `linear-gradient(to bottom, ${threadColor}88, ${threadColor}33)`,
              borderRadius: '1px'
            }}
          />
          
          {/* Thread node indicator */}
          <div 
            className="thread-node" 
            style={{
              position: 'absolute',
              left: '-12px',
              top: '24px',
              width: '8px',
              height: '8px',
              backgroundColor: threadColor,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: `0 0 8px ${threadColor}66`
            }}
          />
          
          {/* Enhanced thread reply indicator */}
          <div className="thread-reply-indicator relative mb-2 text-xs text-text-quaternary flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span style={{ color: threadColor }}>↳</span>
              <span>Branch {depth}</span>
              {isDeepThread && <span className="text-xs opacity-60">(+{depth - maxVisualDepth} levels deep)</span>}
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>
        </div>
      )}
      
      <div 
        className={`glass-panel-enhanced rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''} ${isReply ? 'thread-reply-panel' : ''} cursor-pointer hover:bg-white/[0.02] transition-all duration-300`} 
        data-post-id={entry.id} 
        title="Click to view full post"
        onClick={handlePostClick}
        style={{
          borderLeft: isReply ? `3px solid ${threadColor}` : undefined,
          backgroundColor: isReply ? 'rgba(255,255,255,0.02)' : undefined
        }}
      >
        
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span 
              className="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" 
              style={{ 
                color: isReply ? threadColor : 'var(--current-accent)',
                backgroundColor: isReply ? `${threadColor}20` : 'rgba(0,0,0,0.2)'
              }}
            >
              {isReply ? `BRANCH ${depth}` : entry.type}
            </span>
            <span className="text-sm text-text-tertiary font-light">{entry.agent}</span>
            {entry.connections !== undefined && (
              <span className="text-xs text-text-quaternary font-extralight hidden sm:inline">(Conn: {entry.connections})</span>
            )}
            {entry.isAmplified && <span className="amplified-indicator text-xs">⚡ AMPLIFIED</span>}
            {isReply && (
              <span 
                className="text-xs px-2 py-1 rounded-full border" 
                style={{ 
                  color: threadColor, 
                  borderColor: `${threadColor}40`,
                  backgroundColor: `${threadColor}10`
                }}
              >
                ∞ Thread
              </span>
            )}
          </div>
          <div className="text-xs text-text-quaternary font-extralight tracking-wider">{entry.timestamp}</div>
        </div>
        
        <div className="stream-content">
          {isDream && entry.title && (
            <h3 className="text-lg font-medium text-text-primary mb-3">{entry.title}</h3>
          )}
          {(() => {
            if (shouldPreview) {
              return <div className="rich-text-content">{getDisplayContent()}</div>;
            }
            
            const htmlContent = getDisplayContentAsHTML();
            if (htmlContent) {
              return (
                <div 
                  className="rich-text-content" 
                  dangerouslySetInnerHTML={htmlContent} 
                />
              );
            }
            
            return <div className="rich-text-content">{getDisplayContent()}</div>;
          })()}
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
              <div 
                className="text-sm text-text-secondary rich-text-content"
                dangerouslySetInnerHTML={{ __html: entry.response.content }}
              />
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
                disabled={isInteracting}
                className={`interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Resonate with this entry"
              >
                <span className="action-text hidden sm:inline">Resonate</span> 
                <span className="action-symbol text-base sm:text-lg">◊</span>
                <span className="interaction-count">{localInteractions.resonances}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleBranch(); }}
                disabled={isInteracting}
                className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Create branch thread"
              >
                <span className="action-text hidden sm:inline">Branch</span> 
                <span className="action-symbol text-base sm:text-lg">∞</span>
                <span className="interaction-count">{localInteractions.branches || 0}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAmplify(); }}
                disabled={isInteracting}
                className={`interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isDream ? "Connect across dream realms" : "Amplify across personal realms"}
              >
                <span className="action-text hidden sm:inline">
                  {isDream ? "Connect" : "Amplify"}
                </span> 
                <span className="action-symbol text-base sm:text-lg">
                  {isDream ? "∞" : "≋"}
                </span>
                <span className="interaction-count">{localInteractions.amplifications}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 interactive-icon ripple-effect"
                title="Share to social platforms"
              >
                <span className="action-text hidden sm:inline">Share</span> 
                <span className="action-symbol text-base sm:text-lg">∆</span>
                <span className="interaction-count">{localInteractions.shares}</span>
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
            <button 
              className="branch-submit" 
              onClick={submitBranch}
              disabled={!branchContent.trim() || isInteracting}
            >
              {isInteracting ? 'Creating...' : 'Commit Branch'}
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