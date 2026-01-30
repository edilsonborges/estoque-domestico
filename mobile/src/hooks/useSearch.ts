import { useState, useMemo } from 'react';

interface UseSearchReturn<T> {
  filteredItems: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function useSearch<T extends Record<string, unknown>>(
  items: T[],
  searchField: string = 'nome',
): UseSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const fieldValue = item[searchField];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(normalizedQuery);
      }
      return false;
    });
  }, [items, searchQuery, searchField]);

  return { filteredItems, searchQuery, setSearchQuery };
}
