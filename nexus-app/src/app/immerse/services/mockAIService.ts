import { 
  EnhancedSuggestion, 
  ContentMergeRequest, 
  ContentMergeResponse, 
  DropZone, 
  EditorContext,
  UserEditingPreferences 
} from '../types';

// Mock enhanced suggestions with proper AI-like intelligence
export const MOCK_ENHANCED_SUGGESTIONS: EnhancedSuggestion[] = [
  {
    id: 'sug-1',
    text: 'This concept connects to recent developments in cognitive neuroscience, particularly the work on neural plasticity.',
    type: 'connect',
    confidence: 0.85,
    emotionalTone: 'analytical',
    contextRelevance: 0.92,
    suggestedAction: 'weave',
    metadata: {
      wordCount: 15,
      complexity: 'moderate',
      focusAreas: ['neuroscience', 'connections', 'research'],
      expectedImpact: 'Adds scholarly depth and scientific backing'
    }
  },
  {
    id: 'sug-2',
    text: 'Consider a personal example: how do you notice these patterns in your own daily thinking?',
    type: 'example',
    confidence: 0.78,
    emotionalTone: 'empathetic',
    contextRelevance: 0.88,
    suggestedAction: 'insert_after',
    metadata: {
      wordCount: 12,
      complexity: 'simple',
      focusAreas: ['personal reflection', 'relatability', 'introspection'],
      expectedImpact: 'Makes abstract concepts more relatable'
    }
  },
  {
    id: 'sug-3',
    text: 'However, critics argue that this perspective may oversimplify the complex interplay between consciousness and external factors.',
    type: 'counter',
    confidence: 0.72,
    emotionalTone: 'analytical',
    contextRelevance: 0.85,
    suggestedAction: 'insert_after',
    metadata: {
      wordCount: 17,
      complexity: 'complex',
      focusAreas: ['critical thinking', 'balance', 'counterarguments'],
      expectedImpact: 'Provides balanced perspective and critical depth'
    }
  },
  {
    id: 'sug-4',
    text: 'What emerges from this analysis is a more nuanced understanding of how these processes interconnect.',
    type: 'enhance',
    confidence: 0.91,
    emotionalTone: 'analytical',
    contextRelevance: 0.94,
    suggestedAction: 'merge',
    metadata: {
      wordCount: 14,
      complexity: 'moderate',
      focusAreas: ['synthesis', 'insight', 'conclusion'],
      expectedImpact: 'Strengthens analytical flow and conclusions'
    }
  },
  {
    id: 'sug-5',
    text: 'This idea branches into fascinating territory when we consider its implications for creativity and innovation.',
    type: 'expand',
    confidence: 0.82,
    emotionalTone: 'creative',
    contextRelevance: 0.79,
    suggestedAction: 'insert_after',
    metadata: {
      wordCount: 15,
      complexity: 'moderate',
      focusAreas: ['creativity', 'innovation', 'implications'],
      expectedImpact: 'Opens new avenues for exploration'
    }
  },
  {
    id: 'sug-6',
    text: 'To clarify: this process involves multiple layers of cognitive processing working in parallel.',
    type: 'clarify',
    confidence: 0.89,
    emotionalTone: 'neutral',
    contextRelevance: 0.93,
    suggestedAction: 'merge',
    metadata: {
      wordCount: 12,
      complexity: 'moderate',
      focusAreas: ['clarity', 'explanation', 'precision'],
      expectedImpact: 'Improves clarity and understanding'
    }
  }
];

export class MockAIContentProcessor {
  private userPreferences: UserEditingPreferences = {
    writingStyle: 'detailed',
    preferredEditTypes: ['enhance', 'expand', 'connect'],
    boldnessLevel: 'moderate',
    voicePreservation: 0.8
  };

