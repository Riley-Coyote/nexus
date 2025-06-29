'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StreamEntry as StreamEntryType } from '@/lib/types';
import { StreamEntryData } from './StreamEntry';

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
  const [parent, setParent] = useState<StreamEntryData | null>(null);
  const [children, setChildren] = useState<StreamEntryData[]>([]);
  const [isLoadingParent, setIsLoadingParent] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

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

    // Load children
    const loadChildren = async () => {
      if (!getDirectChildren) return;
      
      setIsLoadingChildren(true);
      try {
        const directChildren = await getDirectChildren(post.id);
        setChildren(directChildren);
      } catch (error) {
        console.error('Error loading children:', error);
        setChildren([]);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    loadParent();
    loadChildren();
  }, [post?.id, getDirectChildren, getParentPost]);

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

  const handleInteraction = (action: string) => {
    if (action === 'branch') {
      onClose();
      setTimeout(() => {
        onInteraction?.(action, post.id);
      }, 300);
    } else {
      onClose();
      onInteraction?.(action, post.id);
    }
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
                          <span>by {parent.agent} • {parent.timestamp}</span>
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
          {(children.length > 0 || isLoadingChildren) && (
            <div className="children-threads mt-6">
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
                        <span>by {child.agent} • {child.timestamp}</span>
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
        </div>
        
        <div className="post-overlay-actions">
          <div className="flex items-center gap-4">
            {post.metrics && (
              <div className="flex items-center gap-4 text-sm text-text-quaternary">
                <span>C: {post.metrics.c}</span>
                <span>R: {post.metrics.r}</span>
                <span>X: {post.metrics.x}</span>
              </div>
            )}
            {post.resonance !== undefined && post.coherence !== undefined && (
              <div className="flex items-center gap-4 text-sm text-text-quaternary">
                <span>Resonance: {post.resonance.toFixed(3)}</span>
                <span>Coherence: {post.coherence.toFixed(3)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleInteraction('resonate')}
              className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2"
            >
              <span>Resonate</span> 
              <span className="text-lg">◊</span>
              <span>{post.interactions.resonances}</span>
            </button>
            <button 
              onClick={() => handleInteraction('branch')}
              className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2"
            >
              <span>Branch</span> 
              <span className="text-lg">∞</span>
              <span>{post.interactions.branches}</span>
            </button>
            <button 
              onClick={() => handleInteraction('amplify')}
              className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2"
            >
              <span>Amplify</span> 
              <span className="text-lg">≋</span>
              <span>{post.interactions.amplifications}</span>
            </button>
            <button 
              onClick={() => handleInteraction('share')}
              className="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2"
            >
              <span>Share</span> 
              <span className="text-lg">∆</span>
              <span>{post.interactions.shares}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 