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
  DropZone, 
  EditorContext,
  ContentMergeResponse,
  ContentMergeRequest,
  UserEditingPreferences
} from './types';
import { GeminiAIContentProcessor } from './services/geminiAIService';
import { EnhancedFloatingBubble } from './components/EnhancedFloatingBubble';
import { EnhancedContentPreview } from './components/EnhancedContentPreview';

// BiometricTracker import
import { BiometricTracker } from './components/BiometricTracker';

export default function ImmersePage() {
  const [content, setContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [enhancedSuggestions, setEnhancedSuggestions] = useState<EnhancedSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API Key management
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
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
        console.log('🔄 Clearing suggestions - no content');
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
      console.log('🔄 Setting new suggestions from CMD+J, count:', suggestions.length);
      setEnhancedSuggestions(suggestions);
      
      // Show suggestions panel if hidden
      setShowSuggestions(true);
      
    } catch (err) {
      console.error('Error generating CMD+J suggestions:', err);
      setError('Failed to generate suggestions');
      console.log('🔄 Clearing suggestions due to error');
      setEnhancedSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [content, isLoadingSuggestions, geminiApiKey]);

  // Function to remove a suggestion by ID
  const removeSuggestion = (suggestionId: string) => {
    console.log('🗑️ removeSuggestion called for ID:', suggestionId);
    setEnhancedSuggestions(prev => {
      console.log('📝 Before removal - suggestions count:', prev.length);
      console.log('📝 Before removal - suggestion IDs:', prev.map(s => s.id));
      const filtered = prev.filter(s => s.id !== suggestionId);
      console.log('📝 After removal - suggestions count:', filtered.length);
      console.log('📝 After removal - suggestion IDs:', filtered.map(s => s.id));
      return filtered;
    });
  };

  // Global keyboard handler
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key.toLowerCase() === 'j') {
        handleCmdJSuggestions();
        e.preventDefault();
      }
      // CMD+K to open API key modal
      if (e.metaKey && e.key.toLowerCase() === 'k') {
        setShowApiKeyModal(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleCmdJSuggestions]);

  return (
    <>
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

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
              <p className="text-xs text-yellow-200">
                <strong>Tip:</strong> Get your free API key from{' '}
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-100"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
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
  
  const [isMetaPressed, setIsMetaPressed] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [contentPreview, setContentPreview] = useState<{
    originalContent: string;
    mergeResponse: ContentMergeResponse;
    suggestion: EnhancedSuggestion;
    apply: () => void;
  } | null>(null);
  
  const dropRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // User preferences (can be made configurable later)
  const userPreferences: UserEditingPreferences = {
    writingStyle: 'detailed',
    preferredEditTypes: ['enhance', 'expand', 'connect'],
    boldnessLevel: 'moderate',
    voicePreservation: 0.8
  };

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
      console.log('📝 Editor content updated, new length:', html.length);
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

  // Enhanced suggestion drop handler - now with proper diff preview
  const handleEnhancedSuggestionDrop = async (suggestion: EnhancedSuggestion, monitor: any) => {
    console.log('Drop received:', suggestion.text);
    
    if (!editorRef.current) {
      console.log('No editor ref');
      return;
    }

    const editor = editorRef.current;
    console.log('Editor state:', editor.state.selection);

    try {
      // Detect drop zone context
      const dropZone = aiService.detectDropZone(editor, monitor.getClientOffset()?.x || 0, monitor.getClientOffset()?.y || 0);
      
      if (!dropZone) {
        console.log('Could not detect drop zone');
        fallbackSuggestionInsertion(suggestion);
        return;
      }

      // Get original content based on drop zone with enhanced context
      const { from, to } = editor.state.selection;
      const fullText = editor.state.doc.textContent;
      
      // Extract contextual text (±2 paragraphs) around the drop zone
      const contextualData = aiService.extractContextualText(fullText, { from, to });
      
      let originalContent = '';
      if (dropZone.context.selectedText) {
        // Use selected text but include surrounding context for AI processing
        originalContent = contextualData.fullContext;
      } else if (dropZone.type === 'paragraph') {
        // Use the target paragraph plus context
        originalContent = contextualData.fullContext;
      } else {
        // Default to contextual extraction
        originalContent = contextualData.fullContext || editor.state.doc.textBetween(from, to);
      }

      console.log('Original content:', originalContent);
      console.log('Drop zone:', dropZone);

      // Generate intelligent merge using AI service
      const mergeRequest: ContentMergeRequest = {
        originalText: originalContent,
        suggestion,
        dropZone,
        userPreferences
      };

      console.log('Calling AI service for merge...');
      const mergeResponse = await aiService.mergeContent(mergeRequest);
      console.log('Merge response:', mergeResponse);

      // Show content preview modal with diff
      console.log('🎭 Creating content preview modal for suggestion:', suggestion.id);
      setContentPreview({
        originalContent,
        mergeResponse,
        suggestion,
        apply: () => {
          console.log('🎯 Preview modal apply button clicked for suggestion:', suggestion.id);
          applyContentMerge(mergeResponse, dropZone);
          
          // Track the added content
          setRecentlyAdded({
            text: suggestion.text,
            type: suggestion.type,
            timestamp: Date.now()
          });

          // Show notification
          setNotification({
            message: `Applied ${suggestion.type} suggestion with ${mergeResponse.changeType.replace('_', ' ')}`,
            type: 'success',
            timestamp: Date.now()
          });

          // Clear preview and notifications
          setContentPreview(null);
          setTimeout(() => {
            setRecentlyAdded(null);
            setNotification(null);
          }, 3000);

          // Remove the applied suggestion
          console.log('🎯 About to remove suggestion via drag & drop:', suggestion.id);
          removeSuggestion(suggestion.id);
        }
      });

    } catch (error) {
      console.error('Error in drop handler:', error);
      
      // Show error notification
      setNotification({
        message: `Error processing suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'warning',
        timestamp: Date.now()
      });
      
      // Fallback to simple insertion
      fallbackSuggestionInsertion(suggestion);
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }

    // Reset drag state
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedSuggestion: null,
      currentDropZone: null
    }));
  };

  // Apply the merged content to the editor
  const applyContentMerge = (mergeResponse: ContentMergeResponse, dropZone: DropZone) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const { from, to } = editor.state.selection;

    // Apply based on the merge type
    if (dropZone.context.selectedText) {
      // Replace selected text
      editor.chain().focus().deleteRange({ from, to }).insertContent(mergeResponse.mergedText).run();
    } else if (dropZone.type === 'paragraph') {
      // Replace entire paragraph
      const paragraphStart = aiService.findParagraphStart?.(editor.state.doc, from) || from;
      const paragraphEnd = aiService.findParagraphEnd?.(editor.state.doc, from) || to;
      editor.chain().focus().deleteRange({ from: paragraphStart, to: paragraphEnd }).insertContent(mergeResponse.mergedText).run();
    } else {
      // Insert at cursor position
      editor.chain().focus().insertContent(mergeResponse.mergedText).run();
    }
  };

  // Fallback for simple suggestion insertion
  const fallbackSuggestionInsertion = (suggestion: EnhancedSuggestion) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const { from, to } = editor.state.selection;
    const isSelection = from !== to;
    
    if (isSelection) {
      const selectedText = editor.state.doc.textBetween(from, to);
      const mergedText = `${selectedText} ${suggestion.text}`;
      editor.chain().focus().deleteRange({ from, to }).insertContent(mergedText).run();
    } else {
      editor.chain().focus().insertContent(` ${suggestion.text}`).run();
    }
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
  };

  // Handle suggestion click (direct application with block rewrite)
  const handleSuggestionClick = async (suggestion: EnhancedSuggestion) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    
    try {
      // Get current cursor position and document content
      const { from, to } = editor.state.selection;
      const fullText = editor.state.doc.textContent;

      // Extract context around cursor position (±2 paragraphs)
      const contextualData = aiService.extractContextualText(fullText, { from, to });
      
      console.log('Extracted context for click:', contextualData);

      // Calculate line and char position for the cursor
      const textBeforeCursor = fullText.slice(0, from);
      const lines = textBeforeCursor.split('\n');
      const line = lines.length;
      const char = lines[lines.length - 1].length;

      // Create a simplified drop zone for click application
      const dropZone: DropZone = {
        type: 'paragraph',
        position: { line, char },
        context: {
          beforeText: contextualData.beforeContext,
          selectedText: from !== to ? editor.state.doc.textBetween(from, to) : '',
          afterText: contextualData.afterContext,
          paragraphText: contextualData.targetText
        },
        suggestedAction: 'merge'
      };

      // Generate intelligent merge using AI service
      const mergeRequest: ContentMergeRequest = {
        originalText: contextualData.fullContext,
        suggestion,
        dropZone,
        userPreferences: {
          writingStyle: 'conversational',
          preferredEditTypes: [suggestion.type],
          boldnessLevel: 'moderate',
          voicePreservation: 0.8
        }
      };

      console.log('Calling AI service for block rewrite...');
      const mergeResponse = await aiService.mergeContent(mergeRequest);
      console.log('Block rewrite response:', mergeResponse);

      // Apply the rewritten content
      // Find the paragraph boundaries for the target paragraph
      const paragraphs = fullText.split(/\n\s*\n/);
      let currentPos = 0;
      let targetParagraphIndex = -1;

      // Find which paragraph contains our cursor
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraphEnd = currentPos + paragraphs[i].length;
        if (from >= currentPos && from <= paragraphEnd) {
          targetParagraphIndex = i;
          break;
        }
        currentPos = paragraphEnd + 2; // +2 for \n\n
      }

      if (targetParagraphIndex === -1) targetParagraphIndex = 0;

      // Calculate the actual document positions for the context block (±2 paragraphs)
      const startIndex = Math.max(0, targetParagraphIndex - 2);
      const endIndex = Math.min(paragraphs.length - 1, targetParagraphIndex + 2);
      
      // Calculate document positions
      let blockStart = 0;
      for (let i = 0; i < startIndex; i++) {
        blockStart += paragraphs[i].length + 2; // +2 for \n\n
      }
      
      let blockEnd = blockStart;
      for (let i = startIndex; i <= endIndex; i++) {
        blockEnd += paragraphs[i].length;
        if (i < endIndex) blockEnd += 2; // +2 for \n\n
      }

      // Replace the entire context block with the rewritten version
      editor.chain()
        .focus()
        .deleteRange({ from: blockStart, to: blockEnd })
        .insertContent(mergeResponse.mergedText)
        .run();

      // Show notification
      setNotification({
        message: `Applied ${suggestion.type} suggestion with block rewrite`,
        type: 'success',
        timestamp: Date.now()
      });

      // Remove only this applied suggestion
      console.log('🎯 About to remove suggestion via click:', suggestion.id);
      removeSuggestion(suggestion.id);

      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);

    } catch (error) {
      console.error('Error applying block rewrite:', error);
      
      // Fallback to simple insertion if AI service fails
      const { from, to } = editor.state.selection;
      const isSelection = from !== to;
      
      if (isSelection) {
        const selectedText = editor.state.doc.textBetween(from, to);
        const mergedText = `${selectedText} ${suggestion.text}`;
        editor.chain().focus().deleteRange({ from, to }).insertContent(mergedText).run();
      } else {
        editor.chain().focus().insertContent(` ${suggestion.text}`).run();
      }

      setNotification({
        message: 'Applied suggestion with simple insertion (AI service unavailable)',
        type: 'warning',
        timestamp: Date.now()
      });
      
      // Still remove the suggestion even if fallback was used
      console.log('🎯 About to remove suggestion via click fallback:', suggestion.id);
      removeSuggestion(suggestion.id);
      
             setTimeout(() => {
         setNotification(null);
       }, 3000);
     }
  };

  // Keyboard handlers
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
          <div className="h-full p-6 pr-84 relative z-5">
            <div className="h-full">
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
            </div>
          </div>

          {/* Enhanced Floating Toolbar */}
          {editor && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[75%] -translate-y-1/2 z-30">
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

          {/* Enhanced Floating Suggestion Bubbles */}
          <div 
            ref={suggestionsRef}
            className={`
              fixed top-8 right-0 w-80 h-[75vh] overflow-y-auto z-30 p-6 pt-16 
              transition-transform duration-500 ease-out
              ${showSuggestions ? 'transform translate-y-0' : 'transform -translate-y-full'}
            `}
            style={{
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
                      🧠 Generating intelligent suggestions...
                    </p>
                  </div>
                </div>
              ) : enhancedSuggestions.length === 0 ? (
                <div className="liquid-bubble">
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-3">💡</div>
                    <p className="text-text-tertiary text-sm mb-2">
                      No suggestions available
                    </p>
                    {hasApiKey ? (
                      <p className="text-text-quaternary text-xs">
                        Press <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+J</kbd> to generate AI suggestions
                      </p>
                    ) : (
                      <p className="text-text-quaternary text-xs">
                        Press <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+K</kbd> to set API key, then <kbd className="px-2 py-1 text-xs bg-white/10 rounded">Cmd+J</kbd> for suggestions
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                enhancedSuggestions.map((suggestion, idx) => {
                  const isInteracted = hoveredSuggestion === suggestion.id || dragState.draggedSuggestion?.id === suggestion.id;
                  const shouldHide = (hoveredSuggestion || dragState.draggedSuggestion) && !isInteracted;
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
                        onHover={(id: string | null) => setHoveredSuggestion(id)}
                        isActiveDrag={dragState.draggedSuggestion?.id === suggestion.id}
                        onClick={handleSuggestionClick}
                      />
                    </div>
                  );
                })
              )}
            </div>
            
                          {/* Enhanced Instructions */}
              <div className={`mt-8 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-opacity duration-300 ${
                hoveredSuggestion || dragState.draggedSuggestion ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
                <p className="text-xs text-text-quaternary text-center leading-relaxed">
                  ⌨️ <strong className="text-text-secondary">Cmd+J</strong> to generate suggestions<br/>
                  ✨ <strong className="text-text-secondary">Click bubbles</strong> for smart block rewrite (±2 paragraphs)<br/>
                  🎨 <strong className="text-text-secondary">Drag bubbles to the editor</strong> for preview & fine control<br/>
                  📝 <strong className="text-text-secondary">Position cursor</strong> where you want improvements<br/>
                  🔑 <strong className="text-text-secondary">Cmd+K</strong> to set Gemini API key<br/>
                  💡 <strong className="text-text-secondary">Applied suggestions disappear</strong> automatically<br/>
                  ⌨️ <strong className="text-text-secondary">Cmd+I</strong> to toggle suggestions panel
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

      {/* Enhanced Content Preview Modal */}
      {contentPreview && (
        <EnhancedContentPreview
          originalContent={contentPreview.originalContent}
          mergeResponse={contentPreview.mergeResponse}
          suggestion={contentPreview.suggestion}
          onApply={contentPreview.apply}
          onCancel={() => setContentPreview(null)}
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

 