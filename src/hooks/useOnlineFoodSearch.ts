import { useState, useCallback, useRef } from 'react';
import { Food } from '../types';
import { searchFoodOnline } from '../services/foodSearch';

interface UseOnlineFoodSearchResult {
  results: Food[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useOnlineFoodSearch(): UseOnlineFoodSearchResult {
  const [results, setResults] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    // Cancel previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Debounce 500ms
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const foods = await searchFoodOnline(query);
        setResults(foods);
      } catch (err) {
        setError('Erro ao buscar alimentos');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return { results, isLoading, error, search, clearResults };
}
