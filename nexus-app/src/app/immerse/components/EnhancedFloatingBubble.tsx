import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { EnhancedSuggestion, DragState } from '../types';

interface EnhancedFloatingBubbleProps {
  suggestion: EnhancedSuggestion;
  index: number;
  scrollY: number;
  onDragStart?: (suggestion: EnhancedSuggestion) => void;
  onDragEnd?: () => void;
  onHover?: (id: string | null) => void;
  isActiveDrag?: boolean;
  onClick?: (suggestion: EnhancedSuggestion) => void;
}

// Suggestion type icons and colors
const SUGGESTION_STYLES = {
  enhance: { icon: '✨', color: 'from-emerald-500/20 to-emerald-600/30', accent: 'emerald' },
  expand: { icon: '🌱', color: 'from-blue-500/20 to-blue-600/30', accent: 'blue' },
  clarify: { icon: '🔍', color: 'from-amber-500/20 to-amber-600/30', accent: 'amber' },
  connect: { icon: '🔗', color: 'from-purple-500/20 to-purple-600/30', accent: 'purple' },
  counter: { icon: '⚖️', color: 'from-red-500/20 to-red-600/30', accent: 'red' },
  example: { icon: '💡', color: 'from-orange-500/20 to-orange-600/30', accent: 'orange' }
};

const EMOTIONAL_TONE_STYLES = {
  neutral: 'border-gray-400/30',
  warm: 'border-orange-400/40',
  analytical: 'border-blue-400/40',
  creative: 'border-purple-400/40',
  empathetic: 'border-pink-400/40'
};

