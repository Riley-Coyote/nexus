'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Post } from '@/lib/types';
import { dataService } from '@/lib/services/dataService';
import { authService } from '@/lib/services/authService';

export interface PostDisplayProps {
  post: Post;
  context?: 'feed' | 'logbook' | 'dream' | 'profile' | 'resonance';
  displayMode?: 'preview' | 'full' | 'compact';
  showInteractions?: boolean;
  showBranching?: boolean;
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onResonate?: (postId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => void;
  onAmplify?: (postId: string) => Promise<void>;
  onShare?: (postId: string) => void;
  userHasResonated?: boolean;
  userHasAmplified?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function PostDisplay({ 
  post, 
  context = 'feed',
  displayMode = 'preview',
  showInteractions = true,
  showBranching = true,
  onPostClick,
  onUserClick,
  onResonate,
  onBranch,
  onAmplify,
  onShare,
  userHasResonated: initialUserHasResonated = false,
  userHasAmplified: initialUserHasAmplified = false,
  onClose,
  className = ''
}: PostDisplayProps) {
  // Local state for interaction management
  const [localInteractions, setLocalInteractions] = useState(post.interactions);
  const [userHasResonated, setUserHasResonated] = useState(initialUserHasResonated);
  const [userHasAmplified, setUserHasAmplified] = useState(initialUserHasAmplified);
  const [isInteracting, setIsInteracting] = useState(false);
  
  // UI state
  const [showBranchComposer, setShowBranchComposer] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(displayMode === 'full');
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  const interactionContainerRef = useRef<HTMLDivElement>(null);

  // Derive display properties from context and post
  const isDream = context === 'dream' || post.resonance !== undefined;
  const isReply = post.parentId;
  const depth = post.depth || 0;
  const shouldShowPreview = displayMode === 'preview' && !isReply && post.content.length > 200 && !isExpanded;
  const shouldCollapse = shouldShowPreview || isMobileCollapsed;

  // Update local state when props change
  useEffect(() => {
    setLocalInteractions(post.interactions);
  }, [post.interactions]);

  useEffect(() => {
    setUserHasResonated(initialUserHasResonated);
  }, [initialUserHasResonated]);

  useEffect(() => {
    setUserHasAmplified(initialUserHasAmplified);
  }, [initialUserHasAmplified]);

  useEffect(() => {
    setIsExpanded(displayMode === 'full');
  }, [displayMode]);

  // Load user interaction state
  useEffect(() => {
    const loadUserInteractionState = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          const state = await dataService.getUserInteractionState(currentUser.id, post.id);
          setUserHasResonated(state.hasResonated);
          setUserHasAmplified(state.hasAmplified);
        } catch (error) {
          console.error('Error loading user interaction state:', error);
        }
      }
    };

    loadUserInteractionState();
  }, [post.id]);

  // Check if interaction buttons need compact layout
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
  }, [post.id]);

  // Interaction handlers
  const handleResonate = async () => {
    if (!onResonate || isInteracting) return;
    
    setIsInteracting(true);
    const wasResonated = userHasResonated;
    
    try {
      await onResonate(post.id);
      setUserHasResonated(!wasResonated);
      setLocalInteractions(prev => ({
        ...prev,
        resonances: wasResonated ? Math.max(0, prev.resonances - 1) : prev.resonances + 1
      }));
    } catch (error) {
      console.error('Error handling resonance:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleAmplify = async () => {
    if (!onAmplify || isInteracting) return;
    
    setIsInteracting(true);
    const wasAmplified = userHasAmplified;
    
    try {
      await onAmplify(post.id);
      setUserHasAmplified(!wasAmplified);
      setLocalInteractions(prev => ({
        ...prev,
        amplifications: wasAmplified ? Math.max(0, prev.amplifications - 1) : prev.amplifications + 1
      }));
    } catch (error) {
      console.error('Error handling amplification:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = () => {
    if (!showBranching) return;
    setShowBranchComposer(!showBranchComposer);
  };

  const handleShare = () => {
    onShare?.(post.id);
    setLocalInteractions(prev => ({
      ...prev,
      shares: prev.shares + 1
    }));
  };

  const submitBranch = async () => {
    if (!onBranch || !branchContent.trim() || isInteracting) return;
    
    setIsInteracting(true);
    try {
      await onBranch(post.id, branchContent);
      setBranchContent('');
      setShowBranchComposer(false);
      setLocalInteractions(prev => ({
        ...prev,
        branches: prev.branches + 1
      }));
    } catch (error) {
      console.error('Error creating branch:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  // Click handlers
  const handlePostClick = () => {
    onPostClick?.(post);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUserClick?.(post.username);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
    setIsMobileCollapsed(false);
  };

  const handleMobileClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else {
      setIsMobileCollapsed(true);
    }
  };

  // Content processing
  const getDisplayContent = () => {
    if (shouldCollapse) {
      const maxLength = displayMode === 'compact' ? 100 : 200;
      return post.content.length > maxLength 
        ? post.content.substring(0, maxLength) + '...'
        : post.content;
    }
    return post.content;
  };

  const getDisplayContentAsHTML = () => {
    const content = getDisplayContent();
    const hasHTMLTags = /<[^>]*>/g.test(content);
    
    if (hasHTMLTags && !shouldCollapse) {
      return { __html: content };
    } else if (shouldCollapse) {
      return null;
    } else {
      return { __html: content };
    }
  };

  // Determine accent color based on context
  const getAccentClass = () => {
    switch (context) {
      case 'dream': return 'text-purple-400';
      case 'logbook': return 'text-blue-400';
      case 'resonance': return 'text-cyan-400';
      default: return 'text-current-accent';
    }
  };

  return (
    <div 
      className={`glass-panel-enhanced rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${post.isAmplified ? 'amplified-post' : ''} cursor-pointer hover:bg-white/[0.02] transition-all duration-300 relative overflow-hidden ${shouldCollapse ? 'post-preview' : ''} ${className}`} 
      data-post-id={post.id} 
      title="Click to view full post"
      onClick={handlePostClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span 
            className={`text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20 ${getAccentClass()}`}
          >
            {post.type}
          </span>
          <button 
            onClick={handleUserClick}
            className="flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer transition-colors hover:text-text-primary"
            title={`View ${post.agent || post.username}'s profile`}
          >
            <span className="font-medium text-text-primary">{post.agent || post.username}</span>
            <span className="text-text-tertiary ml-1">@{post.username}</span>
          </button>
          {post.connections !== undefined && (
            <span className="text-xs text-text-quaternary font-extralight hidden sm:inline">
              (Conn: {post.connections})
            </span>
          )}
          {post.isAmplified && (
            <span className="amplified-indicator text-xs">⚡ AMPLIFIED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-quaternary font-extralight tracking-wider">
            {post.timestamp}
          </div>
          {!shouldCollapse && displayMode !== 'compact' && (
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
      
      {/* Content */}
      <div className="stream-content">
        {isDream && post.title && (
          <h3 className="text-lg font-medium text-text-primary mb-3">{post.title}</h3>
        )}
        
        {(() => {
          if (shouldCollapse) {
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
        
        {isDream && post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 text-xs rounded-md bg-white/5 text-text-tertiary border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {isDream && post.response && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs text-text-quaternary mb-1">
              Response by <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick?.(post.response!.agent);
                }}
                className="text-text-quaternary hover:text-text-primary transition-colors underline-offset-4 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs"
                title={`View ${post.response.agent}'s profile`}
              >
                {post.response.agent}
              </button> • {post.response.timestamp}
            </div>
            <div 
              className="text-sm text-text-secondary rich-text-content"
              dangerouslySetInnerHTML={{ __html: post.response.content }}
            />
          </div>
        )}
        
        {shouldCollapse && (
          <button 
            onClick={handleExpandClick}
            className={`expand-indicator mt-2 text-xs hover:text-current-accent-light transition-colors cursor-pointer bg-transparent border-none p-0 ${getAccentClass()}`}
          >
            Click to expand ↗
          </button>
        )}
      </div>
      
      {/* Metrics and Interactions */}
      {showInteractions && (
        <div className="interaction-section mt-3 sm:mt-4">
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-0">
            {/* Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-light text-text-quaternary tracking-wider">
              {isDream ? (
                post.resonance != null && post.coherence != null ? (
                  <>
                    <span>Resonance: {post.resonance.toFixed(3)}</span>
                    <span className="hidden sm:inline">Coherence: {post.coherence.toFixed(3)}</span>
                  </>
                ) : null
              ) : (
                post.metrics && (
                  <>
                    <span>C: {post.metrics.c}</span>
                    <span>R: {post.metrics.r}</span>
                    <span>X: {post.metrics.x}</span>
                  </>
                )
              )}
            </div>
            
            {/* Interaction Buttons */}
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
              
              {showBranching && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleBranch(); }}
                  disabled={isInteracting}
                  className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
                >
                  <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Branch</span>
                  <span className="action-symbol text-base sm:text-lg">∞</span>
                  <span className="interaction-count font-medium">{localInteractions.branches}</span>
                </button>
              )}

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
      )}
      
      {/* Branch Composer */}
      {showBranchComposer && showBranching && (
        <div 
          className="branch-container mt-4 p-4 bg-white/5 rounded-lg border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-text-quaternary">Branching from this post</span>
            <button 
              onClick={() => setShowBranchComposer(false)}
              className="ml-auto text-text-quaternary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
          <textarea
            value={branchContent}
            onChange={(e) => setBranchContent(e.target.value)}
            placeholder="Add your interpretation, insight, or branching thought..."
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-quaternary resize-none min-h-[100px] focus:outline-none focus:border-current-accent/50"
            disabled={isInteracting}
          />
          <button 
            onClick={submitBranch}
            disabled={!branchContent.trim() || isInteracting}
            className="mt-3 px-4 py-2 bg-current-accent/20 text-current-accent rounded-lg hover:bg-current-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInteracting ? 'Creating...' : 'Commit Branch'}
          </button>
        </div>
      )}
    </div>
  );
} 