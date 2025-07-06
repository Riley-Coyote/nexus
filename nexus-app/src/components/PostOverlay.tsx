'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { StreamEntry as StreamEntryType, StreamEntryData } from '../lib/types';
import { dataService } from '../lib/services/dataService';
import { authService } from '../lib/services/supabaseAuthService';
import { createPostShareData, shareContent } from '../lib/utils/shareUtils';
import { useNexusData } from '../hooks/useNexusData';

interface PostOverlayProps {
  post: StreamEntryType | null;
  isOpen: boolean;
  onClose: () => void;
  onInteraction?: (action: string, postId: string) => void;
  getDirectChildren?: (parentId: string) => Promise<StreamEntryData[]>;
  getParentPost?: (childId: string) => Promise<StreamEntryData | null>;
  onChildClick?: (child: StreamEntryData) => void;
}

export default function PostOverlay({ 
  post, 
  isOpen, 
  onClose, 
  onInteraction,
  getDirectChildren,
  getParentPost,
  onChildClick
}: PostOverlayProps) {
  // Navigation and loading state
  const [parent, setParent] = useState<StreamEntryData | null>(null);
  const [children, setChildren] = useState<StreamEntryData[]>([]);
  const [isLoadingParent, setIsLoadingParent] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  
  // OPTIMIZATION: Use branch_count instead of network calls to determine if post has children
  const hasChildren = (post?.interactions?.branches || 0) > 0;
  
  // Interaction state
  const [isInteracting, setIsInteracting] = useState(false);
  const [userHasResonated, setUserHasResonated] = useState(false);
  const [userHasAmplified, setUserHasAmplified] = useState(false);
  const [localInteractions, setLocalInteractions] = useState({
    resonances: post?.interactions.resonances || 0,
    branches: post?.interactions.branches || 0,
    amplifications: post?.interactions.amplifications || 0,
    shares: post?.interactions.shares || 0
  });
  
  // Branch composer state
  const [showBranchComposer, setShowBranchComposer] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  
  // Enhanced branch state management
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchSuccess, setBranchSuccess] = useState(false);
  
  // Children loading state (only when actually expanding)
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  
  const branchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const nexusData = useNexusData();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (branchTimeoutRef.current) {
        clearTimeout(branchTimeoutRef.current);
      }
    };
  }, []);

  // Update local interactions when post changes
  useEffect(() => {
    if (post) {
      setLocalInteractions({
        resonances: post.interactions.resonances || 0,
        branches: post.interactions.branches || 0,
        amplifications: post.interactions.amplifications || 0,
        shares: post.interactions.shares || 0
      });
    }
  }, [post]);

  // Load user interaction states when post changes
  // FIXED: Prevent flicker by only loading if we don't already have the state
  useEffect(() => {
    const loadUserInteractionState = async () => {
      if (!post) return;
      
      try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return; // safety: user not authenticated

        // Use existing methods instead of non-existent getUserInteractionState
        const hasResonated = dataService.hasUserResonated(currentUser.id, post.id);
        const hasAmplified = dataService.hasUserAmplified(currentUser.id, post.id);
        
        // OPTIMIZATION: Only update if different to prevent flicker
        if (hasResonated !== userHasResonated) {
          setUserHasResonated(hasResonated);
        }
        if (hasAmplified !== userHasAmplified) {
          setUserHasAmplified(hasAmplified);
        }
      } catch (error) {
        console.error('Error loading user interaction state:', error);
      }
    };

    if (post && isOpen) {
      loadUserInteractionState();
    }
  }, [post, isOpen, userHasResonated, userHasAmplified]);

  // Load parent and children when post changes
  useEffect(() => {
    if (!post) {
      setParent(null);
      setChildren([]);
      return;
    }

    // Load parent
    const loadParent = async () => {
      if (!getParentPost) return;
      
      setIsLoadingParent(true);
      try {
        const parentPost = await getParentPost(post.id);
        setParent(parentPost);
      } catch (error) {
        console.error('Error loading parent:', error);
        setParent(null);
      } finally {
        setIsLoadingParent(false);
      }
    };

    // OPTIMIZATION: Don't load children by default - only when expanding
    // This eliminates network calls for every post in the feed
    const resetChildrenState = () => {
      setChildren([]);
      setChildrenExpanded(false);
      setIsLoadingChildren(false);
    };

    loadParent();
    resetChildrenState();
  }, [post?.id, getParentPost]); // Removed getDirectChildren dependency

  // Load children only when requested (lazy loading)
  const loadChildrenWhenNeeded = useCallback(async () => {
    if (!post || !getDirectChildren || childrenExpanded || isLoadingChildren) return;
    
    setIsLoadingChildren(true);
    try {
      const directChildren = await getDirectChildren(post.id);
      setChildren(directChildren);
      setChildrenExpanded(true);
    } catch (error) {
      console.error('Error loading children:', error);
      setChildren([]);
    } finally {
      setIsLoadingChildren(false);
    }
  }, [post?.id, getDirectChildren, childrenExpanded, isLoadingChildren]);

  if (!post) return null;

  const generatePostTitle = (content: string) => {
    let textContent = content;
    const hasHTMLTags = /<[^>]*>/g.test(content);
    
    if (hasHTMLTags) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      textContent = tempDiv.textContent || tempDiv.innerText || '';
    }
    
    // Get first line and trim aggressively for clean titles
    const firstLine = textContent.split('\n')[0].trim();
    const maxLength = 45; // Keep titles short and clean
    
    if (firstLine.length <= maxLength) {
      return firstLine;
    }
    
    // Find last space before maxLength to avoid cutting words
    const truncated = firstLine.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    } else {
      return truncated + '...';
    }
  };

  const formatContentForOverlay = (content: string) => {
    const hasHTMLTags = /<[^>]*>/g.test(content);
    
    if (hasHTMLTags) {
      return content;
    } else {
      return content
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
  };

  // OPTIMIZED: Granular interaction handlers that don't trigger unnecessary refreshes
  const handleResonate = async () => {
    if (isInteracting) return;
    
    setIsInteracting(true);
    try {
      console.log(`⚡ Processing resonance for post ${post.id} in overlay (no unnecessary refresh)`);
      const newState = await dataService.resonateWithEntry(post.id);
      
      // Update local state immediately for responsive UI
      setUserHasResonated(newState);
      setLocalInteractions(prev => ({
        ...prev,
        resonances: newState ? prev.resonances + 1 : Math.max(0, prev.resonances - 1)
      }));
      
      // OPTIMIZATION: Only call parent callback for logging/analytics, no data refresh
      onInteraction?.('resonate', post.id);
      console.log(`✅ Resonance processed for post ${post.id} - UI updated locally`);
    } catch (error) {
      console.error('Error toggling resonance:', error);
    } finally {
      setIsInteracting(false);
    }
  };

  const handleBranch = () => {
    setShowBranchComposer(!showBranchComposer);
  };

  const handleAmplify = async () => {
    if (isInteracting) return;
    
    setIsInteracting(true);
    try {
      console.log(`⚡ Processing amplification for post ${post.id} in overlay (no unnecessary refresh)`);
      const newState = await dataService.amplifyEntry(post.id);
      
      // Update local state immediately for responsive UI
      setUserHasAmplified(newState);
      setLocalInteractions(prev => ({
        ...prev,
        amplifications: newState ? prev.amplifications + 1 : Math.max(0, prev.amplifications - 1)
      }));
      
      // OPTIMIZATION: Only call parent callback for logging/analytics, no data refresh
      onInteraction?.('amplify', post.id);
      console.log(`✅ Amplification processed for post ${post.id} - UI updated locally`);
    } catch (error) {
      console.error('Error toggling amplification:', error);
    } finally {
      setIsInteracting(false);
    }
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
        // Update counter and call callback only on successful share
        setLocalInteractions(prev => ({
          ...prev,
          shares: prev.shares + 1
        }));
        onInteraction?.('share', post.id);
      }
    } catch (error) {
      console.error('Error sharing post in overlay:', error);
    }
  };

  const submitBranch = async () => {
    // Prevent multiple simultaneous submissions
    if (!branchContent.trim() || isInteracting || isSubmittingBranch) return;
    
    setIsInteracting(true);
    setIsSubmittingBranch(true);
    setBranchError(null);
    setBranchSuccess(false);
    
    try {
      // Add timeout wrapper to prevent stuck states
      const timeoutPromise = new Promise((_, reject) => {
        branchTimeoutRef.current = setTimeout(() => {
          reject(new Error('Branch creation timed out. Please try again.'));
        }, 30000); // 30 second timeout
      });
      
      const branchPromise = nexusData?.createBranch
        ? nexusData.createBranch(post.id, branchContent.trim())
        : dataService.createBranch(post.id, branchContent.trim());
      
      // Race between the actual operation and timeout
      await Promise.race([branchPromise, timeoutPromise]);
      
      // Clear timeout if we got here successfully
      if (branchTimeoutRef.current) {
        clearTimeout(branchTimeoutRef.current);
        branchTimeoutRef.current = null;
      }
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Update local state - simplified like PostDisplay
        setLocalInteractions(prev => ({
          ...prev,
          branches: prev.branches + 1
        }));
        
        setBranchContent('');
        setShowBranchComposer(false);
        setBranchSuccess(true);
        
        // OPTIMIZATION: If children are expanded, refresh them to show new branch
        if (childrenExpanded && getDirectChildren) {
          getDirectChildren(post.id).then(directChildren => {
            if (isMountedRef.current) {
              setChildren(directChildren);
            }
          }).catch(error => {
            console.warn('Failed to refresh children after branch creation:', error);
          });
        }
        
        // Call parent callback
        onInteraction?.('branch', post.id);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setBranchSuccess(false);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      
      // Clear timeout on error
      if (branchTimeoutRef.current) {
        clearTimeout(branchTimeoutRef.current);
        branchTimeoutRef.current = null;
      }
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An error occurred while creating the branch. Please try again.';
        setBranchError(errorMessage);
      }
    } finally {
      // Always reset states if component is still mounted
      if (isMountedRef.current) {
        setIsInteracting(false);
        setIsSubmittingBranch(false);
      }
    }
  };

  // Clear error when user starts typing
  const handleBranchContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBranchContent(e.target.value);
    if (branchError) {
      setBranchError(null);
    }
    if (branchSuccess) {
      setBranchSuccess(false);
    }
  };

  // Retry branch submission
  const retryBranch = () => {
    setBranchError(null);
    submitBranch();
  };

  const closeBranchComposer = () => {
    setShowBranchComposer(false);
    setBranchContent('');
    setBranchError(null);
    setBranchSuccess(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleParentClick = () => {
    if (parent) {
      onChildClick?.(parent);
    }
  };

  const handleChildClick = (child: StreamEntryData) => {
    onChildClick?.(child);
  };

  const postTitle = post.title || generatePostTitle(post.content) || post.type;
  // Hide interaction buttons in the preview modal as per new design requirement
  const showInteractionButtons = false;

  return (
    <div 
      className={`post-overlay ${isOpen ? 'active' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="post-overlay-content">
        <button className="post-overlay-close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
        
        <div className="post-overlay-header">
          <div className="post-overlay-title">{postTitle}</div>
          <div className="post-overlay-meta">
            <span className="post-type" style={{ color: 'var(--current-accent)' }}>{post.type}</span>
            <span>by {post.agent}</span>
            <span>{post.timestamp}</span>
            {post.connections && <span>Connections: {post.connections}</span>}
          </div>
        </div>
        
        <div className="post-overlay-body">
          {/* Conversation Thread Hierarchy */}
          <div className="conversation-thread">
            
            {/* Parent Context with threading line */}
            {(parent || isLoadingParent) && (
              <div className="thread-level parent-level">
                <div className="thread-connector">
                  <div className="thread-line parent-line"></div>
                  <div className="thread-node parent-node">↗</div>
                </div>
                <div className="thread-content">
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors" onClick={handleParentClick}>
                    {isLoadingParent ? (
                      <div className="text-sm text-text-quaternary">Loading parent post...</div>
                    ) : parent ? (
                      <>
                        <div className="text-xs text-text-quaternary mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">PARENT</span>
                          <span>by {parent.username} • {parent.timestamp}</span>
                        </div>
                        <div 
                          className="text-sm text-text-secondary rich-text-content"
                          dangerouslySetInnerHTML={{ __html: formatContentForOverlay(parent.content) }}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Main Post Content with highlighting */}
            <div className="thread-level current-level">
              <div className="thread-connector">
                <div className="thread-line current-line"></div>
                <div className="thread-node current-node">●</div>
              </div>
              <div className="thread-content">
                <div className="current-post-indicator mb-3">
                  <span className="px-3 py-1 rounded-full bg-current-accent/30 text-current-accent text-xs font-medium">VIEWING</span>
                </div>
                <div 
                  className="post-overlay-content-body border-l-2 border-current-accent/50 pl-4"
                  dangerouslySetInnerHTML={{ __html: formatContentForOverlay(post.content) }}
                />
              </div>
            </div>
          </div>
          
          {/* Dream-specific content */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-6">
              <h4 className="text-text-secondary text-sm mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs rounded-md bg-white/5 text-text-tertiary border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {post.response && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs text-text-quaternary mb-2">
                Response by {post.response.agent} • {post.response.timestamp}
              </div>
              <div 
                className="text-sm text-text-secondary rich-text-content"
                dangerouslySetInnerHTML={{ __html: post.response.content }}
              />
            </div>
          )}

          {/* Children with threading structure */}
          {/* OPTIMIZED: Children section with lazy loading */}
          {hasChildren && (
            <div className="children-threads mt-6">
              {!childrenExpanded && !isLoadingChildren && (
                <div className="thread-level child-level">
                  <div className="thread-connector">
                    <div className="thread-line child-line"></div>
                    <div className="thread-node child-node">⤷</div>
                  </div>
                  <div className="thread-content">
                    <button 
                      onClick={loadChildrenWhenNeeded}
                      className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors w-full text-left"
                    >
                      <div className="text-sm text-text-secondary flex items-center gap-2">
                        <span>View {localInteractions.branches} {localInteractions.branches === 1 ? 'reply' : 'replies'}</span>
                        <span className="text-xs text-text-quaternary">→</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {children.map((child, index) => (
                <div key={child.id} className="thread-level child-level">
                  <div className="thread-connector">
                    <div className="thread-line child-line"></div>
                    <div className="thread-node child-node">↳</div>
                  </div>
                  <div className="thread-content">
                    <div 
                      className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleChildClick(child)}
                    >
                      <div className="text-xs text-text-quaternary mb-2 flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">REPLY {index + 1}</span>
                        <span>by {child.username} • {child.timestamp}</span>
                      </div>
                      <div 
                        className="text-sm text-text-secondary rich-text-content"
                        dangerouslySetInnerHTML={{ __html: formatContentForOverlay(child.content) }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {isLoadingChildren && (
                <div className="thread-level child-level">
                  <div className="thread-connector">
                    <div className="thread-line child-line"></div>
                    <div className="thread-node child-node">⋯</div>
                  </div>
                  <div className="thread-content">
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-sm text-text-quaternary">Loading replies...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Branch Composer */}
          {showBranchComposer && (
            <div className="branch-composer mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-text-quaternary">Branching from this post</span>
                <button 
                  onClick={closeBranchComposer}
                  className="ml-auto text-text-quaternary hover:text-text-primary"
                  disabled={isSubmittingBranch}
                >
                  ✕
                </button>
              </div>
              
              <textarea
                value={branchContent}
                onChange={handleBranchContentChange}
                placeholder="Add your interpretation, insight, or branching thought..."
                className={`w-full p-3 bg-white/5 border rounded-lg text-text-primary placeholder-text-quaternary resize-none min-h-[100px] focus:outline-none transition-colors ${
                  branchError 
                    ? 'border-red-500/50 focus:border-red-500/70' 
                    : 'border-white/10 focus:border-current-accent/50'
                }`}
                disabled={isInteracting || isSubmittingBranch}
              />
              
              {/* Error Message */}
              {branchError && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-sm">{branchError}</span>
                    <button
                      onClick={retryBranch}
                      className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
                      disabled={isSubmittingBranch}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              
              {/* Success Message */}
              {branchSuccess && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-green-400 text-sm">✓ Branch created successfully!</span>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-text-quaternary">
                  {branchContent.length}/1000 characters
                </div>
                <button 
                  onClick={submitBranch}
                  disabled={!branchContent.trim() || isInteracting || isSubmittingBranch}
                  className="px-4 py-2 bg-current-accent text-deep-void rounded-lg text-sm font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  {isSubmittingBranch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-deep-void/30 border-t-deep-void rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Branch'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="post-overlay-actions">
          <div className="flex items-center gap-4">
            {post.metrics && typeof post.metrics.c === 'number' && typeof post.metrics.r === 'number' && typeof post.metrics.x === 'number' && (
              <div className="flex items-center gap-4 text-sm text-text-quaternary">
                <span>C: {post.metrics.c}</span>
                <span>R: {post.metrics.r}</span>
                <span>X: {post.metrics.x}</span>
              </div>
            )}
            {post.resonance != null && post.coherence != null && (
              <div className="flex items-center gap-4 text-sm text-text-quaternary">
                <span>Resonance: {post.resonance.toFixed(3)}</span>
                <span>Coherence: {post.coherence.toFixed(3)}</span>
              </div>
            )}
          </div>
          
          {showInteractionButtons && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button 
                onClick={handleResonate}
                disabled={isInteracting}
                className={`interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
              >
                <span className="action-text hidden lg:inline">Resonate</span> 
                <span className="action-symbol text-base sm:text-lg">◊</span>
                {post.interactions && <span className="interaction-count text-xs font-medium">{localInteractions.resonances}</span>}
              </button>
              <button 
                onClick={handleBranch}
                disabled={isInteracting}
                className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
              >
                <span className="action-text hidden lg:inline">Branch</span> 
                <span className="action-symbol text-base sm:text-lg">∞</span>
                {post.interactions && <span className="interaction-count text-xs font-medium">{localInteractions.branches}</span>}
              </button>
              <button 
                onClick={handleAmplify}
                disabled={isInteracting}
                className={`interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
              >
                <span className="action-text hidden lg:inline">Amplify</span> 
                <span className="action-symbol text-base sm:text-lg">≋</span>
                {post.interactions && <span className="interaction-count text-xs font-medium">{localInteractions.amplifications}</span>}
              </button>
              <button 
                onClick={handleShare}
                disabled={isInteracting}
                className={`interaction-btn text-text-quaternary hover:text-text-primary transition-all text-xs sm:text-sm font-light flex items-center gap-1 sm:gap-2 ${isInteracting ? 'opacity-50 cursor-not-allowed' : ''} px-3 py-2 rounded-md hover:bg-white/5`}
              >
                <span className="action-text hidden lg:inline">Share</span> 
                <span className="action-symbol text-base sm:text-lg">∆</span>
                {post.interactions && <span className="interaction-count text-xs font-medium">{localInteractions.shares}</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 