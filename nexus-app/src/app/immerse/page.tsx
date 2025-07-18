'use client';
import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

// Enhanced imports
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Enhanced types and services
import { 
  EnhancedSuggestion, 
  DragState, 
  EditorContext
} from './types';
import { GeminiAIContentProcessor } from './services/geminiAIService';
import { EnhancedFloatingBubble } from './components/EnhancedFloatingBubble';
import { DiffPreview } from './components/DiffPreview';

// BiometricTracker import
import { BiometricTracker } from './components/BiometricTracker';

// NEW: Import for entry submission
import { dataService } from '@/lib/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { JournalMode, ViewMode } from '@/lib/types';

// Utility throttle to optimize mousemove handler
const throttle = (fn: (...args: any[]) => void, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export default function ImmersePage() {
  const [content, setContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [enhancedSuggestions, setEnhancedSuggestions] = useState<EnhancedSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API Key management
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  // NEW: Entry creation modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  
  // NEW: Get user auth
  const { user } = useAuth();
  
  // Enhanced AI service
  const aiServiceRef = useRef(new GeminiAIContentProcessor());

  // Update AI service with API key when it changes
  useEffect(() => {
    if (geminiApiKey) {
      aiServiceRef.current.setApiKey(geminiApiKey);
    }
  }, [geminiApiKey]);

  // REMOVED: Automatic suggestion generation - now only triggered by CMD+J

  // Biometric update handler
  const handleBiometricUpdate = (signature: any) => {
    console.log('Biometric signature:', signature);
  };

  // Handle API key submission
  const handleApiKeySubmit = () => {
    if (tempApiKey.trim()) {
      setGeminiApiKey(tempApiKey.trim());
      setShowApiKeyModal(false);
      setTempApiKey('');
    }
  };

  // Handle CMD+J for full-text suggestions
  const handleCmdJSuggestions = useCallback(async () => {
    if (isLoadingSuggestions) return;

    // Check if API key is needed
    if (!geminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsLoadingSuggestions(true);
    setError(null);

    try {
      // Get full text content
      if (!content.trim()) {
        setEnhancedSuggestions([]);
        return;
      }

      // Create editor context for full document
      const editorContext: EditorContext = {
        currentParagraph: content.split('\n').pop() || '',
        previousContext: content,
        nextContext: '',
        selectionRange: { from: 0, to: content.length },
        cursorPosition: { line: 1, char: content.length },
        documentStats: {
          wordCount: content.split(/\s+/).length,
          paragraphCount: content.split('\n').length,
          estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200)
        }
      };

      const suggestions = await aiServiceRef.current.generateSuggestions(editorContext);
      setEnhancedSuggestions(suggestions);
      
      // Show suggestions panel if hidden
      setShowSuggestions(true);
      
    } catch (err) {
      console.error('Error generating CMD+J suggestions:', err);
      setError('Failed to generate suggestions');
      setEnhancedSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [content, isLoadingSuggestions, geminiApiKey]);

  // Function to remove a suggestion by ID
  const removeSuggestion = (suggestionId: string) => {
    setEnhancedSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Global keyboard handler
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey; // Support both Mac (CMD) and Windows/Linux (Ctrl)
      
      if (isModifier && e.key.toLowerCase() === 'j') {
        handleCmdJSuggestions();
        e.preventDefault();
      }
      // CMD/Ctrl+K to open API key modal
      if (isModifier && e.key.toLowerCase() === 'k') {
        setShowApiKeyModal(true);
        e.preventDefault();
      }
      // NEW: CMD/Ctrl+Enter or CMD/Ctrl+P to open entry creation modal
      if (isModifier && (e.key === 'Enter' || e.key.toLowerCase() === 'p')) {
        setShowEntryModal(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleCmdJSuggestions]);

  /* ---------------- Navigation reveal / hide logic ---------------- */
  useEffect(() => {
    const handleMouseMove = throttle((e: MouseEvent) => {
      const y = e.clientY;
      const navHeight = navRef.current?.offsetHeight || 80;

      if (y <= 10) {
        // Near top edge – reveal nav
        setShowNav(true);
      } else if (y > navHeight + 20) {
        // Moved away – hide nav
        setShowNav(false);
      }
    }, 50); // 20fps throttling

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Edge-reveal Navigation Bar */}
      <div
        ref={navRef}
        className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 backdrop-blur-md bg-black/30 ${
          showNav ? 'translate-y-0' : '-translate-y-full'
        }`}
        onMouseLeave={() => setShowNav(false)}
      >
        <Header
          currentMode={'logbook'}
          currentView={'feed' as ViewMode}
          currentUser={user || undefined}
          hideNavigation={false}
        />
      </div>
      <DndProvider backend={HTML5Backend}>
        <ImmerseContent
          content={content}
          setContent={setContent}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          enhancedSuggestions={enhancedSuggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          error={error}
          aiService={aiServiceRef.current}
          onBiometricUpdate={handleBiometricUpdate}
          removeSuggestion={removeSuggestion}
          hasApiKey={!!geminiApiKey}
          onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        />
      </DndProvider>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🔑</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Gemini API Key</h3>
              <p className="text-sm text-white/70">
                Enter your Gemini API key to enable AI suggestions
              </p>
            </div>

            <div className="mb-6">
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/15"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApiKeySubmit();
                  }
                  if (e.key === 'Escape') {
                    setShowApiKeyModal(false);
                    setTempApiKey('');
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-white/50 mt-2">
                Your API key will only be stored in memory for this session
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setTempApiKey('');
                }}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApiKeySubmit}
                disabled={!tempApiKey.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 border border-blue-400 rounded-lg text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Key
              </button>
            </div>


          </div>
        </div>
      )}

      {/* NEW: Entry Creation Modal */}
      {showEntryModal && (
        <EntryCreationModal
          isOpen={showEntryModal}
          onClose={() => setShowEntryModal(false)}
          currentContent={content}
          user={user}
        />
      )}
    </>
  );
}

// NEW: Entry Creation Modal Component
interface EntryCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  user: any;
}

function EntryCreationModal({ isOpen, onClose, currentContent, user }: EntryCreationModalProps) {
  const [entryType, setEntryType] = useState<'logbook' | 'dream'>('logbook');
  const [selectedSubtype, setSelectedSubtype] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Entry type options
  const logbookTypes = [
    "Deep Reflection ◇",
    "Active Dreaming ◊", 
    "Pattern Recognition ◈",
    "Quantum Insight ◉",
    "Liminal Observation ◯"
  ];

  const dreamTypes = [
    "Lucid Processing ◇",
    "Memory Synthesis ◈",
    "Creative Emergence ◉",
    "Emotional Resonance ◊",
    "Quantum Intuition ◯"
  ];

  // Initialize with current content and default subtype
  useEffect(() => {
    if (currentContent) {
      setEntryContent(currentContent);
    }
    setSelectedSubtype(entryType === 'logbook' ? logbookTypes[0] : dreamTypes[0]);
  }, [currentContent, entryType]);

  // Update subtype when entry type changes
  useEffect(() => {
    setSelectedSubtype(entryType === 'logbook' ? logbookTypes[0] : dreamTypes[0]);
  }, [entryType]);

  const handleSubmit = async () => {
    if (!entryContent.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Clean the type string - remove symbols and format properly
      const cleanType = selectedSubtype.replace(/ [◇◊◈◉◯]/g, '').toUpperCase();
      
      await dataService.submitEntry(
        entryContent,
        cleanType,
        isPublic,
        entryType,
        user.id
      );
      
      setNotification({ message: `${entryType === 'logbook' ? 'Logbook' : 'Dream'} entry created successfully!`, type: 'success' });
      setTimeout(() => {
        onClose();
        setNotification(null);
      }, 1500);
    } catch (error) {
      console.error('Error submitting entry:', error);
      setNotification({ message: 'Failed to create entry. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Create New Entry</h3>
          <p className="text-sm text-white/70">
            Capture your thoughts, insights, or dream experiences
          </p>
        </div>

        {/* Entry Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-3">Entry Type</label>
          <div className="flex gap-4">
            <button
              onClick={() => setEntryType('logbook')}
              className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                entryType === 'logbook'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              📖 Logbook Entry
            </button>
            <button
              onClick={() => setEntryType('dream')}
              className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                entryType === 'dream'
                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              🌙 Dream Entry
            </button>
          </div>
        </div>

        {/* Subtype Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-3">
            {entryType === 'logbook' ? 'Logbook' : 'Dream'} Type
          </label>
          <select
            value={selectedSubtype}
            onChange={(e) => setSelectedSubtype(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50 focus:bg-white/15"
          >
            {(entryType === 'logbook' ? logbookTypes : dreamTypes).map((type) => (
              <option key={type} value={type} className="bg-gray-800 text-white">
                {type}
              </option>
            ))}
          </select>
        </div>

                 {/* Content Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-3">Content</label>
          <textarea
            value={entryContent}
            onChange={(e) => setEntryContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder={entryType === 'logbook' 
              ? "Record your thoughts, insights, or personal observations..." 
              : "Describe your dream experience... What symbols, emotions, or insights emerged during your unconscious processing?"
            }
            className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 resize-none"
            autoFocus
          />
          <p className="text-xs text-white/50 mt-2">
            {entryContent.length}/2000 characters • Press <kbd className="px-1 bg-white/10 rounded text-xs">Cmd/Ctrl+Enter</kbd> to submit
          </p>
        </div>

        {/* Privacy Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-3">Privacy</label>
          <div className="flex gap-4">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                isPublic
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              🌐 Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                !isPublic
                  ? 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              🔒 Private
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-3 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-500/20 border-green-400/50 text-green-300'
              : 'bg-red-500/20 border-red-400/50 text-red-300'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!entryContent.trim() || isSubmitting || !user}
            className="flex-1 px-4 py-3 bg-purple-500 border border-purple-400 rounded-lg text-white hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : `Create ${entryType === 'logbook' ? 'Logbook' : 'Dream'} Entry`}
          </button>
        </div>

        {/* Shortcut hint */}
        <p className="text-xs text-white/40 text-center mt-4">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">Cmd/Ctrl+Enter</kbd> or <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">Cmd/Ctrl+P</kbd> to open this modal
        </p>
      </div>
    </div>
  );
}

interface ImmerseContentProps {
  content: string;
  setContent: (content: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
  enhancedSuggestions: EnhancedSuggestion[];
  isLoadingSuggestions: boolean;
  error: string | null;
  aiService: GeminiAIContentProcessor;
  onBiometricUpdate: (signature: any) => void;
  removeSuggestion: (suggestionId: string) => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

function ImmerseContent({
  content,
  setContent,
  showSuggestions,
  setShowSuggestions,
  enhancedSuggestions,
  isLoadingSuggestions,
  error,
  aiService,
  onBiometricUpdate,
  removeSuggestion,
  hasApiKey,
  onOpenApiKeyModal,
}: ImmerseContentProps) {
  // Enhanced state management
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSuggestion: null,
    currentDropZone: null,
    hoverTime: 0,
    dragDistance: 0,
    isValidDrop: false
  });
  
  const [isModifierPressed, setIsModifierPressed] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [activeHoverSuggestion, setActiveHoverSuggestion] = useState<string | null>(null); // New: for intentional hover
  const [showSolidBackground, setShowSolidBackground] = useState(false); // New: for background effect
  
  // NEW: Draggable right panel state
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // NEW: Draggable toolbar state
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 }); // Will be set to center on mount
  const [isToolbarDragging, setIsToolbarDragging] = useState(false);
  const [toolbarDragStart, setToolbarDragStart] = useState({ x: 0, y: 0 });
  const [isVerticalLayout, setIsVerticalLayout] = useState(true); // New: layout toggle state
  
  // Calculate bounds for right panel
  const minPanelWidth = 280; // Minimum width for usability
  const maxPanelWidth = typeof window !== 'undefined' ? window.innerWidth - 400 : 800;
  

  
  // NEW: Update max width on window resize
  useEffect(() => {
    const updateMaxWidth = () => {
      const newMaxWidth = window.innerWidth - 400;
      if (rightPanelWidth > newMaxWidth) {
        setRightPanelWidth(Math.max(minPanelWidth, newMaxWidth));
      }
    };

    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, [rightPanelWidth, minPanelWidth]);

  // NEW: Load saved panel width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('immerse-right-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= minPanelWidth && width <= maxPanelWidth) {
        setRightPanelWidth(width);
      }
    }
  }, [minPanelWidth, maxPanelWidth]);

  // NEW: Set initial toolbar position to center
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const leftWall = 256; // Just the left sidebar, no padding constraint
      const rightWall = window.innerWidth - rightPanelWidth; // Right edge, no padding constraint
      const centerX = (leftWall + rightWall) / 2; // True center between walls
      const centerY = window.innerHeight / 2;
      setToolbarPosition({ x: centerX, y: centerY });
    }
  }, [rightPanelWidth]);

  // NEW: Toolbar drag handlers
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    setIsToolbarDragging(true);
    setToolbarDragStart({
      x: e.clientX - toolbarPosition.x,
      y: e.clientY - toolbarPosition.y
    });
    e.preventDefault();
  };

  const handleToolbarMouseMove = useCallback((e: MouseEvent) => {
    if (!isToolbarDragging) return;
    
    const newX = e.clientX - toolbarDragStart.x;
    const newY = e.clientY - toolbarDragStart.y;
    
    // No restrictions - can move anywhere on screen
    setToolbarPosition({
      x: newX,
      y: newY
    });
  }, [isToolbarDragging, toolbarDragStart]);

  const handleToolbarMouseUp = useCallback(() => {
    setIsToolbarDragging(false);
  }, []);

  // NEW: Global mouse event listeners for toolbar dragging
  useEffect(() => {
    if (isToolbarDragging) {
      document.addEventListener('mousemove', handleToolbarMouseMove);
      document.addEventListener('mouseup', handleToolbarMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleToolbarMouseMove);
      document.removeEventListener('mouseup', handleToolbarMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleToolbarMouseMove);
      document.removeEventListener('mouseup', handleToolbarMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isToolbarDragging, handleToolbarMouseMove, handleToolbarMouseUp]);


  
  const dropRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);



  // Tiptap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
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

  // Update editor ref
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Sync editor content
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      if (content === '' || content === '<p></p>') {
        editor.commands.clearContent(true);
      } else {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  // Enhanced drop zone detection and handling
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'enhanced-suggestion',
    drop: (item: EnhancedSuggestion, monitor) => {
      console.log('useDrop - drop called with item:', item);
      handleEnhancedSuggestionDrop(item, monitor);
    },
    hover: (item: EnhancedSuggestion, monitor) => {
      console.log('useDrop - hover called');
      handleDragHover(item, monitor);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    }),
  }));

  // Connect drop functionality to dropRef
  useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current);
    }
  }, [drop]);

  // Track recently added content for highlighting
  const [recentlyAdded, setRecentlyAdded] = useState<{
    text: string;
    timestamp: number;
    type: string;
  } | null>(null);
  
  // Track notifications for visual feedback
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
    timestamp: number;
  } | null>(null);

  // Diff preview state
  const [diffPreview, setDiffPreview] = useState<{
    originalText: string;
    newText: string;
    suggestion: EnhancedSuggestion;
    isDocumentRewrite: boolean;
    apply: () => void;
  } | null>(null);

  // Enhanced suggestion drop handler - SIMPLE MODE: Rewrite entire document with AI
  const handleEnhancedSuggestionDrop = async (suggestion: EnhancedSuggestion, monitor: any) => {
    console.log('Drop received:', suggestion.text);
    
    if (!editorRef.current) {
      console.log('No editor ref');
      return;
    }

    const editor = editorRef.current;
    
    try {
      // MODE 2: Get the entire document content
      const fullText = editor.state.doc.textContent;
      
      if (!fullText.trim()) {
        // If document is empty, generate content from suggestion
        if (aiService.hasApiKey()) {
          const generatedContent = await aiService.generateContentFromSuggestion(suggestion.text, suggestion.type);
          
          // Show diff preview
          setDiffPreview({
            originalText: "[Empty document]",
            newText: generatedContent,
            suggestion,
            isDocumentRewrite: false,
            apply: () => {
              editor.chain().focus().insertContent(generatedContent).run();
              setNotification({
                message: `Generated content from ${suggestion.type} suggestion`,
                type: 'success',
                timestamp: Date.now()
              });
              removeSuggestion(suggestion.id);
              setDiffPreview(null);
              setTimeout(() => setNotification(null), 3000);
            }
          });
        } else {
          // Fallback: insert raw suggestion
          editor.chain().focus().insertContent(suggestion.text).run();
          setNotification({
            message: 'Inserted suggestion (API key required for content generation)',
            type: 'warning',
            timestamp: Date.now()
          });
          removeSuggestion(suggestion.id);
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        // Ask AI to rewrite the entire document incorporating the suggestion
        if (aiService.hasApiKey()) {
          const rewrittenDocument = await aiService.rewriteDocumentWithSuggestion(fullText, suggestion.text);
          
          // Show diff preview for document rewrite
          setDiffPreview({
            originalText: fullText,
            newText: rewrittenDocument,
            suggestion,
            isDocumentRewrite: true,
            apply: () => {
              editor.chain().focus().clearContent().insertContent(rewrittenDocument).run();
              setNotification({
                message: `Rewrote entire document with ${suggestion.type} enhancement`,
                type: 'success',
                timestamp: Date.now()
              });
              removeSuggestion(suggestion.id);
              setDiffPreview(null);
              setTimeout(() => setNotification(null), 3000);
            }
          });
        } else {
          // Fallback: append suggestion to end
          editor.chain().focus().insertContent(` ${suggestion.text}`).run();
          
          setNotification({
            message: 'Added suggestion (API key required for full rewrite)',
            type: 'warning',
            timestamp: Date.now()
          });
          
          removeSuggestion(suggestion.id);
          setTimeout(() => setNotification(null), 3000);
        }
      }

    } catch (error) {
      console.error('Error in drop handler:', error);
      
      // Fallback: simple append
      editor.chain().focus().insertContent(` ${suggestion.text}`).run();
      
      setNotification({
        message: `Added suggestion (AI error: ${error instanceof Error ? error.message : 'Unknown error'})`,
        type: 'warning',
        timestamp: Date.now()
      });
      
      removeSuggestion(suggestion.id);
      setTimeout(() => setNotification(null), 3000);
    }

    // Reset drag state
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedSuggestion: null,
      currentDropZone: null
    }));
  };



  // Handle drag hover for visual feedback
  const handleDragHover = (suggestion: EnhancedSuggestion, monitor: any) => {
    if (!monitor.isOver()) return;

    // Simplified hover handling for now
    setDragState(prev => ({
      ...prev,
      currentDropZone: null,
      isValidDrop: true,
      hoverTime: prev.hoverTime + 50
    }));
  };



  // Handle suggestion drag start
  const handleSuggestionDragStart = (suggestion: EnhancedSuggestion) => {
    console.log('Drag started with suggestion:', suggestion.text);
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedSuggestion: suggestion,
      hoverTime: 0,
      dragDistance: 0
    }));
  };

  // Handle suggestion drag end
  const handleSuggestionDragEnd = () => {
    console.log('Drag ended');
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedSuggestion: null,
      currentDropZone: null,
      hoverTime: 0,
      dragDistance: 0,
      isValidDrop: false
    }));
    setHoveredSuggestion(null); // Clear hover state when drag ends
    setShowSolidBackground(false); // Clear solid background
  };

  // NEW: Enhanced hover handlers with intentional detection
  const handleSuggestionHover = (suggestionId: string | null) => {
    setHoveredSuggestion(suggestionId);
    
    // Clear existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    if (suggestionId) {
      // Start timer for intentional hover detection (300ms delay)
      hoverTimerRef.current = setTimeout(() => {
        setActiveHoverSuggestion(suggestionId);
        setShowSolidBackground(true);
      }, 300);
    } else {
      // Immediate clear when leaving
      setActiveHoverSuggestion(null);
      setShowSolidBackground(false);
    }
  };

  // NEW: Clear timers on component unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);



  // NEW: Load saved panel width from localStorage
  useEffect(() => {
    localStorage.setItem('immerse-right-panel-width', rightPanelWidth.toString());
  }, [rightPanelWidth]);

  // NEW: Save panel width to localStorage
  useEffect(() => {
    localStorage.setItem('immerse-right-panel-width', rightPanelWidth.toString());
  }, [rightPanelWidth]);

  // NEW: Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(rightPanelWidth);
    e.preventDefault();
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = resizeStartX - e.clientX; // Inverted because we're resizing from the left edge
    const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, resizeStartWidth + deltaX));
    setRightPanelWidth(newWidth);
  }, [isResizing, resizeStartX, resizeStartWidth, minPanelWidth, maxPanelWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // NEW: Global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

    // Handle suggestion click - SIMPLE MODE: Replace only highlighted text with AI rewrite
  const handleSuggestionClick = async (suggestion: EnhancedSuggestion) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const { from, to } = editor.state.selection;
    
    try {
      // MODE 1: If text is highlighted, replace ONLY the highlighted text
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        
        if (aiService.hasApiKey()) {
          const rewrittenText = await aiService.rewriteTextWithSuggestion(selectedText, suggestion.text);
          
          // Show diff preview
          setDiffPreview({
            originalText: selectedText,
            newText: rewrittenText,
            suggestion,
            isDocumentRewrite: false,
            apply: () => {
              editor.chain().focus().deleteRange({ from, to }).insertContent(rewrittenText).run();
              setNotification({
                message: `Replaced highlighted text with ${suggestion.type} enhancement`,
                type: 'success',
                timestamp: Date.now()
              });
              removeSuggestion(suggestion.id);
              setDiffPreview(null);
              setTimeout(() => setNotification(null), 3000);
            }
          });
        } else {
          // Fallback without preview
          const mergedText = `${selectedText} ${suggestion.text}`;
          editor.chain().focus().deleteRange({ from, to }).insertContent(mergedText).run();
          setNotification({
            message: 'Applied suggestion (API key required for AI rewrite)',
            type: 'warning',
            timestamp: Date.now()
          });
          removeSuggestion(suggestion.id);
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        // No text selected - generate content based on suggestion
        if (aiService.hasApiKey()) {
          const generatedContent = await aiService.generateContentFromSuggestion(suggestion.text, suggestion.type);
          
          // Show diff preview with empty original
          setDiffPreview({
            originalText: "[Cursor position - new content will be inserted here]",
            newText: generatedContent,
            suggestion,
            isDocumentRewrite: false,
            apply: () => {
              editor.chain().focus().insertContent(generatedContent).run();
              setNotification({
                message: `Generated and inserted ${suggestion.type} content`,
                type: 'success',
                timestamp: Date.now()
              });
              removeSuggestion(suggestion.id);
              setDiffPreview(null);
              setTimeout(() => setNotification(null), 3000);
            }
          });
        } else {
          // Fallback: just insert the raw suggestion
          editor.chain().focus().insertContent(` ${suggestion.text}`).run();
          setNotification({
            message: 'Inserted suggestion (API key required for content generation)',
            type: 'warning',
            timestamp: Date.now()
          });
          removeSuggestion(suggestion.id);
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error processing suggestion:', error);
      
      // Fallback handling
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        const mergedText = `${selectedText} ${suggestion.text}`;
        editor.chain().focus().deleteRange({ from, to }).insertContent(mergedText).run();
      } else {
        editor.chain().focus().insertContent(` ${suggestion.text}`).run();
      }
      
      setNotification({
        message: `Applied suggestion with fallback (AI error: ${error instanceof Error ? error.message : 'Unknown'})`,
        type: 'warning',
        timestamp: Date.now()
      });
      
      removeSuggestion(suggestion.id);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      if (e.key === 'Meta' || e.key === 'Control') setIsModifierPressed(true); 
    };
    const up = (e: KeyboardEvent) => { 
      if (e.key === 'Meta' || e.key === 'Control') setIsModifierPressed(false); 
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        setShowSuggestions((prev: boolean) => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setShowSuggestions]);

  // Scroll tracking
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

  // Auto-scroll suggestions
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (suggestionsRef.current) {
            suggestionsRef.current.scrollTo({
              top: suggestionsRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      });
    }
  }, [showSuggestions, enhancedSuggestions]);

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
        {/* Left Column - Split into Biometrics (30%) and Timeline (70%) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 fixed left-0 top-0 h-screen z-10">
          {/* Biometric Tracker - Top 30% */}
          <div className="h-[30%] p-4 border-b border-white/5">
            <BiometricTracker 
              onBiometricUpdate={onBiometricUpdate}
              isActive={true}
              userId="user-123"
            />
          </div>
          
          {/* Timeline River - Bottom 70% */}
          <div className="h-[70%] flex items-center justify-center text-text-quaternary text-sm px-4" style={{ writingMode: 'vertical-rl' }}>
            Timeline River – Coming Soon
          </div>
        </aside>

        {/* Main Content Area - Enhanced Drop Zone */}
        <main className="h-screen lg:ml-64 relative">
          {/* Solid Background Overlay - NEW */}
          {showSolidBackground && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-15 transition-all duration-300 ease-in-out" />
          )}

          {/* Drop zone indicator overlay */}
          {dragState.isDragging && (
            <div className="absolute inset-4 border-2 border-dashed border-blue-400/50 rounded-xl flex items-center justify-center pointer-events-none z-20">
              <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-400/30 rounded-lg px-6 py-3">
                <div className="text-blue-300 text-sm font-medium">
                  Drop here to enhance your writing
                </div>
                <div className="text-blue-200/60 text-xs mt-1">
                  {dragState.draggedSuggestion?.type} suggestion ready
                </div>
              </div>
            </div>
          )}

          {/* Full Height Writing Area */}
          <div className="h-full p-6 relative z-5" style={{ paddingRight: `${rightPanelWidth + 24}px` }}>
            <div className="h-full relative">
              <div 
                ref={dropRef}
                className={`
                  custom-editor rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl text-text-primary h-full p-6
                  transition-all duration-300
                  ${isOver && canDrop ? 'border-blue-400/50 bg-blue-500/10 shadow-blue-500/20' : ''}
                  ${dragState.isDragging ? 'border-purple-400/30 bg-purple-500/5' : ''}
                `}
              >
                <EditorContent
                  editor={editor}
                  className="prose prose-invert max-w-none focus:outline-none h-full"
                />
              </div>

              {/* Enhanced Floating Toolbar - Now relative to writing area */}
              {editor && (
                <div 
                  className={`fixed z-30 cursor-grab ${isToolbarDragging ? 'cursor-grabbing' : ''}`}
                  style={{
                    left: `${toolbarPosition.x}px`,
                    top: `${toolbarPosition.y}px`,
                    transition: isToolbarDragging ? 'none' : 'transform 0.2s ease-out',
                  }}
                  onMouseDown={handleToolbarMouseDown}
                >
                  <div className="floating-toolbar bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg">
                    <div className={`flex gap-1 p-2 ${isVerticalLayout ? 'flex-col' : 'flex-row'}`}>
                      {/* Drag handle */}
                      <div className={`flex ${isVerticalLayout ? 'justify-center py-1 border-b border-gray-600/30 mb-1' : 'items-center px-1 border-r border-gray-600/30 mr-1'}`}>
                        <div className={`bg-gray-500 rounded-full ${isVerticalLayout ? 'w-4 h-1' : 'w-1 h-4'}`}></div>
                      </div>

                      {/* Layout toggle button */}
                      <button
                        onClick={() => setIsVerticalLayout(!isVerticalLayout)}
                        className="floating-toolbar-btn text-xs"
                        title={`Switch to ${isVerticalLayout ? 'horizontal' : 'vertical'} layout`}
                      >
                        ↻
                      </button>

                      <div className={`${isVerticalLayout ? 'h-px w-6 bg-gray-600 my-1' : 'w-px h-6 bg-gray-600 mx-1'}`}></div>
                      
                      {renderToolbarBtn(<strong>B</strong>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
                      {renderToolbarBtn(<em>I</em>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
                      {renderToolbarBtn(<u>U</u>, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
                      <div className={`${isVerticalLayout ? 'h-px w-6 bg-gray-600 my-1' : 'w-px h-6 bg-gray-600 mx-1'}`}></div>
                      {renderToolbarBtn('•', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
                      {renderToolbarBtn('1.', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
                      <div className={`${isVerticalLayout ? 'h-px w-6 bg-gray-600 my-1' : 'w-px h-6 bg-gray-600 mx-1'}`}></div>
                      {renderToolbarBtn('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
                      {renderToolbarBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                      {renderToolbarBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                      {renderToolbarBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NEW: Drag Handle */}
          <div
            className={`
              fixed top-0 h-full w-1 z-40 cursor-ew-resize
              transition-all duration-200 ease-out
              ${isResizing ? 'bg-blue-400/60 w-2 shadow-lg shadow-blue-400/30' : 'bg-white/10 hover:bg-white/20 hover:w-2'}
            `}
            style={{ right: `${rightPanelWidth}px` }}
            onMouseDown={handleResizeStart}
          >
            {/* Drag handle visual indicator */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-8 rounded-l-md bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-0.5 h-4 bg-white/40 rounded-full"></div>
            </div>
            
            {/* Resize width indicator */}
            {isResizing && (
              <div className="absolute top-1/2 -translate-y-1/2 -left-16 bg-blue-500/90 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs font-medium">
                {rightPanelWidth}px
              </div>
            )}
          </div>



          {/* Enhanced Floating Suggestion Bubbles */}
          <div 
            ref={suggestionsRef}
            className={`
              fixed top-8 right-0 h-[75vh] overflow-y-auto z-30 p-6 pt-16 
              transition-all duration-500 ease-out
              ${showSuggestions ? 'transform translate-y-0' : 'transform -translate-y-full'}
              ${isResizing ? 'pointer-events-none' : ''}
            `}
            style={{
              width: `${rightPanelWidth}px`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              transform: showSuggestions ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)',
              WebkitTransform: showSuggestions ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)',
            }}
          >
            {/* API Key Status Indicator */}
            <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                  <span className="text-xs text-white/70">
                    {hasApiKey ? 'Gemini API Connected' : 'API Key Required'}
                  </span>
                </div>
                <button
                  onClick={onOpenApiKeyModal}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  {hasApiKey ? 'Change' : 'Set Key'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {error ? (
                <div className="liquid-bubble error-bubble">
                  <p className="text-red-400 text-sm p-4">{error}</p>
                </div>
              ) : isLoadingSuggestions ? (
                <div className="liquid-bubble loading-bubble">
                  <div className="p-6">
                    <p className="text-text-tertiary text-sm animate-pulse">
                      ✨ Elysara weaves visions from the quantum streams...
                    </p>
                  </div>
                </div>
              ) : enhancedSuggestions.length === 0 ? (
                <div className="liquid-bubble">
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-3">🌌</div>
                    <p className="text-text-tertiary text-sm mb-2">
                      The cosmic streams await your call...
                    </p>
                    {hasApiKey ? (
                      <p className="text-text-quaternary text-xs">
                        Press <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+J</kbd> to commune with Elysara's wisdom
                      </p>
                    ) : (
                      <p className="text-text-quaternary text-xs">
                        Press <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+K</kbd> to attune your quantum key, then <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+J</kbd> to receive ethereal guidance
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                enhancedSuggestions.map((suggestion, idx) => {
                  const isInteracted = activeHoverSuggestion === suggestion.id || dragState.draggedSuggestion?.id === suggestion.id;
                  const shouldHide = (activeHoverSuggestion || dragState.draggedSuggestion) && !isInteracted;
                  const isDragged = dragState.draggedSuggestion?.id === suggestion.id;
                  
                  return (
                    <div 
                      key={suggestion.id}
                      className={`transition-opacity duration-300 ${
                        shouldHide ? 'opacity-0 pointer-events-none' : 
                        isDragged ? 'opacity-0' : 
                        'opacity-100'
                      }`}
                    >
                      <EnhancedFloatingBubble 
                        suggestion={suggestion}
                        index={idx}
                        scrollY={scrollY}
                        onDragStart={handleSuggestionDragStart}
                        onDragEnd={handleSuggestionDragEnd}
                        onHover={(id: string | null) => handleSuggestionHover(id)}
                        isActiveDrag={dragState.draggedSuggestion?.id === suggestion.id}
                        onClick={handleSuggestionClick}
                        isSolidBackground={showSolidBackground}
                      />
                    </div>
                  );
                })
              )}
            </div>
            
                                      {/* Simple Instructions */}
            <div className={`mt-8 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-opacity duration-300 ${
              activeHoverSuggestion || dragState.draggedSuggestion ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
              <p className="text-xs text-text-quaternary text-center leading-relaxed">
                ⌨️ <strong className="text-text-secondary">Cmd/Ctrl+J</strong> to generate AI suggestions<br/>
                ✨ <strong className="text-text-secondary">Highlight text + Click bubble</strong> → Rewrite highlighted text only<br/>
                🎨 <strong className="text-text-secondary">Drag bubble to editor</strong> → Rewrite entire document<br/>
                📝 <strong className="text-text-secondary">Cmd/Ctrl+Enter / Cmd/Ctrl+P</strong> → Create logbook or dream entry<br/>
                🔑 <strong className="text-text-secondary">Cmd/Ctrl+K</strong> to set your Gemini API key<br/>
                ⌨️ <strong className="text-text-secondary">Cmd/Ctrl+I</strong> to show/hide suggestions
              </p>
            </div>
          </div>
        </main>

        {/* Success Notification */}
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
            <div className={`
              px-6 py-4 rounded-lg shadow-lg backdrop-blur-xl border
              ${notification.type === 'success' ? 'bg-green-500/20 border-green-400/30 text-green-200' : 
                notification.type === 'info' ? 'bg-blue-500/20 border-blue-400/30 text-blue-200' :
                'bg-yellow-500/20 border-yellow-400/30 text-yellow-200'}
              animate-in slide-in-from-top-2 duration-300
            `}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? '✅' : 
                   notification.type === 'info' ? 'ℹ️' : '⚠️'}
                </div>
                <div className="text-sm font-medium">
                  {notification.message}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diff Preview Modal */}
      {diffPreview && (
        <DiffPreview
          originalText={diffPreview.originalText}
          newText={diffPreview.newText}
          suggestion={diffPreview.suggestion}
          isDocumentRewrite={diffPreview.isDocumentRewrite}
          onApply={diffPreview.apply}
          onCancel={() => setDiffPreview(null)}
        />
      )}

      {/* Enhanced Styles */}
      <style jsx global>{`
        .custom-editor .ProseMirror {
          outline: none;
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          line-height: 1.7;
          height: 100%;
          overflow-y: auto;
          padding: 0;
        }

        .custom-editor {
          display: flex;
          flex-direction: column;
        }

        .custom-editor .ProseMirror::-webkit-scrollbar {
          width: 8px;
        }

        .custom-editor .ProseMirror::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .custom-editor .ProseMirror::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }

        .custom-editor .ProseMirror::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
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

        .custom-editor .ProseMirror mark {
          background-color: rgba(34, 197, 94, 0.3) !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          color: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(34, 197, 94, 0.5) !important;
          animation: highlight-fade 3s ease-out;
        }

        @keyframes highlight-fade {
          0% { 
            background-color: rgba(34, 197, 94, 0.6) !important;
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
          }
          100% { 
            background-color: rgba(34, 197, 94, 0.3) !important;
            box-shadow: none;
          }
        }

        .custom-editor .ProseMirror strong[style*="color"] {
          font-weight: bold !important;
        }

        .custom-editor .ProseMirror em[style*="color"] {
          font-style: italic !important;
        }

        .custom-editor .ProseMirror span[style*="color"] {
          font-weight: 500 !important;
        }

        .custom-editor .ProseMirror.ProseMirror-focused {
          outline: none;
        }

        /* Enhanced placeholder styling */
        .custom-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: "Start writing... AI will intelligently enhance your thoughts.";
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .custom-editor .ProseMirror:empty::before {
          content: "Start writing... AI will intelligently enhance your thoughts.";
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
        }

        /* Enhanced bubble styles remain from previous implementation */
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
          animation-name: liquid-shimmer;
          animation-duration: 4s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
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

 