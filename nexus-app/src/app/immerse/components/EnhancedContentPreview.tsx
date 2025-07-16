import React, { useState, useRef, useEffect } from 'react';
import { ContentMergeResponse, EnhancedSuggestion } from '../types';

interface EnhancedContentPreviewProps {
  originalContent: string;
  mergeResponse: ContentMergeResponse;
  suggestion: EnhancedSuggestion;
  onApply: () => void;
  onCancel: () => void;
  onShowAlternatives?: () => void;
}

export function EnhancedContentPreview({
  originalContent,
  mergeResponse,
  suggestion,
  onApply,
  onCancel,
  onShowAlternatives
}: EnhancedContentPreviewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Animate in on mount
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 50);
  }, []);

  // Get style configuration based on change type
  const getChangeTypeStyle = (changeType: ContentMergeResponse['changeType']) => {
    switch (changeType) {
      case 'minor_edit':
        return {
          color: 'emerald',
          icon: '✨',
          label: 'Minor Enhancement',
          description: 'Small addition that enriches your content'
        };
      case 'significant_enhancement':
        return {
          color: 'blue',
          icon: '🔮',
          label: 'Significant Enhancement',
          description: 'Meaningful improvement to your ideas'
        };
      case 'structural_change':
        return {
          color: 'purple',
          icon: '🔄',
          label: 'Structural Change',
          description: 'Reorganizes content for better flow'
        };
      default:
        return {
          color: 'gray',
          icon: '📝',
          label: 'Edit',
          description: 'Content modification'
        };
    }
  };

  const changeStyle = getChangeTypeStyle(mergeResponse.changeType);

  // Generate word-level diff for visual highlighting
  const generateWordDiff = (original: string, merged: string) => {
    const originalWords = original.split(/(\s+)/);
    const mergedWords = merged.split(/(\s+)/);
    
    const diffResult = [];
    let originalIndex = 0;
    let mergedIndex = 0;
    
    while (originalIndex < originalWords.length || mergedIndex < mergedWords.length) {
      if (originalIndex >= originalWords.length) {
        // Addition at the end
        diffResult.push({ type: 'added', text: mergedWords[mergedIndex] });
        mergedIndex++;
      } else if (mergedIndex >= mergedWords.length) {
        // Deletion at the end
        diffResult.push({ type: 'removed', text: originalWords[originalIndex] });
        originalIndex++;
      } else if (originalWords[originalIndex] === mergedWords[mergedIndex]) {
        // Same word
        diffResult.push({ type: 'unchanged', text: originalWords[originalIndex] });
        originalIndex++;
        mergedIndex++;
      } else {
        // Find next matching word
        let found = false;
        for (let i = mergedIndex + 1; i < Math.min(mergedIndex + 5, mergedWords.length); i++) {
          if (originalWords[originalIndex] === mergedWords[i]) {
            // Addition
            for (let j = mergedIndex; j < i; j++) {
              diffResult.push({ type: 'added', text: mergedWords[j] });
            }
            diffResult.push({ type: 'unchanged', text: originalWords[originalIndex] });
            originalIndex++;
            mergedIndex = i + 1;
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Check for removal
          for (let i = originalIndex + 1; i < Math.min(originalIndex + 5, originalWords.length); i++) {
            if (originalWords[i] === mergedWords[mergedIndex]) {
              // Removal
              for (let j = originalIndex; j < i; j++) {
                diffResult.push({ type: 'removed', text: originalWords[j] });
              }
              diffResult.push({ type: 'unchanged', text: originalWords[i] });
              originalIndex = i + 1;
              mergedIndex++;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // Different words - mark as change
          diffResult.push({ type: 'removed', text: originalWords[originalIndex] });
          diffResult.push({ type: 'added', text: mergedWords[mergedIndex] });
          originalIndex++;
          mergedIndex++;
        }
      }
    }
    
    return diffResult;
  };

  const wordDiff = generateWordDiff(originalContent, mergeResponse.mergedText);
  const confidencePercentage = Math.round(mergeResponse.confidence * 100);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      <div 
        ref={previewRef}
        className={`
          bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl 
          max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl
          transition-all duration-500 ease-out
          ${animateIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Header */}
        <div className={`p-6 border-b border-white/10 bg-${changeStyle.color}-500/10`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                bg-${changeStyle.color}-500/20 border border-${changeStyle.color}-400/30
              `}>
                <span className="text-xl">{changeStyle.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{changeStyle.label}</h3>
                <p className="text-sm text-white/70">{changeStyle.description}</p>
              </div>
            </div>
            
            {/* Confidence Indicator */}
            <div className="text-right">
              <div className="text-sm text-white/70 mb-1">AI Confidence</div>
              <div className={`
                px-3 py-1 rounded-full text-sm font-medium
                bg-${changeStyle.color}-500/20 text-${changeStyle.color}-300
              `}>
                {confidencePercentage}%
              </div>
            </div>
          </div>

          {/* Suggestion Type Badge */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-white/60">Suggestion Type:</span>
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide
              bg-${changeStyle.color}-500/20 text-${changeStyle.color}-300
            `}>
              {suggestion.type} • {suggestion.suggestedAction}
            </span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* AI Explanation */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-blue-300 text-sm">AI</span>
              </div>
              <div>
                <p className="text-white/90 text-sm leading-relaxed">{mergeResponse.explanation}</p>
                {suggestion.metadata.expectedImpact && (
                  <p className="text-white/60 text-xs mt-2">
                    <strong>Expected Impact:</strong> {suggestion.metadata.expectedImpact}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Word-Level Diff Display */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white/80 mb-3">Content Changes</h4>
            <div className="p-4 rounded-xl bg-black/30 border border-white/10">
              <div className="text-sm leading-relaxed">
                {wordDiff.map((word, index) => {
                  switch (word.type) {
                    case 'added':
                      return (
                        <span
                          key={index}
                          className="bg-emerald-500/20 text-emerald-200 px-1 rounded border-l-2 border-emerald-400"
                        >
                          {word.text}
                        </span>
                      );
                    case 'removed':
                      return (
                        <span
                          key={index}
                          className="bg-red-500/20 text-red-200 px-1 rounded line-through border-l-2 border-red-400"
                        >
                          {word.text}
                        </span>
                      );
                    default:
                      return (
                        <span key={index} className="text-white/90">
                          {word.text}
                        </span>
                      );
                  }
                })}
              </div>
            </div>
          </div>

          {/* Change Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
              <h5 className="text-sm font-medium text-emerald-300 mb-2">Preserved Elements</h5>
              <ul className="text-xs text-emerald-200/80 space-y-1">
                {mergeResponse.preservedElements.map((element, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                    {element}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-400/20">
              <h5 className="text-sm font-medium text-blue-300 mb-2">Added Elements</h5>
              <ul className="text-xs text-blue-200/80 space-y-1">
                {mergeResponse.addedElements.map((element, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                    {element}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-white/60 hover:text-white/80 transition-colors mb-4"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>

          {/* Technical Details */}
          {showDetails && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Suggestion Metadata:</strong>
                  <div className="mt-1 space-y-1">
                    <div>Complexity: {suggestion.metadata.complexity}</div>
                    <div>Word Count: {suggestion.metadata.wordCount}</div>
                    <div>Emotional Tone: {suggestion.emotionalTone}</div>
                  </div>
                </div>
                <div>
                  <strong>Focus Areas:</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestion.metadata.focusAreas.map((area, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-white/10">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onShowAlternatives && (
                <button
                  onClick={onShowAlternatives}
                  className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors text-white/80"
                >
                  Show Alternatives
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={onApply}
                className={`
                  px-6 py-2 rounded-lg transition-all font-medium
                  bg-${changeStyle.color}-600 hover:bg-${changeStyle.color}-500 
                  text-white shadow-lg hover:shadow-xl
                  transform hover:scale-105 active:scale-95
                `}
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