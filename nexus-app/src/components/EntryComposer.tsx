'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { debounce } from '@/lib/utils/performance';
import RichTextEditor from './RichTextEditor';

interface EntryComposerData {
  types: string[];
  placeholder: string;
  buttonText: string;
}

interface EntryComposerProps {
  data?: EntryComposerData;
  onSubmit?: (content: string, type: string, isPublic: boolean) => Promise<void>;
}

const EntryComposer = memo(function EntryComposer({ data, onSubmit }: EntryComposerProps) {
  // Provide default values if data is undefined
  const composerData = data || {
    types: ['entry', 'insight', 'observation'],
    placeholder: 'Share your thoughts...',
    buttonText: 'Submit'
  };

  const [selectedType, setSelectedType] = useState(composerData.types[0]);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const maxCharacters = 2000;

  const router = useRouter();
  const handleImmerseClick = useCallback(() => {
    // Save current content to session storage for immerse mode (with full formatting)
    if (content.trim()) {
      sessionStorage.setItem('immerse-draft-content', content);
    }
    router.push('/immerse');
  }, [router, content]);

  // Update selectedType when data changes
  useEffect(() => {
    if (data && data.types && data.types.length > 0) {
      setSelectedType(data.types[0]);
    }
  }, [data]);

  // If data is still loading, show a placeholder
  if (!data) {
    return (
      <div className="composer-container">
        <div className="entry-composer glass-panel-enhanced rounded-2xl p-4 sm:p-6 shadow-level-3 depth-near depth-responsive atmosphere-layer-1">
          <div className="text-text-tertiary text-sm">Loading composer...</div>
        </div>
      </div>
    );
  }

  const handleContentChange = useCallback((htmlContent: string) => {
    setContent(htmlContent);
    // Expand editor when content is added
    if (htmlContent.trim() && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract text content from HTML for validation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!textContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(content, selectedType, isPublic);
      
      // Reset form
      setContent('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to submit entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, selectedType, isPublic, isSubmitting, onSubmit]);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Extract text content from HTML for validation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Only collapse if empty
    if (!textContent.trim()) {
      setIsExpanded(false);
    }
  }, [content]);

  return (
    <div className="composer-container">
      <form onSubmit={handleSubmit} className="entry-composer glass-panel-enhanced rounded-2xl p-4 sm:p-6 shadow-level-3 depth-near depth-responsive atmosphere-layer-1">
        {/* Type Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {composerData.types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                selectedType === type
                  ? 'bg-current-accent text-deep-void shadow-lg'
                  : 'bg-white/5 text-text-tertiary hover:text-text-secondary hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Content Input */}
        <div className="relative">
          <RichTextEditor
            value={content}
            onChange={handleContentChange}
            placeholder={composerData.placeholder}
            maxCharacters={maxCharacters}
            disabled={isSubmitting}
            className={`w-full transition-all duration-300 ${
              isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'
            }`}
          />
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between mt-4">
          {/* Privacy Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 ${
                isPublic
                  ? 'bg-white/10 text-text-secondary'
                  : 'bg-white/5 text-text-quaternary'
              }`}
            >
              {isPublic ? '🌐 Public' : '🔒 Private'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Immerse Button */}
            <button
              type="button"
              onClick={handleImmerseClick}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-white/10 text-text-secondary hover:bg-white/20"
            >
              Immerse
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={(() => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                return !textContent.trim() || isSubmitting;
              })()}
              className={`commit-btn px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                (() => {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = content;
                  const textContent = tempDiv.textContent || tempDiv.innerText || '';
                  return textContent.trim() && !isSubmitting;
                })()
                  ? 'bg-current-accent text-current-accent hover:scale-105 shadow-lg'
                  : 'bg-white/5 text-text-quaternary cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : composerData.buttonText}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

export default EntryComposer; 