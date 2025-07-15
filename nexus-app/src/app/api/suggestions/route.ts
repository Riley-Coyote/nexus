import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { content } = await request.json();
  
  if (!content?.trim()) {
    return NextResponse.json({ suggestions: [] });
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI writing assistant. Provide 4 helpful suggestions to improve or expand the user's journal entry. Current entry: ${content.substring(0, 1000)}`
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