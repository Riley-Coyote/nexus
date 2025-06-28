'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Globe } from 'lucide-react';
import { debounce } from '@/lib/utils/performance';

interface EntryComposerData {
  types: string[];
  placeholder: string;
  buttonText: string;
}

interface EntryComposerProps {
  data: EntryComposerData;
  onSubmit?: (content: string, type: string, isPublic: boolean) => void;
}

const EntryComposer = memo(function EntryComposer({ data, onSubmit }: EntryComposerProps) {
  const [selectedType, setSelectedType] = useState(data.types[0]);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxCharacters = 2000;

  // Debounced character count update for performance
  const updateCharacterCount = useCallback(
    debounce((text: string) => {
      setCharacterCount(text.length);
    }, 100),
    []
  );

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxCharacters) {
      setContent(newContent);
      updateCharacterCount(newContent);
    }
  }, [updateCharacterCount, maxCharacters]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(content, selectedType, isPublic);
      
      // Reset form
      setContent('');
      setCharacterCount(0);
      setIsExpanded(false);
      
      // Blur textarea to close mobile keyboard
      textareaRef.current?.blur();
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
    // Only collapse if empty
    if (!content.trim()) {
      setIsExpanded(false);
    }
  }, [content]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  return (
    <div className="composer-container">
      <form onSubmit={handleSubmit} className="entry-composer glass-panel-enhanced rounded-2xl p-4 sm:p-6 shadow-level-3 depth-near depth-responsive atmosphere-layer-1">
        {/* Type Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {data.types.map((type) => (
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
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={data.placeholder}
            className={`entry-composer-textarea w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-quaternary resize-none transition-all duration-300 ${
              isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'
            } focus:border-current-accent focus:ring-1 focus:ring-current-accent focus:outline-none`}
            disabled={isSubmitting}
          />
          
          {/* Character Count */}
          {characterCount > 0 && (
            <div className={`absolute bottom-2 right-2 text-xs ${
              characterCount > maxCharacters * 0.9 
                ? 'text-red-400' 
                : 'text-text-quaternary'
            }`}>
              {characterCount}/{maxCharacters}
            </div>
          )}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className={`commit-btn px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              content.trim() && !isSubmitting
                ? 'bg-current-accent text-deep-void hover:scale-105 shadow-lg'
                : 'bg-white/5 text-text-quaternary cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Submitting...' : data.buttonText}
          </button>
        </div>
      </form>
    </div>
  );
});

export default EntryComposer; 