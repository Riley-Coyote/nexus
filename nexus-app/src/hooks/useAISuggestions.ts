import { useState, useEffect, useRef } from 'react';

export function useAISuggestions(content: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!content.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });

        if (!response.ok) throw new Error('Failed to generate suggestions');

        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (err) {
        setError('Failed to generate suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content]);

  return { suggestions, isLoading, error };
} 