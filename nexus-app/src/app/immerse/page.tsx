'use client';
import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

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

  // Custom Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit to ensure lists work properly
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
    ],
    content: content || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
    },
  });

  // Update editorRef when editor changes
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Sync editor content when content prop changes
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      if (content === '' || content === '<p></p>') {
        editor.commands.clearContent(true);
      } else {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

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

  // Helper to render toolbar buttons
  const renderToolbarBtn = (
    label: React.ReactNode,
    isActive: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      className={`floating-toolbar-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

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
              <div className="custom-editor rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl text-text-primary min-h-[60vh] p-6">
                <EditorContent
                  editor={editor}
                  className="prose prose-invert max-w-none focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Floating Toolbar */}
          {editor && (
            <div className="fixed left-1/2 -translate-x-1/2 top-[75%] -translate-y-1/2 z-30">
              <div className="floating-toolbar bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg">
                <div className="flex items-center gap-1 p-2">
                  {renderToolbarBtn(<strong>B</strong>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
                  {renderToolbarBtn(<em>I</em>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
                  {renderToolbarBtn(<u>U</u>, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
                  <div className="w-px h-6 bg-gray-600 mx-1"></div>
                  {renderToolbarBtn('•', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
                  {renderToolbarBtn('1.', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
                  <div className="w-px h-6 bg-gray-600 mx-1"></div>
                  {renderToolbarBtn('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
                  {renderToolbarBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                  {renderToolbarBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                  {renderToolbarBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                </div>
              </div>
            </div>
          )}

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

      {/* Styles */}
      <style jsx global>{`
        .custom-editor .ProseMirror {
          outline: none;
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          line-height: 1.7;
        }

        .custom-editor .ProseMirror p {
          margin: 1em 0;
        }

        .custom-editor .ProseMirror h1 {
          font-size: 2em;
          font-weight: 600;
          margin: 1.5em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .custom-editor .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 1.3em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .custom-editor .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 1.2em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .custom-editor .ProseMirror ul,
        .custom-editor .ProseMirror ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .custom-editor .ProseMirror ul {
          list-style-type: disc;
        }

        .custom-editor .ProseMirror ol {
          list-style-type: decimal;
        }

        .custom-editor .ProseMirror li {
          margin: 0.5em 0;
        }

        .custom-editor .ProseMirror li p {
          margin: 0;
        }

        .custom-editor .ProseMirror strong {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .custom-editor .ProseMirror em {
          font-style: italic;
        }

        .custom-editor .ProseMirror u {
          text-decoration: underline;
        }

        .custom-editor .ProseMirror.ProseMirror-focused {
          outline: none;
        }

        /* Placeholder styling */
        .custom-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: "Begin your journey of thoughts...";
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .custom-editor .ProseMirror:empty::before {
          content: "Begin your journey of thoughts...";
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
        }

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

        /* Floating Toolbar Styles */
        .floating-toolbar {
          border-radius: 8px;
        }

        .floating-toolbar-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .floating-toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .floating-toolbar-btn.active {
          background: rgba(34, 197, 94, 0.2);
          color: rgba(34, 197, 94, 1);
        }

        .floating-toolbar-btn.active:hover {
          background: rgba(34, 197, 94, 0.3);
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