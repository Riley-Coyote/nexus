import React from 'react';
import { EnhancedSuggestion } from '../types';

interface DiffPreviewProps {
  originalText: string;
  newText: string;
  suggestion: EnhancedSuggestion;
  onApply: () => void;
  onCancel: () => void;
  isDocumentRewrite?: boolean;
}

export function DiffPreview({
  originalText,
  newText,
  suggestion,
  onApply,
  onCancel,
  isDocumentRewrite = false
}: DiffPreviewProps) {
  // Simple diff highlighting - split into words and find differences
  const getWordDiff = (original: string, updated: string) => {
    const originalWords = original.split(/(\s+)/);
    const updatedWords = updated.split(/(\s+)/);
    
    const maxLen = Math.max(originalWords.length, updatedWords.length);
    const originalResult: Array<{text: string, type: 'same' | 'removed'}> = [];
    const updatedResult: Array<{text: string, type: 'same' | 'added'}> = [];
    
    for (let i = 0; i < maxLen; i++) {
      const orig = originalWords[i] || '';
      const upd = updatedWords[i] || '';
      
      if (orig === upd) {
        originalResult.push({text: orig, type: 'same'});
        updatedResult.push({text: upd, type: 'same'});
      } else {
        if (orig) originalResult.push({text: orig, type: 'removed'});
        if (upd) updatedResult.push({text: upd, type: 'added'});
      }
    }
    
    return { original: originalResult, updated: updatedResult };
  };

  const diff = getWordDiff(originalText, newText);
  const suggestionIcon = {
    enhance: '✨',
    expand: '🌱', 
    clarify: '🔍',
    connect: '🔗',
    counter: '⚖️',
    example: '💡'
  }[suggestion.type];

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{suggestionIcon}</span>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {isDocumentRewrite ? 'Document Rewrite Preview' : 'Text Enhancement Preview'}
                </h3>
                <p className="text-sm text-white/70">
                  {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} suggestion: "{truncateText(suggestion.text, 100)}"
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Diff Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Before */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/30"></div>
                <h4 className="text-sm font-medium text-white/90">Before</h4>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 min-h-[200px]">
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {diff.original.map((part, i) => (
                    <span
                      key={i}
                      className={
                        part.type === 'removed' 
                          ? 'bg-red-500/20 text-red-200 line-through px-1 rounded' 
                          : ''
                      }
                    >
                      {part.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* After */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400/30"></div>
                <h4 className="text-sm font-medium text-white/90">After</h4>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 min-h-[200px]">
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {diff.updated.map((part, i) => (
                    <span
                      key={i}
                      className={
                        part.type === 'added' 
                          ? 'bg-green-500/20 text-green-200 px-1 rounded' 
                          : ''
                      }
                    >
                      {part.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400/50"></div>
              <span>Original: {originalText.split(' ').length} words</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400/50"></div>
              <span>Enhanced: {newText.split(' ').length} words</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400/50"></div>
              <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">
              This {isDocumentRewrite ? 'will rewrite your entire document' : 'will replace the selected text'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onApply}
                className="px-6 py-2 bg-green-500 border border-green-400 rounded-lg text-white hover:bg-green-600 transition-colors font-medium"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 