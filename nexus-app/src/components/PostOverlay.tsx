'use client';

import React from 'react';
import { X } from 'lucide-react';
import { StreamEntry as StreamEntryType } from '@/lib/types';

interface PostOverlayProps {
  post: StreamEntryType | null;
  isOpen: boolean;
  onClose: () => void;
  onInteraction?: (action: string, postId: string) => void;
}

export default function PostOverlay({ post, isOpen, onClose, onInteraction }: PostOverlayProps) {
  if (!post) return null;

  const generatePostTitle = (content: string) => {
    const firstSentence = content.split('.')[0];
    if (firstSentence.length < 60) {
      return firstSentence;
    }
    return content.substring(0, 60) + '...';
  };

  const formatContentForOverlay = (content: string) => {
    return content
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
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
          <div 
            className="post-overlay-content-body"
            dangerouslySetInnerHTML={{ __html: formatContentForOverlay(post.content) }}
          />
          
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
              <div className="text-sm text-text-secondary">{post.response.content}</div>
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