  /**
   * Simulates intelligent content merging based on context and suggestion type
   */
  async mergeContent(request: ContentMergeRequest): Promise<ContentMergeResponse> {
    const { originalText, suggestion, dropZone, userPreferences } = request;
    
    // Simulate processing delay for realism
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Different merging strategies based on suggestion type and drop zone
    let mergedText: string;
    let changeType: ContentMergeResponse['changeType'];
    let preservedElements: string[] = [];
    let addedElements: string[] = [];
    let explanation: string;

    switch (suggestion.suggestedAction) {
      case 'merge':
        mergedText = this.intelligentMerge(originalText, suggestion, dropZone);
        changeType = 'significant_enhancement';
        preservedElements = ['original tone', 'core argument', 'writing style'];
        addedElements = ['enhanced clarity', 'additional depth'];
        explanation = `Seamlessly integrated the suggestion to enhance the original thought while preserving your voice.`;
        break;

      case 'weave':
        mergedText = this.intelligentWeave(originalText, suggestion, dropZone);
        changeType = 'significant_enhancement';
        preservedElements = ['original structure', 'key concepts', 'narrative flow'];
        addedElements = ['connecting threads', 'deeper context'];
        explanation = `Wove the suggestion throughout the text to create richer connections.`;
        break;

      case 'insert_before':
        mergedText = `${suggestion.text} ${originalText}`;
        changeType = 'minor_edit';
        preservedElements = ['original text', 'meaning', 'structure'];
        addedElements = ['introductory context'];
        explanation = `Added contextual introduction before your original thought.`;
        break;

      case 'insert_after':
        mergedText = `${originalText} ${suggestion.text}`;
        changeType = 'minor_edit';
        preservedElements = ['original text', 'initial argument'];
        addedElements = ['extension', 'elaboration'];
        explanation = `Extended your thought with additional insight.`;
        break;

      case 'replace':
        mergedText = this.intelligentReplace(originalText, suggestion, dropZone);
        changeType = 'structural_change';
        preservedElements = ['core intent', 'style markers'];
        addedElements = ['refined expression', 'improved clarity'];
        explanation = `Refined the expression while maintaining your original intent.`;
        break;

      default:
        mergedText = `${originalText} ${suggestion.text}`;
        changeType = 'minor_edit';
        preservedElements = ['original text'];
        addedElements = ['suggestion content'];
        explanation = `Simple addition of suggested content.`;
    }

    return {
      mergedText,
      changeType,
      preservedElements,
      addedElements,
      explanation,
      confidence: suggestion.confidence * 0.9 // Slightly lower confidence for merged content
    };
  }

  /**
   * Generates contextual suggestions based on editor state
   */
  async generateSuggestions(context: EditorContext): Promise<EnhancedSuggestion[]> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Filter and customize suggestions based on context
    const relevantSuggestions = MOCK_ENHANCED_SUGGESTIONS
      .filter(suggestion => this.isRelevantToContext(suggestion, context))
      .map(suggestion => this.customizeForContext(suggestion, context))
      .sort((a, b) => b.contextRelevance - a.contextRelevance)
      .slice(0, 4);

