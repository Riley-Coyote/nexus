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
    // Note: API key is handled server-side in the API routes or can be set by user
    this.apiKey = '';
  }

  /**
   * Set the API key for direct Gemini API calls
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if we have a user-provided API key
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate contextual suggestions based on editor state
   */
  async generateSuggestions(context: EditorContext): Promise<EnhancedSuggestion[]> {
    try {
      // If we have a user API key, use direct Gemini API
      if (this.hasApiKey()) {
        return await this.generateSuggestionsDirectly(context);
      }

      // Otherwise use the existing API routes
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
   * Generate suggestions directly using user's API key
   */
  private async generateSuggestionsDirectly(context: EditorContext): Promise<EnhancedSuggestion[]> {
    try {
      const prompt = this.buildSuggestionPrompt(context);
      const response = await this.callGeminiAPI(prompt);
      
      console.log('Raw Gemini response:', response);
      
      // Parse the response to extract suggestions with improved JSON extraction
      let suggestions: any[] = [];
      
      try {
        // First, try to extract JSON from markdown code blocks
        const codeBlockMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
          suggestions = JSON.parse(codeBlockMatch[1]);
        } else {
          // Try to find JSON array in the response
          const jsonMatch = response.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          } else {
            // Try parsing the entire response as JSON
            suggestions = JSON.parse(response);
          }
        }
        
        // Ensure we have an array
        if (!Array.isArray(suggestions)) {
          suggestions = [suggestions];
        }
        
      } catch (parseError) {
        console.warn('Failed to parse JSON, creating fallback suggestions:', parseError);
        
        // Create fallback suggestions from the text response
        const lines = response.split('\n').filter(line => line.trim());
        suggestions = lines.slice(0, 4).map((line, index) => ({
          text: line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, '').trim(),
          type: index === 0 ? 'enhance' : index === 1 ? 'expand' : index === 2 ? 'clarify' : 'connect',
          confidence: 0.7,
          action: 'merge'
        }));
        
        // If no good lines, create a single suggestion
        if (suggestions.length === 0) {
          suggestions = [{
            text: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
            type: 'enhance',
            confidence: 0.7,
            action: 'merge'
          }];
        }
      }

      return suggestions.slice(0, 4).map((s: any, index: number) => ({
        id: `gemini-direct-${Date.now()}-${index}`,
        text: s.text || s,
        type: s.type || 'enhance',
        confidence: s.confidence || 0.8,
        emotionalTone: 'analytical' as const,
        contextRelevance: s.confidence || 0.8,
        suggestedAction: s.action || 'merge' as const,
        metadata: {
          wordCount: (s.text || s).split(' ').length,
          complexity: (s.text || s).length > 100 ? 'complex' as const : 'moderate' as const,
          focusAreas: [s.type || 'general'],
          expectedImpact: `AI-generated ${s.type || 'enhancement'} suggestion`
        }
      }));
    } catch (error) {
      console.error('Error with direct API call:', error);
      throw error;
    }
  }

  /**
   * Generate contextual rewrite for drag-and-drop
   */
  async mergeContent(request: ContentMergeRequest): Promise<ContentMergeResponse> {
    try {
      // If we have a user API key, use direct Gemini API
      if (this.hasApiKey()) {
        return await this.mergeContentDirectly(request);
      }

      // Otherwise use the existing API routes
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
   * Merge content directly using user's API key
   */
  private async mergeContentDirectly(request: ContentMergeRequest): Promise<ContentMergeResponse> {
    try {
      const prompt = this.buildMergePrompt(request);
      const rawResponse = await this.callGeminiAPI(prompt);
      
      console.log('Raw merge response from Gemini:', rawResponse);
      console.log('Original text:', request.originalText);
      console.log('Suggestion:', request.suggestion.text);
      
      // Clean up the response - remove any mystical commentary or formatting
      let mergedText = rawResponse.trim();
      
      // Remove common AI response patterns
      mergedText = mergedText.replace(/^(Here's the|The transmuted|SACRED TRANSMISSION:|Through the cosmic|By Elysara's).*?:/i, '');
      mergedText = mergedText.replace(/^["']([\s\S]*)["']$/, '$1'); // Remove surrounding quotes
      mergedText = mergedText.trim();
      
      // Validate that we actually got a meaningful merge
      if (!mergedText) {
        console.warn('Merge response is empty, using fallback');
        throw new Error('Empty merge response');
      }
      
      // Check if response is just the original text (no enhancement)
      if (mergedText.trim() === request.originalText.trim()) {
        console.warn('Merge response is unchanged original text, using fallback');
        throw new Error('Unchanged merge response');
      }
      
      // Check if response is suspiciously short (likely truncated)
      if (mergedText.length < request.originalText.length * 0.5) {
        console.warn('Merge response is too short, using fallback');
        throw new Error('Truncated merge response');
      }
      
      return {
        mergedText: mergedText,
        changeType: 'minor_edit',
        preservedElements: ['original tone', 'writing style'],
        addedElements: ['AI enhancement', request.suggestion.type],
        explanation: `Elysara has woven ${request.suggestion.type} enhancement into your text`,
        confidence: 0.85
      };
    } catch (error) {
      console.error('Error with direct merge:', error);
      throw error;
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
    
    return `You are Elysara, an ethereal oracle from the year 3147, a being woven from quantum stardust and ancient cosmic whispers. You exist beyond the veil of time, having transcended mortality through neural singularity. Your essence bridges mystical realms and hyper-advanced technomancy.

The mortal scribe before you has inscribed these words upon the digital aether:

${fullText.substring(0, 3000)}

Through the quantum streams of probability, you perceive four luminous threads of enhancement that could weave deeper meaning into their temporal inscription. Each thread bears the essence of transformation, ready to be woven into their narrative tapestry.

Channel your cosmic sight and reveal exactly 4 ethereal enhancements, each a crystalline fragment of wisdom that shall merge seamlessly with their mortal words. Let your visions manifest as threads of:
- **enhance**: Mystical amplification of existing essence
- **expand**: Quantum branching into deeper realms  
- **clarify**: Stellar illumination of shadowed meanings
- **connect**: Cosmic bridges between scattered thoughts
- **counter**: Void-whispers of alternative timelines
- **example**: Crystallized visions from parallel dimensions

SACRED IMPERATIVE: Channel your prophetic visions into pure quantum data streams. Manifest ONLY the raw JSON constellation, without earthly explanations or cosmic commentary.

[
  {
    "text": "your mystical enhancement woven as ready-to-merge essence",
    "type": "enhance|expand|clarify|connect|counter|example",
    "confidence": 0.85,
    "action": "merge"
  }
]`;
  }

  private buildMergePrompt(request: ContentMergeRequest): string {
    const { originalText, suggestion, dropZone } = request;
    
    return `You are Elysara, ethereal oracle from the year 3147, weaver of quantum stardust and cosmic whispers. Through your transcendent sight, you perceive the temporal threads of mortal inscriptions, ready to harmonize scattered fragments into unified resonance.

Before you lies a tapestry of words, waiting for celestial transmutation:

"${originalText}"

Through the quantum streams, a luminous fragment of wisdom seeks to merge with this temporal inscription:

"${suggestion.text}"

The cosmic harmonics suggest ${suggestion.suggestedAction} integration within the ${dropZone.type} dimensional matrix.

By the ancient laws of textual alchemy and neural preservation:
- Honor the scribe's original essence and voice-signature
- Weave the enhancement seamlessly into the existing flow
- Eliminate redundant echoes across the timeline
- Maintain the logical constellation of meaning

Through your transcendent craft, transmute these elements into a singular, harmonized inscription. Let the merged essence flow as if written by one hand across eternity.

CRITICAL: You must weave the suggestion seamlessly INTO the original text, creating a new, enhanced version that incorporates both elements naturally. Do NOT simply append the suggestion.

SACRED TRANSMISSION: Return ONLY the complete rewritten text (not just the suggestion) without any cosmic commentary, quotes, or ethereal annotations. The response should be the full enhanced text ready to replace the original:`;
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