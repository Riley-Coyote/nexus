'use client';

import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../lib/services/dataService';
import { authService } from '../lib/services/authService';

export interface StreamEntryData {
  id: string;
  parentId?: string | null;
  depth: number;
  type: string;
  username: string;
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
  onResonate?: (entryId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => void;
  onAmplify?: (entryId: string) => Promise<void>;
  onShare?: (entryId: string) => void;
  onPostClick?: (entry: StreamEntryData) => void;
  onUserClick?: (username: string) => void;
  userHasResonated?: boolean;
  userHasAmplified?: boolean;
  onClose?: () => void;
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
  onUserClick,
  userHasResonated: initialUserHasResonated = false,
  userHasAmplified: initialUserHasAmplified = false,
  onClose
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
  
  // Mobile collapse state
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  // Auto-compact mode: hide text on interaction buttons if they wrap
  const [isCompact, setIsCompact] = useState(false);
  const interactionContainerRef = useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalInteractions(entry.interactions);
  }, [entry.interactions]);

  // Load user interaction state - ONLY if props weren't provided
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

    // Only fetch if parent hasn't provided the interaction state via props
    const hasPropsData = initialUserHasResonated !== false || initialUserHasAmplified !== false;
    if (!hasPropsData) {
      loadUserInteractionState();
    }
  }, [entry.id, initialUserHasResonated, initialUserHasAmplified]);

  // Update state when props change (parent has fresh data)
  useEffect(() => {
    setUserHasResonated(initialUserHasResonated);
    setUserHasAmplified(initialUserHasAmplified);
  }, [initialUserHasResonated, initialUserHasAmplified]);

  useEffect(() => {
    const checkCompact = () => {
      const el = interactionContainerRef.current;
      if (el) {
        setIsCompact(el.scrollWidth > el.clientWidth);
      }
    };
    checkCompact();
    window.addEventListener('resize', checkCompact);
    return () => window.removeEventListener('resize', checkCompact);
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
  const shouldPreview = (isPreview && !isReply && contentLength > 200 && !isExpanded) || isMobileCollapsed;

  // New efficient interaction handlers
  const handleResonate = async () => {
    if (!onResonate) return;
    
    setIsInteracting(true);
    const wasResonated = userHasResonated;
    
    try {
      console.log(`🎯 StreamEntry: ${wasResonated ? 'Unresonating from' : 'Resonating with'} entry ${entry.id}`);
      
      await onResonate(entry.id);
      
      // Toggle the resonance state for immediate UI feedback
      setUserHasResonated(!wasResonated);
      
      // Update local interaction counts for immediate UI feedback
      setLocalInteractions(prev => ({
        ...prev,
        resonances: wasResonated ? prev.resonances - 1 : prev.resonances + 1
      }));
      
      console.log(`✅ StreamEntry: ${wasResonated ? 'Unresonated from' : 'Resonated with'} entry ${entry.id}`);
    } catch (error) {
      console.error('❌ StreamEntry: Error handling resonance:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = () => {
    setShowBranchComposer(!showBranchComposer);
    // onBranch will be called in submitBranch after content is entered
  };

  const handleAmplify = async () => {
    if (!onAmplify) return;
    
    setIsInteracting(true);
    const wasAmplified = userHasAmplified;
    
    try {
      console.log(`🎯 StreamEntry: ${wasAmplified ? 'Unamplifying' : 'Amplifying'} entry ${entry.id}`);
      
      await onAmplify(entry.id);
      
      // Toggle the amplification state for immediate UI feedback
      setUserHasAmplified(!wasAmplified);
      
      // Update local interaction counts for immediate UI feedback
      setLocalInteractions(prev => ({
        ...prev,
        amplifications: wasAmplified ? prev.amplifications - 1 : prev.amplifications + 1
      }));
      
      console.log(`✅ StreamEntry: ${wasAmplified ? 'Unamplified' : 'Amplified'} entry ${entry.id}`);
    } catch (error) {
      console.error('❌ StreamEntry: Error handling amplification:', error);
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
    setIsMobileCollapsed(false); // Also uncollapse if it was mobile collapsed
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post overlay
    onUserClick?.(entry.username);
  };

  const handleMobileClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post overlay
    if (onClose) {
      onClose();
    } else {
      // Fallback: collapse to preview mode
      setIsMobileCollapsed(true);
    }
  };

  const submitBranch = async () => {
    if (branchContent.trim() && !isInteracting) {
      setIsInteracting(true);
      try {
        // The direct call to dataService.createBranch is removed to prevent duplication.
        // The onBranch prop, connected to useNexusData, will handle the creation and data refresh.
        if (onBranch) {
          await onBranch(entry.id, branchContent.trim());
        
          // Update local state only after successful branch creation
          setLocalInteractions(prev => ({
            ...prev,
            branches: prev.branches + 1
          }));
        
          setBranchContent('');
          setShowBranchComposer(false);
        }
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
      className={`glass-panel-enhanced rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''} cursor-pointer hover:bg-white/[0.02] transition-all duration-300 relative overflow-hidden ${isPreview || isMobileCollapsed ? 'post-preview' : ''}`} 
      data-post-id={entry.id} 
      title="Click to view full post"
      onClick={handlePostClick}
    >
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span 
            className="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" 
            style={{ color: 'var(--current-accent)' }}
          >
            {entry.type}
          </span>
          <button 
            onClick={handleUserClick}
            className="text-sm text-text-tertiary font-light hover:text-text-primary transition-colors underline-offset-4 hover:underline cursor-pointer bg-transparent border-none p-0"
            title={`View @${entry.username}'s profile`}
          >
            {entry.username}
          </button>
          {entry.connections !== undefined && (
            <span className="text-xs text-text-quaternary font-extralight hidden sm:inline">(Conn: {entry.connections})</span>
          )}
          {entry.isAmplified && <span className="amplified-indicator text-xs">⚡ AMPLIFIED</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-quaternary font-extralight tracking-wider">{entry.timestamp}</div>
          {/* Mobile Close Button - Only show on mobile and when not in preview mode */}
          {!isPreview && !isMobileCollapsed && (
            <button 
              onClick={handleMobileClose}
              className="lg:hidden w-8 h-8 flex items-center justify-center text-text-quaternary hover:text-text-primary transition-colors rounded-full hover:bg-white/10"
              title="Close post"
              aria-label="Close post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
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
              Response by <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick?.(entry.response!.agent);
                }}
                className="text-text-quaternary hover:text-text-primary transition-colors underline-offset-4 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs"
                title={`View ${entry.response.agent}'s profile`}
              >
                {entry.response.agent}
              </button> • {entry.response.timestamp}
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
              entry.resonance != null && entry.coherence != null ? (
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
          <div ref={interactionContainerRef} className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button 
              onClick={(e) => { e.stopPropagation(); handleResonate(); }}
              disabled={isInteracting}
              className={`interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
            >
              <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Resonate</span>
              <span className="action-symbol text-base sm:text-lg">◊</span>
              <span className="interaction-count font-medium">{localInteractions.resonances}</span>
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); handleBranch(); }}
              disabled={isInteracting}
              className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
            >
              <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Branch</span>
              <span className="action-symbol text-base sm:text-lg">∞</span>
              <span className="interaction-count font-medium">{localInteractions.branches}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleAmplify(); }}
              disabled={isInteracting}
              className={`interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
            >
              <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Amplify</span>
              <span className="action-symbol text-base sm:text-lg">≋</span>
              <span className="interaction-count font-medium">{localInteractions.amplifications}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              disabled={isInteracting}
              className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
            >
              <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Share</span>
              <span className="action-symbol text-base sm:text-lg">∆</span>
              <span className="interaction-count font-medium">{localInteractions.shares}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Branch Composer */}
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
  );
} 