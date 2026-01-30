import { useState, useEffect, useCallback, useRef } from 'react';
import { getCached, setCache } from '../services/cache';

interface UseCachedQueryOptions {
  ttl?: number;
}

interface UseCachedQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedQueryOptions,
): UseCachedQueryReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Return cached data immediately if available
      const cached = await getCached<T>(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
      }

      // Fetch fresh data in background
      const freshData = await fetcherRef.current();
      setData(freshData);
      await setCache(key, freshData, options?.ttl);
    } catch (err) {
      // Only set error if we have no cached data
      if (data === null) {
        setError('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  }, [key, options?.ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