export function EnhancedFloatingBubble({
  suggestion,
  index,
  scrollY,
  onDragStart,
  onDragEnd,
  onHover,
  isActiveDrag = false,
  onClick
}: EnhancedFloatingBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverDuration, setHoverDuration] = useState(0);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const [{ isDragging, canDrag }, drag] = useDrag(() => ({
    type: 'enhanced-suggestion',
    item: () => {
      // This function is called when dragging begins in v14+
      onDragStart?.(suggestion);
      return suggestion;
    },
    canDrag: true,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
      canDrag: monitor.canDrag()
    }),
    end: () => {
      onDragEnd?.();
    }
  }), [suggestion, onDragStart, onDragEnd]);

  // Connect drag ref
  useEffect(() => {
    if (bubbleRef.current) {
      drag(bubbleRef.current);
    }
  }, [drag]);

  // Hover timer management
  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setInterval(() => {
        setHoverDuration(prev => prev + 100);
      }, 100);
    } else {
      if (hoverTimerRef.current) {
        clearInterval(hoverTimerRef.current);
      }
      setHoverDuration(0);
    }

    return () => {
      if (hoverTimerRef.current) {
        clearInterval(hoverTimerRef.current);
      }
    };
  }, [isHovered]);

  // Calculate floating animation
  const floatOffset = Math.sin((scrollY * 0.01) + (index * 0.5)) * 8;
  const hoverOffset = isHovered ? -4 : 0;
  const dragOffset = isDragging ? -8 : 0;

  // Get style configuration
  const styleConfig = SUGGESTION_STYLES[suggestion.type];
  const emotionalStyle = EMOTIONAL_TONE_STYLES[suggestion.emotionalTone];

  // Calculate confidence-based opacity
  const confidenceOpacity = Math.max(0.7, suggestion.confidence);
  
  // Calculate context relevance glow
  const relevanceGlow = suggestion.contextRelevance > 0.8 ? 'shadow-lg' : 
                       suggestion.contextRelevance > 0.6 ? 'shadow-md' : 'shadow-sm';

  return (
    <div
      ref={bubbleRef}
      className={`
        enhanced-bubble relative cursor-grab active:cursor-grabbing
        transition-all duration-300 ease-out
        ${isDragging ? 'scale-95 opacity-0' : 'hover:scale-105'}
        ${isActiveDrag ? 'ring-2 ring-blue-400/50' : ''}
        ${relevanceGlow}
      `}
      style={{
        transform: `translate3d(0, ${floatOffset + hoverOffset + dragOffset}px, 0)`,
        WebkitTransform: `translate3d(0, ${floatOffset + hoverOffset + dragOffset}px, 0)`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        animationDelay: `${index * 0.15}s`,
        touchAction: 'none',
        opacity: confidenceOpacity
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover?.(suggestion.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover?.(null);
      }}
      onClick={() => onClick?.(suggestion)}
    >
      {/* Main Bubble Container */}
      <div className={`
        liquid-bubble overflow-hidden border
        bg-gradient-to-br ${styleConfig.color}
        ${emotionalStyle}
        backdrop-blur-xl
      `}>
        {/* Confidence Indicator Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className={`h-full bg-gradient-to-r from-${styleConfig.accent}-400 to-${styleConfig.accent}-300 transition-all duration-500`}
            style={{ width: `${suggestion.confidence * 100}%` }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-4">
          {/* Header with Type Icon and Action */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{styleConfig.icon}</span>
              <span className={`text-xs font-medium text-${styleConfig.accent}-300 uppercase tracking-wide`}>
                {suggestion.type}
              </span>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full bg-${styleConfig.accent}-500/20 text-${styleConfig.accent}-200`}>
              {suggestion.suggestedAction}
            </div>
          </div>

          {/* Main Suggestion Text */}
          <p className="text-sm font-light leading-relaxed text-white/95 relative z-20 mb-3">
            {suggestion.text}
          </p>

          {/* Click hint */}
          <div className="text-xs text-white/50 mb-2">
            Click to apply • Drag for preview
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                {suggestion.metadata.complexity}
              </span>
              <span>{suggestion.metadata.wordCount}w</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
              <span>{Math.round(suggestion.contextRelevance * 100)}%</span>
            </div>
          </div>

          {/* Hover Details */}
          {isHovered && hoverDuration > 800 && (
            <div className="absolute inset-x-0 -bottom-16 mx-2 p-3 rounded-lg bg-black/80 backdrop-blur-xl border border-white/10 z-30 text-xs text-white/80">
              <div className="font-medium mb-1">{suggestion.metadata.expectedImpact}</div>
              <div className="flex flex-wrap gap-1">
                {suggestion.metadata.focusAreas.map((area, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded-full bg-${styleConfig.accent}-500/20 text-${styleConfig.accent}-200`}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Liquid Effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Shimmer effect */}
          <div className={`
            absolute inset-0 opacity-30
            bg-gradient-to-r from-transparent via-white/10 to-transparent
            transform -skew-x-12 translate-x-[-100%]
            ${isHovered ? 'animate-shimmer' : ''}
          `} />
          
          {/* Pulse rings for high relevance */}
          {suggestion.contextRelevance > 0.9 && (
            <div className="absolute inset-0">
              <div className={`absolute inset-0 rounded-[24px] border-2 border-${styleConfig.accent}-400/30 animate-ping`} />
              <div className={`absolute inset-2 rounded-[20px] border border-${styleConfig.accent}-400/20 animate-pulse`} />
            </div>
          )}

          {/* Drag feedback overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-[24px] animate-pulse" />
          )}
        </div>
      </div>

      {/* Enhanced Drop Shadow */}
      <div 
        className={`
          absolute inset-0 -z-10 rounded-[24px] blur-xl
          bg-gradient-to-br ${styleConfig.color}
          transition-all duration-300
          ${isHovered ? 'scale-110 opacity-60' : 'scale-100 opacity-30'}
          ${isDragging ? 'scale-120 opacity-80' : ''}
        `}
      />
    </div>
  );
}

// Enhanced styles for shimmer animation
const styles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%) skewX(-12deg); }
    100% { transform: translateX(200%) skewX(-12deg); }
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out;
  }
  
  .enhanced-bubble:hover .animate-shimmer {
    animation: shimmer 1.5s ease-in-out infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 