import { 
  EnhancedSuggestion, 
  ContentMergeRequest, 
  ContentMergeResponse, 
  DropZone, 
  EditorContext,
  UserEditingPreferences 
} from '../types';

export class GeminiAIContentProcessor {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  constructor() {
    // Note: API key is handled server-side in the API routes
    this.apiKey = 'handled-server-side';
  }

  /**
   * Generate contextual suggestions based on editor state
   */
  async generateSuggestions(context: EditorContext): Promise<EnhancedSuggestion[]> {
    try {
      // Use the specialized full-text endpoint for better suggestions
      const response = await fetch('/api/suggestions/full-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: context.previousContext + context.currentParagraph
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        return data.suggestions.map((s: any, index: number) => ({
          id: `gemini-${Date.now()}-${index}`,
          text: s.text,
          type: s.type || 'enhance',
          confidence: s.confidence || 0.8,
          emotionalTone: 'analytical',
          contextRelevance: s.confidence || 0.8,
          suggestedAction: s.action || 'merge',
          metadata: {
            wordCount: s.text.split(' ').length,
            complexity: s.text.length > 100 ? 'complex' : 'moderate',
            focusAreas: [s.type || 'general'],
            expectedImpact: `AI-generated ${s.type || 'enhancement'} suggestion`
          }
        }));
      }
      
      return this.getFallbackSuggestions();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Generate contextual rewrite for drag-and-drop
   */
  async mergeContent(request: ContentMergeRequest): Promise<ContentMergeResponse> {
    try {
      // Use the specialized contextual endpoint for better merging
      const response = await fetch('/api/suggestions/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: request.originalText,
          suggestion: request.suggestion,
          contextType: request.dropZone.type,
          targetAction: request.suggestion.suggestedAction
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      
      if (data.mergedText) {
        return {
          mergedText: data.mergedText,
          changeType: data.changeType || 'minor_edit',
          preservedElements: data.preservedElements || ['original tone'],
          addedElements: data.addedElements || ['AI enhancement'],
          explanation: data.explanation || 'AI-enhanced text integration',
          confidence: data.confidence || 0.8
        };
      }
      
      return this.getFallbackMerge(request);
    } catch (error) {
      console.error('Error merging content:', error);
      return this.getFallbackMerge(request);
    }
  }

  /**
   * Extract context around a text position (±2 paragraphs)
   */
  extractContextualText(fullText: string, targetPosition: { from: number; to: number }): {
    beforeContext: string;
    targetText: string;
    afterContext: string;
    fullContext: string;
  } {
    const paragraphs = fullText.split(/\n\s*\n/);
    let currentPos = 0;
    let targetParagraphIndex = -1;

    // Find which paragraph contains our target
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphEnd = currentPos + paragraphs[i].length;
      if (targetPosition.from >= currentPos && targetPosition.from <= paragraphEnd) {
        targetParagraphIndex = i;
        break;
      }
      currentPos = paragraphEnd + 2; // +2 for \n\n
    }

    if (targetParagraphIndex === -1) targetParagraphIndex = 0;

    // Get ±2 paragraphs around target
    const startIndex = Math.max(0, targetParagraphIndex - 2);
    const endIndex = Math.min(paragraphs.length - 1, targetParagraphIndex + 2);

    const beforeContext = paragraphs.slice(startIndex, targetParagraphIndex).join('\n\n');
    const targetText = paragraphs[targetParagraphIndex] || '';
    const afterContext = paragraphs.slice(targetParagraphIndex + 1, endIndex + 1).join('\n\n');
    const fullContext = paragraphs.slice(startIndex, endIndex + 1).join('\n\n');

    return { beforeContext, targetText, afterContext, fullContext };
  }

  private buildSuggestionPrompt(context: EditorContext): string {
    const fullText = context.previousContext + context.currentParagraph;
    
    return `You are an AI writing assistant for reflective journaling. Analyze the following journal entry and provide exactly 4 specific, actionable suggestions.

Current journal entry:
${fullText.substring(0, 3000)}

Create suggestions that are:
1. Specific and actionable (not vague)
2. Diverse in type (expand, clarify, connect, example)
3. Contextually relevant to the content
4. Written as complete, ready-to-use text snippets

Return as JSON array with this exact format:
[
  {
    "text": "specific suggestion text here",
    "type": "enhance|expand|clarify|connect|counter|example",
    "confidence": 0.85,
    "action": "merge|replace|insert_before|insert_after|weave"
  }
]`;
  }

  private buildMergePrompt(request: ContentMergeRequest): string {
    const { originalText, suggestion, dropZone } = request;
    
    return `You are rewriting text for a journal entry. Your task is to intelligently integrate a suggestion into existing text while preserving the author's voice and style.

Original text:
"${originalText}"

Suggestion to integrate:
"${suggestion.text}"

Integration mode: ${suggestion.suggestedAction}
Drop zone type: ${dropZone.type}

Rules:
1. Preserve the author's original tone and style
2. Make the integration feel natural and seamless
3. Don't repeat information unnecessarily
4. Maintain logical flow and coherence

Return the rewritten text that combines both elements naturally:`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private parseSuggestionsResponse(response: string): EnhancedSuggestion[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.map((s: any, index: number) => ({
          id: `gemini-${Date.now()}-${index}`,
          text: s.text,
          type: s.type || 'enhance',
          confidence: s.confidence || 0.8,
          emotionalTone: 'analytical',
          contextRelevance: s.confidence || 0.8,
          suggestedAction: s.action || 'merge',
          metadata: {
            wordCount: s.text.split(' ').length,
            complexity: s.text.length > 100 ? 'complex' : 'moderate',
            focusAreas: [s.type || 'general'],
            expectedImpact: `AI-generated ${s.type || 'enhancement'} suggestion`
          }
        }));
      }
    } catch (error) {
      console.warn('Failed to parse JSON suggestions, using fallback parsing');
    }

    // Fallback: parse line by line
    const lines = response.split('\n').filter(line => line.trim());
    return lines.slice(0, 4).map((line, index) => ({
      id: `gemini-fallback-${Date.now()}-${index}`,
      text: line.replace(/^\d+\.?\s*/, '').trim(),
      type: this.inferSuggestionType(line),
      confidence: 0.75,
      emotionalTone: 'analytical',
      contextRelevance: 0.75,
      suggestedAction: 'merge',
      metadata: {
        wordCount: line.split(' ').length,
        complexity: 'moderate',
        focusAreas: ['general'],
        expectedImpact: 'AI-generated suggestion'
      }
    }));
  }

  private parseMergeResponse(response: string, request: ContentMergeRequest): ContentMergeResponse {
    const mergedText = response.trim();
    
    return {
      mergedText,
      changeType: 'minor_edit',
      preservedElements: ['original tone', 'core meaning'],
      addedElements: ['AI enhancement'],
      explanation: `Integrated "${request.suggestion.text}" into the original text using ${request.suggestion.suggestedAction} approach.`,
      confidence: 0.8
    };
  }

  private inferSuggestionType(text: string): EnhancedSuggestion['type'] {
    const lower = text.toLowerCase();
    if (lower.includes('example') || lower.includes('instance')) return 'example';
    if (lower.includes('expand') || lower.includes('elaborate')) return 'expand';
    if (lower.includes('clarify') || lower.includes('explain')) return 'clarify';
    if (lower.includes('connect') || lower.includes('relate')) return 'connect';
    if (lower.includes('however') || lower.includes('but')) return 'counter';
    return 'enhance';
  }

  private getFallbackSuggestions(): EnhancedSuggestion[] {
    return [
      {
        id: 'fallback-1',
        text: 'Consider adding a specific example to illustrate this point.',
        type: 'example',
        confidence: 0.6,
        emotionalTone: 'neutral',
        contextRelevance: 0.6,
        suggestedAction: 'insert_after',
        metadata: {
          wordCount: 9,
          complexity: 'simple',
          focusAreas: ['examples'],
          expectedImpact: 'Adds concrete detail'
        }
      }
    ];
  }

  private getFallbackMerge(request: ContentMergeRequest): ContentMergeResponse {
    return {
      mergedText: `${request.originalText} ${request.suggestion.text}`,
      changeType: 'minor_edit',
      preservedElements: ['original text'],
      addedElements: ['suggestion'],
      explanation: 'Simple merge (fallback mode)',
      confidence: 0.5
    };
  }

  /**
   * Detect drop zone from editor state (simplified version)
   */
  detectDropZone(editor: any, clientX: number, clientY: number): DropZone | null {
    if (!editor) return null;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    
    // Get surrounding context
    const beforeText = editor.state.doc.textBetween(Math.max(0, from - 100), from);
    const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 100));
    
    // Simple paragraph detection
    const paragraphStart = this.findParagraphStart(editor.state.doc, from);
    const paragraphEnd = this.findParagraphEnd(editor.state.doc, from);
    const paragraphText = editor.state.doc.textBetween(paragraphStart, paragraphEnd);

    return {
      type: selectedText.length > 0 ? 'sentence' : 'paragraph',
      position: { line: 1, char: from },
      context: {
        beforeText,
        selectedText,
        afterText,
        paragraphText
      },
      suggestedAction: selectedText.length > 0 ? 'replace' : 'merge'
    };
  }

  findParagraphStart(doc: any, pos: number): number {
    // Simple implementation - can be enhanced
    const text = doc.textBetween(0, pos);
    const lastNewline = text.lastIndexOf('\n');
    return lastNewline === -1 ? 0 : lastNewline + 1;
  }

  findParagraphEnd(doc: any, pos: number): number {
    // Simple implementation - can be enhanced
    const text = doc.textBetween(pos, doc.content.size);
    const nextNewline = text.indexOf('\n');
    return nextNewline === -1 ? doc.content.size : pos + nextNewline;
  }
} 