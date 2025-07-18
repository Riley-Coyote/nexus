import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { content } = await request.json();
  
  if (!content?.trim()) {
    return NextResponse.json({ suggestions: [] });
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
              text: `You are an AI writing assistant for reflective journaling. Analyze the full journal entry and provide exactly 4 specific, actionable suggestions.

Full journal entry:
${content.substring(0, 4000)}

Create suggestions that are:
1. Specific and actionable (not vague)
2. Diverse in type (expand, clarify, connect, example, enhance)
3. Contextually relevant to the full content
4. Written as complete, ready-to-use text snippets

Return as JSON array with this exact format:
[
  {
    "text": "specific suggestion text here",
    "type": "enhance|expand|clarify|connect|counter|example",
    "confidence": 0.85,
    "action": "merge|replace|insert_before|insert_after|weave"
  }
]

Focus on global improvements that consider the entire journal entry.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API error');

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ 
          suggestions: suggestions.map((s: any) => ({
            text: s.text,
            type: s.type || 'enhance',
            confidence: s.confidence || 0.8,
            action: s.action || 'merge'
          }))
        });
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON, using fallback');
    }
    
    // Fallback: parse line by line
    const suggestions = aiResponse.split('\n')
      .filter((s: string) => s.trim())
      .slice(0, 4)
      .map((s: string) => s.replace(/^\d+\.?\s*/, '').trim());
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Full-text suggestion error:', error);
    return NextResponse.json({ 
      suggestions: ['Consider expanding on your main themes.', 'Add specific examples to support your thoughts.', 'Explore the connections between different ideas.', 'Reflect on the implications of your insights.']
    });
  }
} 