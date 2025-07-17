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
              text: `You are an AI writing assistant for a reflective journal. Analyze the content and provide exactly 4 concise, actionable suggestions to enhance the writing. Each suggestion should be one clear sentence that can be directly integrated.

Current journal entry: ${content.substring(0, 2000)}

Provide suggestions that:
1. Enhance clarity or depth
2. Add specific examples or connections
3. Improve flow or structure
4. Expand on interesting ideas

Format: Return each suggestion on a new line, no numbering or bullets.`
            }]
          }]
        })
      }
    );
    
    if (!response.ok) throw new Error('Gemini API error');
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    const suggestions = aiResponse.split('\n').filter((s: string) => s.trim()).slice(0, 4);
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Gemini suggestion error:', error);
    return NextResponse.json({ suggestions: ['Failed to generate suggestions. Please try again.'] });
  }
} 