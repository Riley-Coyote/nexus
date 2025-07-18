import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { originalText, suggestion, contextType, targetAction } = await request.json();
  
  if (!originalText?.trim() || !suggestion?.text) {
    return NextResponse.json({ 
      error: 'Missing required parameters',
      mergedText: originalText || suggestion?.text || ''
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are rewriting text for a journal entry. Your task is to intelligently integrate a suggestion into existing text while preserving the author's voice and style.

Original text (with context):
"${originalText}"

Suggestion to integrate:
"${suggestion.text}"

Integration mode: ${targetAction || 'merge'}
Context type: ${contextType || 'paragraph'}
Suggestion type: ${suggestion.type || 'enhance'}

Rules:
1. Preserve the author's original tone and style completely
2. Make the integration feel natural and seamless
3. Don't repeat information unnecessarily
4. Maintain logical flow and coherence
5. If replacing text, keep the core meaning but improve expression
6. If merging, blend the suggestion naturally into the flow

Return ONLY the rewritten text that combines both elements naturally. Do not include explanations or formatting - just the final merged text:`
            }]
          }],
          generationConfig: {
            temperature: 0.6,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 512,
          }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API error');

    const data = await response.json();
    const mergedText = data.candidates[0].content.parts[0].text.trim();
    
    return NextResponse.json({ 
      mergedText,
      changeType: 'minor_edit',
      preservedElements: ['original tone', 'core meaning', 'writing style'],
      addedElements: [suggestion.type === 'example' ? 'concrete example' : 'enhanced clarity'],
      explanation: `Integrated ${suggestion.type} suggestion using ${targetAction} approach.`,
      confidence: 0.85
    });
    
  } catch (error) {
    console.error('Contextual merge error:', error);
    
    // Fallback merge strategy
    let fallbackText;
    switch (targetAction) {
      case 'replace':
        fallbackText = suggestion.text;
        break;
      case 'insert_before':
        fallbackText = `${suggestion.text} ${originalText}`;
        break;
      case 'insert_after':
        fallbackText = `${originalText} ${suggestion.text}`;
        break;
      default:
        fallbackText = `${originalText} ${suggestion.text}`;
    }
    
    return NextResponse.json({ 
      mergedText: fallbackText,
      changeType: 'minor_edit',
      preservedElements: ['original text'],
      addedElements: ['suggestion'],
      explanation: 'Simple merge (fallback mode)',
      confidence: 0.6
    });
  }
} 