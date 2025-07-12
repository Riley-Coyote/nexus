'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Post } from '@/lib/types';
import { shareContent, createPostShareData } from '@/lib/utils/shareUtils';
import UserAvatar from './UserAvatar';

export interface PostDisplayProps {
  post: Post;
  context?: 'feed' | 'logbook' | 'dream' | 'profile' | 'resonance';
  displayMode?: 'preview' | 'full' | 'compact';
  showInteractions?: boolean;
  showBranching?: boolean;
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onResonate?: (postId: string) => Promise<void>;
  onBranch?: (parentId: string, content: string) => Promise<void>;
  onAmplify?: (postId: string) => Promise<void>;
  onShare?: (postId: string) => void;
  onDeepDive?: (post: Post) => void;
  userHasResonated?: boolean;
  userHasAmplified?: boolean;
  onClose?: () => void;
  className?: string;
  isSubmittingBranch?: boolean;
  branchError?: string | null;
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
  onDeepDive,
  userHasResonated: initialUserHasResonated = false,
  userHasAmplified: initialUserHasAmplified = false,
  onClose,
  className = '',
  isSubmittingBranch = false,
  branchError: parentBranchError,
}: PostDisplayProps & { 
  isSubmittingBranch?: boolean,
  branchError?: string | null 
}) {
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
  
  // Branch error is now managed locally but can be synced from parent
  const [branchError, setBranchError] = useState<string | null>(parentBranchError || null);
  
  const interactionContainerRef = useRef<HTMLDivElement>(null);
  
  // Sync branch error from parent
  useEffect(() => {
    setBranchError(parentBranchError || null);
  }, [parentBranchError]);

  // Derive display properties from context and post
  const isDream = context === 'dream' || post.resonance !== undefined;
  const isReply = post.parentId;
  const depth = post.depth || 0;
  const shouldShowPreview = displayMode === 'preview' && !isReply && post.content.length > 200 && !isExpanded;
  const shouldCollapse = shouldShowPreview || isMobileCollapsed;

  // Determine colors based on entryType (dream vs logbook)
  const entryTypeColors = React.useMemo(() => {
    if (post.entryType === 'dream') {
      return {
        hoverBg: 'hover:bg-purple-400/10',
        textColor: 'text-purple-400',
      } as const;
    }
    // Default to logbook colors
    return {
      hoverBg: 'hover:bg-emerald-400/10',
      textColor: 'text-emerald-400',
    } as const;
  }, [post.entryType]);

  // Sync interaction state from parent when props change
  // OPTIMIZATION: Only sync if the props have actually changed to avoid flicker
  useEffect(() => {
    setUserHasResonated(initialUserHasResonated);
    setUserHasAmplified(initialUserHasAmplified);
  }, [initialUserHasResonated, initialUserHasAmplified]);

  // Update local state when props change
  useEffect(() => {
    setLocalInteractions(post.interactions);
  }, [post.interactions]);

  useEffect(() => {
    setIsExpanded(displayMode === 'full');
  }, [displayMode]);

  // Parent now always supplies interaction state; do not fetch here.

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
      
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = () => {
    if (!showBranching) return;
    setShowBranchComposer(!showBranchComposer);
  };

  const handleShare = async () => {
    try {
      const shareData = createPostShareData({
        id: post.id,
        title: post.title,
        content: post.content,
        username: post.username,
        type: post.type
      });
      
      const success = await shareContent(shareData);
      
      if (success) {
        // Call the original onShare callback and update counter only on successful share
        onShare?.(post.id);
        setLocalInteractions(prev => ({
          ...prev,
          shares: prev.shares + 1
        }));
      }
    } catch (error) {
      
    }
  };

  const handleDeepDive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeepDive?.(post);
  };

  const submitBranch = async () => {
    // Parent now controls submission state via `isSubmittingBranch` prop
    if (!onBranch || !branchContent.trim() || isSubmittingBranch) return;
    
    // Reset local error on new submission attempt
    setBranchError(null);
    
    // No need for local isInteracting or isSubmittingBranch state management.
    // The parent component will manage this and pass down the `isSubmittingBranch` prop.
    // The parent is also responsible for timeouts.
    
    try {
      // The onBranch promise is now expected to handle the full flow,
      // including refresh and state management in the parent component.
      await onBranch(post.id, branchContent);
      
      // On success, we can clear the composer. The parent's state change
      // will cause a re-render, but this provides immediate feedback.
      setShowBranchComposer(false);
      setBranchContent('');
      
    } catch (error) {
      // If the parent handler throws an error, we can display it locally.
      const errorMessage = error instanceof Error ? error.message : 'Failed to create branch. Please try again.';
      
      setBranchError(errorMessage);
    }
  };

  const retryBranch = () => {
    setBranchError(null);
    submitBranch();
  };

  // Clear error when user starts typing
  const handleBranchContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBranchContent(e.target.value);
    if (branchError) {
      setBranchError(null);
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
      // Strip HTML tags so previews don't show raw markup like </p>
      const plainText = post.content.replace(/<[^>]*>/g, '');
      return plainText.length > maxLength 
        ? plainText.substring(0, maxLength) + '...'
        : plainText;
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
    return 'text-current-accent';
  };

  return (
    <div 
      className={`glass-panel-enhanced rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-level-4 interactive-card depth-near depth-responsive atmosphere-layer-1 ${post.isAmplified ? 'amplified-post' : ''} cursor-pointer ${entryTypeColors.hoverBg} transition-all duration-300 relative overflow-hidden ${shouldCollapse ? 'post-preview' : ''} ${className}`} 
      data-post-id={post.id} 
      title="Click to view full post"
      onClick={handlePostClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span 
            className={`text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20 ${entryTypeColors.textColor}`}
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
          {post.privacy === 'private' && (
            <span className="text-xs text-text-quaternary flex items-center gap-1" title="Private post">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a3 3 0 00-3 3v2H4a2 2 0 00-2 2v5a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-1V4a3 3 0 00-3-3zm-2 5V4a2 2 0 114 0v2H6zm6 1a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h8z" />
              </svg>
              <span className="hidden sm:inline">Private</span>
            </span>
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

              {onDeepDive && post.privacy?.toLowerCase?.() !== 'private' && (
                <button 
                  onClick={handleDeepDive}
                  disabled={isInteracting}
                  className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
                  title="Deep dive into this thread"
                >
                  <span className={`action-text ${isCompact ? 'hidden' : 'hidden lg:inline'}`}>Deep Dive</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
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
              onClick={() => {
                setShowBranchComposer(false);
                setBranchError(null);
                setBranchContent('');
              }}
              className="ml-auto text-text-quaternary hover:text-text-primary"
              disabled={isSubmittingBranch}
            >
              ✕
            </button>
          </div>
          
          <div className="mt-4">
            <textarea
              value={branchContent}
              onChange={handleBranchContentChange}
              placeholder="Creating a new branch in the dream..."
              className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
              rows={3}
              maxLength={1000}
              disabled={isSubmittingBranch}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">{branchContent.length} / 1000</span>
              <div className="flex items-center gap-2">
                {branchError && (
                  <button 
                    onClick={retryBranch}
                    className="px-3 py-1 text-xs text-yellow-400 bg-yellow-500/10 rounded-md hover:bg-yellow-500/20"
                  >
                    Retry
                  </button>
                )}
                <button 
                  onClick={submitBranch}
                  disabled={!branchContent.trim() || isSubmittingBranch}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600/50 rounded-lg hover:bg-emerald-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmittingBranch ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Branch'
                  )}
                </button>
              </div>
            </div>
            {branchError && (
              <p className="text-xs text-red-400 mt-2">{branchError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 