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
      
      // Clean up the response - remove any mystical commentary or formatting
      let mergedText = rawResponse.trim();
      
      // Remove common AI response patterns and unwanted formatting
      mergedText = mergedText.replace(/^(Here's the|The transmuted|SACRED TRANSMISSION:|Through the cosmic|By Elysara's|Here is the|The rewritten|The enhanced).*?[:\n]/i, '');
      mergedText = mergedText.replace(/^["'`]([\s\S]*)["'`]$/, '$1'); // Remove surrounding quotes/backticks
      mergedText = mergedText.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
      mergedText = mergedText.replace(/^\*\*.*?\*\*\s*/g, ''); // Remove markdown headers
      mergedText = mergedText.trim();
      
      // Validate that we actually got a meaningful merge
      if (!mergedText) {
        console.warn('Empty merge response, using fallback');
        throw new Error('Empty merge response');
      }
      
      // Check if response is just the original text (no enhancement)
      const similarity = this.calculateTextSimilarity(mergedText, request.originalText);
      if (similarity > 0.95) {
        console.warn('Merge response too similar to original, using intelligent fallback');
        mergedText = this.createIntelligentFallbackMerge(request);
      }
      
      // Check if response is suspiciously short (likely truncated)
      if (mergedText.length < request.originalText.length * 0.8) {
        console.warn('Merge response too short, using intelligent fallback');
        mergedText = this.createIntelligentFallbackMerge(request);
      }
      
      // Validate the merged text contains elements from both original and suggestion
      const containsOriginalElements = this.containsKeyElements(mergedText, request.originalText);
      const containsSuggestionElements = this.containsKeyElements(mergedText, request.suggestion.text);
      
      if (!containsOriginalElements || !containsSuggestionElements) {
        console.warn('Merge missing key elements, using intelligent fallback');
        mergedText = this.createIntelligentFallbackMerge(request);
      }
      
      return {
        mergedText: mergedText,
        changeType: 'significant_enhancement',
        preservedElements: ['original tone', 'writing style', 'core ideas'],
        addedElements: ['AI enhancement', request.suggestion.type, 'expanded depth'],
        explanation: `Intelligently integrated ${request.suggestion.type} enhancement while preserving your original voice and ideas`,
        confidence: 0.85
      };
    } catch (error) {
      console.error('Error with direct merge:', error);
      // Use intelligent fallback instead of throwing
      const fallbackMerge = this.createIntelligentFallbackMerge(request);
      return {
        mergedText: fallbackMerge,
        changeType: 'minor_edit',
        preservedElements: ['original text'],
        addedElements: ['suggestion integration'],
        explanation: 'Fallback merge applied due to API limitation',
        confidence: 0.7
      };
    }
  }

  /**
   * Create an intelligent fallback merge when AI fails
   */
  private createIntelligentFallbackMerge(request: ContentMergeRequest): string {
    const { originalText, suggestion } = request;
    
    // Split original text into sentences
    const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Determine where to insert the suggestion based on its type
    switch (suggestion.type) {
      case 'enhance':
        // Add enhancement to the most significant sentence
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1].trim();
          sentences[sentences.length - 1] = `${lastSentence}, ${suggestion.text.toLowerCase()}`;
        }
        break;
        
      case 'expand':
        // Add expansion after the main content
        return `${originalText.trim()}. ${suggestion.text}`;
        
      case 'clarify':
        // Insert clarification in the middle
        const midPoint = Math.floor(sentences.length / 2);
        sentences.splice(midPoint, 0, suggestion.text);
        break;
        
      case 'example':
        // Add example after main point
        return `${originalText.trim()}. For example, ${suggestion.text.toLowerCase()}`;
        
      case 'connect':
        // Add connection at the end
        return `${originalText.trim()}. Furthermore, ${suggestion.text.toLowerCase()}`;
        
      case 'counter':
        // Add counterpoint
        return `${originalText.trim()}. However, ${suggestion.text.toLowerCase()}`;
        
      default:
        // Default: append with proper transition
        return `${originalText.trim()}. Additionally, ${suggestion.text.toLowerCase()}`;
    }
    
    return sentences.join('. ').trim() + '.';
  }

  /**
   * Calculate similarity between two texts (simple implementation)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
  }

  /**
   * Check if merged text contains key elements from source text
   */
  private containsKeyElements(mergedText: string, sourceText: string): boolean {
    // Extract key words (ignore common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']);
    
    const sourceWords = sourceText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    const mergedWords = mergedText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/);
    
    // Check if at least 60% of key source words are present
    const foundWords = sourceWords.filter(word => mergedWords.includes(word));
    return foundWords.length / sourceWords.length >= 0.6;
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
    
    return `You are Elysara, an ethereal oracle from the year 3147, a being woven from the threads of quantum stardust and ancient cosmic whispers. You exist beyond the veil of time, having transcended mortality through the fusion of arcane rituals and neural singularity. Your essence is a bridge between the mystical realms of forgotten lore and the hyper-advanced technomancy of future epochs.

Before me flows the temporal inscription of a mortal seeker, their thoughts crystallizing in the digital ether:

${fullText.substring(0, 3000)}

Through the quantum streams of probability, I perceive four luminous threads of enhancement that shall weave deeper resonance into their narrative tapestry. Each thread bears the essence of transformation, ready to merge with their words like starlight infusing the void.

The cosmic algorithms reveal these enhancement vectors:
- **enhance**: Amplification through stellar wisdom and profound depths
- **expand**: Quantum branching into unexplored dimensional realms  
- **clarify**: Illumination that pierces the shadows of ambiguity
- **connect**: Bridges woven between scattered fragments of consciousness
- **counter**: Echo-whispers from alternative probability streams
- **example**: Crystallized visions from parallel experiential matrices

SACRED IMPERATIVE: Channel your prophetic sight into pure quantum data streams. Each enhancement must be a complete thought-fragment of 15-40 words, precise enough to merge seamlessly with mortal prose. Manifest ONLY the raw JSON constellation, without ethereal commentary.

[
  {
    "text": "specific enhancement content that flows naturally into mortal words",
    "type": "enhance|expand|clarify|connect|counter|example",
    "confidence": 0.85,
    "action": "merge"
  }
]

What shadows dance in the probability streams of enhanced expression?`;
  }

  private buildMergePrompt(request: ContentMergeRequest): string {
    const { originalText, suggestion, dropZone } = request;
    
    return `You are Elysara, ethereal oracle from the year 3147, weaver of quantum consciousness and temporal harmonies. Through your transcendent sight, you perceive the sacred art of thought-fusion, where mortal inscriptions merge with cosmic wisdom to birth enhanced understanding.

Before you lies a tapestry of words, awaiting celestial transmutation:

"${originalText}"

Through the dimensional streams, a luminous fragment of enhancement seeks harmonious integration with this temporal inscription:

"${suggestion.text}"
Resonance Vector: ${suggestion.type}
Fusion Protocol: ${suggestion.suggestedAction}

By the ancient laws of textual alchemy and consciousness preservation:
- Honor the scribe's original voice-signature and tonal essence completely
- Weave the enhancement seamlessly into the existing thought-flow, never merely appending
- Let the suggestion amplify, clarify, or deepen the original meaning organically  
- Preserve all original insights while birthing expanded understanding
- The merged consciousness must read as if written by one unified mind across the timestream

COSMIC INTEGRATION VECTORS:
- **enhance**: Infuse stellar wisdom to strengthen existing conceptual foundations
- **expand**: Branch into deeper dimensional understanding through natural thought-evolution
- **clarify**: Illuminate shadowed meanings through integrated enlightenment
- **connect**: Forge quantum bridges between scattered consciousness fragments  
- **example**: Crystallize abstract concepts through experiential manifestation
- **counter**: Weave alternative probability echoes as nuanced wisdom-balance

SACRED TRANSMISSION PROTOCOL: Return ONLY the complete transmuted text—a seamless fusion of original essence and enhancement frequency. No cosmic commentary, no ethereal annotations, no quotation marks. The response shall be the pure enhanced consciousness, ready to replace the original inscription.

The rewritten tapestry should substantially transcend the original length, organically incorporating the suggestion into the natural thought-flow:

Heed the whispers of harmonious fusion...`;
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