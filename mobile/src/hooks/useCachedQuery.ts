import { useState, useEffect, useCallback, useRef } from 'react';
import { getCached, getCachedIgnoringTTL, setCache } from '../services/cache';
import { useNetwork } from './useNetwork';

interface UseCachedQueryOptions {
  ttl?: number;
  enabled?: boolean;
}

interface UseCachedQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
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
  const [isStale, setIsStale] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const { isOnline } = useNetwork();
  const enabled = options?.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Try fresh cache first
      const cached = await getCached<T>(key);
      if (cached !== null) {
        setData(cached);
        setIsStale(false);
        setLoading(false);
      }

      if (!isOnline) {
        // Offline: if no fresh cache, try stale cache
        if (cached === null) {
          const stale = await getCachedIgnoringTTL<T>(key);
          if (stale !== null) {
            setData(stale);
            setIsStale(true);
          }
        }
        setLoading(false);
        return;
      }

      // Online: fetch fresh data in background
      const freshData = await fetcherRef.current();
      setData(freshData);
      setIsStale(false);
      await setCache(key, freshData, options?.ttl);
    } catch (err) {
      // On fetch error, try stale cache as fallback
      if (data === null) {
        const stale = await getCachedIgnoringTTL<T>(key);
        if (stale !== null) {
          setData(stale);
          setIsStale(true);
        } else {
          setError('Erro ao carregar dados');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [key, options?.ttl, isOnline, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isStale, refresh: fetchData };
}