    return relevantSuggestions;
  }

  private intelligentMerge(original: string, suggestion: EnhancedSuggestion, dropZone: DropZone): string {
    // Smart merging based on suggestion type
    switch (suggestion.type) {
      case 'enhance':
        return this.enhanceText(original, suggestion.text);
      case 'clarify':
        return this.clarifyText(original, suggestion.text);
      case 'connect':
        return this.connectText(original, suggestion.text);
      default:
        return `${original} ${suggestion.text}`;
    }
  }

  private intelligentWeave(original: string, suggestion: EnhancedSuggestion, dropZone: DropZone): string {
    // Find natural insertion points in the text
    const sentences = original.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length <= 1) {
      return `${original} ${suggestion.text}`;
    }

    // Insert at 2/3 point for natural flow
    const insertPoint = Math.floor(sentences.length * 0.66);
    const beforeSentences = sentences.slice(0, insertPoint);
    const afterSentences = sentences.slice(insertPoint);

    return `${beforeSentences.join('. ')}.${beforeSentences.length > 0 ? ' ' : ''}${suggestion.text} ${afterSentences.join('. ')}${afterSentences.length > 0 ? '.' : ''}`;
  }

  private intelligentReplace(original: string, suggestion: EnhancedSuggestion, dropZone: DropZone): string {
    // Replace selected text intelligently
    if (dropZone.context.selectedText.trim()) {
      return original.replace(dropZone.context.selectedText, suggestion.text);
    }
    return suggestion.text;
  }

  private enhanceText(original: string, enhancement: string): string {
    // Add enhancement while maintaining flow
    const lastChar = original.trim().slice(-1);
    const needsPunctuation = !['.', '!', '?', ';', ':'].includes(lastChar);
    const connector = needsPunctuation ? ', ' : ' ';
    return `${original}${connector}${enhancement}`;
  }

  private clarifyText(original: string, clarification: string): string {
    // Insert clarification naturally
    return `${original} ${clarification}`;
  }

  private connectText(original: string, connection: string): string {
    // Add connection with appropriate transition
    return `${original} ${connection}`;
  }

  private isRelevantToContext(suggestion: EnhancedSuggestion, context: EditorContext): boolean {
    // Mock relevance calculation based on content
    const wordCount = context.currentParagraph.split(' ').length;
    
    if (wordCount < 10 && suggestion.type === 'expand') return true;
    if (wordCount > 50 && suggestion.type === 'clarify') return true;
    if (context.currentParagraph.includes('think') && suggestion.type === 'connect') return true;
    
    return Math.random() > 0.3; // Mock some randomness
  }

  private customizeForContext(suggestion: EnhancedSuggestion, context: EditorContext): EnhancedSuggestion {
    // Adjust relevance based on context
    let contextRelevance = suggestion.contextRelevance;
    
    if (context.currentParagraph.toLowerCase().includes('research') && suggestion.type === 'connect') {
      contextRelevance += 0.1;
    }
    
    if (context.documentStats.wordCount < 100 && suggestion.type === 'expand') {
      contextRelevance += 0.15;
    }

    return {
      ...suggestion,
      contextRelevance: Math.min(1, contextRelevance),
      originalTrigger: context.currentParagraph.split(' ').slice(-3).join(' ')
    };
  }

  /**
   * Detects drop zone from editor state
   */
  detectDropZone(editor: any, clientX: number, clientY: number): DropZone | null {
    if (!editor) return null;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const currentNode = editor.state.doc.nodeAt(from);
    
    // Get surrounding context
    const beforeText = editor.state.doc.textBetween(Math.max(0, from - 100), from);
    const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 100));
    const paragraphStart = this.findParagraphStart(editor.state.doc, from);
    const paragraphEnd = this.findParagraphEnd(editor.state.doc, from);
    const paragraphText = editor.state.doc.textBetween(paragraphStart, paragraphEnd);

    // Determine drop zone type
    let type: DropZone['type'] = 'paragraph';
    if (selectedText.length > 0 && selectedText.split(' ').length <= 3) {
      type = 'word';
    } else if (selectedText.length > 0 && selectedText.includes('.')) {
      type = 'sentence';
    } else if (from === to && this.isAtParagraphBoundary(editor.state.doc, from)) {
      type = 'between_paragraphs';
    }

    // Determine suggested action based on context
    let suggestedAction: DropZone['suggestedAction'] = 'insert';
    if (selectedText.length > 0) {
      suggestedAction = 'replace';
    } else if (type === 'paragraph' && paragraphText.length > 50) {
      suggestedAction = 'weave';
    } else {
      suggestedAction = 'merge';
    }

    return {
      type,
      position: {
        line: this.getLineNumber(editor.state.doc, from),
        char: this.getCharPosition(editor.state.doc, from)
      },
      context: {
        beforeText,
        selectedText,
        afterText,
        paragraphText
      },
      suggestedAction
    };
  }

  public findParagraphStart(doc: any, pos: number): number {
    let currentPos = pos;
    while (currentPos > 0) {
      const char = doc.textBetween(currentPos - 1, currentPos);
      if (char === '\n' || char === '\r') break;
      currentPos--;
    }
    return currentPos;
  }

  public findParagraphEnd(doc: any, pos: number): number {
    let currentPos = pos;
    while (currentPos < doc.content.size) {
      const char = doc.textBetween(currentPos, currentPos + 1);
      if (char === '\n' || char === '\r') break;
      currentPos++;
    }
    return currentPos;
  }

  private isAtParagraphBoundary(doc: any, pos: number): boolean {
    if (pos === 0 || pos === doc.content.size) return true;
    const before = doc.textBetween(pos - 1, pos);
    const after = doc.textBetween(pos, pos + 1);
    return before === '\n' || after === '\n';
  }

  private getLineNumber(doc: any, pos: number): number {
    const textBefore = doc.textBetween(0, pos);
    return textBefore.split('\n').length;
  }

  private getCharPosition(doc: any, pos: number): number {
    const textBefore = doc.textBetween(0, pos);
    const lines = textBefore.split('\n');
    return lines[lines.length - 1].length;
  }
} 