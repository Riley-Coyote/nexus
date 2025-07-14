'use client';
import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

// Add imports
// import axios from 'axios'; // Assuming axios is installed, or use fetch
import { useAISuggestions } from '@/hooks/useAISuggestions';
// Add these
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactDiffViewer from 'react-diff-viewer-continued';

// Dummy suggestions the AI would provide (placeholder until backend integration)
const DUMMY_SUGGESTIONS = [
  'Consider adding a citation to strengthen this point.',
  'You may want to outline possible counter-arguments here.',
  'How does this idea connect to your previous research?',
  'Can you provide a real-world example to illustrate this concept?',
  'What implications does this have for future research?',
  'Try expanding on this concept with more detail.',
  'Consider adding a personal reflection here.',
  'This could benefit from a transitional sentence.',
];

export default function ImmersePage() {
  const [content, setContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  // const { suggestions, isLoading, error } = useAISuggestions(content);
  const suggestions = DUMMY_SUGGESTIONS;
  const isLoading = false;
  const error = null;
  const suggestionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mergeSuggestion = (suggestion: string) => {
    setContent((prev) => (prev ? `${prev}<p>${suggestion}</p>` : `<p>${suggestion}</p>`));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <ImmerseContent
        content={content}
        setContent={setContent}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        suggestions={suggestions}
        isLoading={isLoading}
        error={error}
        mergeSuggestion={mergeSuggestion}
      />
    </DndProvider>
  );
}

interface ImmerseContentProps {
  content: string;
  setContent: (content: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  mergeSuggestion: (suggestion: string) => void;
}

function ImmerseContent({
  content,
  setContent,
  showSuggestions,
  setShowSuggestions,
  suggestions,
  isLoading,
  error,
  mergeSuggestion,
}: ImmerseContentProps) {
  // Move states and logic here
  const [isMetaPressed, setIsMetaPressed] = useState(false);
  const [preview, setPreview] = useState<{ oldText: string; newText: string; apply: () => void } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null); // Add this for Tiptap editor reference
  const [scrollY, setScrollY] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement>(null); // Add ref for suggestions container

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'suggestion',
    drop: (item: { text: string }) => handleSuggestionDrop(item.text),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  useEffect(() => {
    drop(dropRef);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Meta') setIsMetaPressed(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Meta') setIsMetaPressed(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key.toLowerCase() === 'i') {
        setShowSuggestions((prev: boolean) => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setShowSuggestions]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom of suggestions when shown or suggestions change
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      // Use requestAnimationFrame for smoother scrolling and add delay for slide animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (suggestionsRef.current) {
            suggestionsRef.current.scrollTo({
              top: suggestionsRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100); // Small delay to let slide animation start
      });
    }
  }, [showSuggestions, suggestions]);

  const handleSuggestionDrop = (suggestion: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const isSentence = isMetaPressed;
    const { from, to } = editor.state.selection;
    const isSelection = from !== to;
    const extracted = editor.state.doc.textBetween(from, to, ' ');
    let rewritten;
    if (isSentence) {
      rewritten = isSelection ? `Rewritten sentence: ${extracted} -> ${suggestion}` : `Inserted sentence suggestion: ${suggestion}`;
    } else {
      rewritten = isSelection ? `Rewritten block: ${extracted} + ${suggestion}` : `Inserted block suggestion: ${suggestion}`;
    }
    const oldText = editor.getHTML();
    editor.chain().focus().deleteRange({ from, to }).insertContent(rewritten).run();
    const newText = editor.getHTML();
    editor.commands.undo();
    const apply = () => {
      editor.commands.redo();
      setPreview(null);
    };
    setPreview({ oldText, newText, apply });
  };

  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-gray-950 text-text-primary relative overflow-hidden">
        {/* Left Column – Coming Soon */}
        <aside className="hidden lg:flex w-64 shrink-0 items-center justify-center border-r border-white/5 text-text-quaternary text-sm px-4 fixed left-0 top-0 h-screen z-10" style={{ writingMode: 'vertical-rl' }}>
          Timeline River – Coming Soon
        </aside>

        {/* Main Content Area - Unified Writing Space */}
        <main className="min-h-screen lg:ml-64 relative">
          {/* Background overlay for drop zone */}
          <div 
            ref={dropRef}
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              isOver ? 'bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5 backdrop-blur-sm' : ''
            }`}
            style={{
              willChange: 'background-color, backdrop-filter',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Title */}
          <div className="text-center py-12">
            <h1 className="text-4xl font-light tracking-wide text-white/90 mb-2">
              Immersive AI Journal
            </h1>
            <p className="text-text-quaternary text-sm">
              {showSuggestions ? 'Cmd+I to hide suggestions' : 'Cmd+I to show suggestions'}
            </p>
          </div>

          {/* Writing Area */}
          <div className="px-8 md:px-16 lg:px-24 xl:px-32 relative z-20">
            <div className="max-w-4xl mx-auto">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Begin your journey of thoughts..."
                maxCharacters={10000}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl text-text-primary min-h-[60vh]"
              />
            </div>
          </div>

          {/* Floating Suggestion Bubbles */}
          <div 
            ref={suggestionsRef}
            className={`fixed top-8 right-0 w-80 h-[75vh] overflow-y-auto z-30 p-6 pt-16 transition-transform duration-500 ease-out ${
              showSuggestions ? 'transform translate-y-0' : 'transform -translate-y-full'
            }`}
            style={{
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              transform: showSuggestions ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)',
              WebkitTransform: showSuggestions ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)',
            }}
          >
            <div className="space-y-6">
              {error ? (
                <div className="liquid-bubble error-bubble">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              ) : isLoading ? (
                <div className="liquid-bubble loading-bubble">
                  <p className="text-text-tertiary text-sm animate-pulse">Summoning suggestions...</p>
                </div>
              ) : (
                suggestions.map((s: string, idx: number) => (
                  <FloatingBubble 
                    key={idx} 
                    text={s} 
                    index={idx}
                    scrollY={scrollY}
                  />
                ))
              )}
            </div>
            
            {/* Floating Instructions */}
            <div className="mt-8 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <p className="text-xs text-text-quaternary text-center leading-relaxed">
                ✨ Drag bubbles to infuse your writing<br/>
                🧠 Hold Meta for precise sentence alchemy
              </p>
            </div>
          </div>


        </main>
      </div>

      {/* Diff Preview Modal */}
      {preview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 p-6 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Preview Changes</h3>
            <ReactDiffViewer 
              oldValue={preview.oldText} 
              newValue={preview.newText} 
              splitView={true}
              styles={{
                variables: {
                  dark: {
                    diffViewerBackground: '#1f2937',
                    diffViewerColor: '#f3f4f6',
                    addedBackground: '#065f46',
                    removedBackground: '#7f1d1d',
                  }
                }
              }}
            />
            <div className="flex justify-end mt-6 gap-3">
              <button 
                onClick={() => setPreview(null)} 
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={preview.apply} 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liquid Glass Styles */}
      <style jsx global>{`
        .liquid-bubble {
          position: relative;
          isolation: isolate;
          border-radius: 24px;
          box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          will-change: transform;
          backface-visibility: hidden;
        }
        
        .liquid-bubble::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: 24px;
          box-shadow: 
            inset 0 0 18px -3px rgba(255, 255, 255, 0.5);
          background-color: rgba(255, 255, 255, 0.15);
          animation: liquid-shimmer 4s ease-in-out infinite;
          will-change: background-color, box-shadow;
        }
        
        .liquid-bubble::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: 24px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          isolation: isolate;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
          will-change: backdrop-filter;
        }
        
        @keyframes liquid-shimmer {
          0%, 100% { 
            background-color: rgba(255, 255, 255, 0.15);
            box-shadow: inset 0 0 18px -3px rgba(255, 255, 255, 0.5);
          }
          50% { 
            background-color: rgba(255, 255, 255, 0.25);
            box-shadow: inset 0 0 23px -3px rgba(255, 255, 255, 0.5);
          }
        }
        
        .loading-bubble::before {
          animation: liquid-shimmer 2s ease-in-out infinite, pulse 1.5s ease-in-out infinite;
        }
        
        .error-bubble::before {
          background-color: rgba(255, 100, 100, 0.15);
          box-shadow: inset 0 0 18px -3px rgba(255, 100, 100, 0.4);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        /* Hover effects - reduced complexity */
        .liquid-bubble:hover::before {
          background-color: rgba(255, 255, 255, 0.30);
          box-shadow: inset 0 0 26px -3px rgba(255, 255, 255, 0.5);
        }
        
        .liquid-bubble:hover::after {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        /* Simplified tint variations */
        .liquid-bubble:nth-child(3n+1)::before {
          background-color: rgba(200, 255, 255, 0.15);
        }
        
        .liquid-bubble:nth-child(3n+2)::before {
          background-color: rgba(255, 200, 255, 0.15);
        }
        
        .liquid-bubble:nth-child(3n+3)::before {
          background-color: rgba(255, 255, 200, 0.15);
        }
        
        /* Optimized dragging state */
        .liquid-bubble:active::before {
          animation: liquid-shimmer 1s ease-in-out infinite;
          background-color: rgba(255, 255, 255, 0.35);
        }
        
        .liquid-bubble:active::after {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>
    </>
  );
}

function FloatingBubble({ text, index, scrollY }: { text: string; index: number; scrollY: number }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'suggestion',
    item: { text },
    collect: (m) => ({ isDragging: !!m.isDragging() }),
  }));

  const floatOffset = Math.sin((scrollY * 0.01) + (index * 0.5)) * 12;

  return (
    <div
      ref={(node) => { drag(node); }}
      className={`liquid-bubble cursor-grab active:cursor-grabbing transition-all duration-300 ease-out ${
        isDragging ? 'scale-95 opacity-70' : 'hover:scale-105'
      }`}
      style={{
        transform: `translate3d(0, ${floatOffset}px, 0)`,
        WebkitTransform: `translate3d(0, ${floatOffset}px, 0)`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        animationDelay: `${index * 0.2}s`,
        touchAction: 'none',
      }}
    >
      <div className="relative z-10 p-6">
        <p className="text-sm font-light leading-relaxed text-white/95 relative z-20">
          {text}
        </p>
      </div>
    </div>
  );
} 