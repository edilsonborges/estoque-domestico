import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNetwork } from './useNetwork';
import { api } from '../services/api';
import { setCache, getCachedIgnoringTTL, updateCacheOptimistic } from '../services/cache';
import { queueMutation } from '../services/sync';

interface MutationConfig<TData, TResponse> {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: TData;
  cacheKeys?: string[];
  description?: string;
  optimisticUpdate?: {
    key: string;
    updater: (current: any) => any;
  };
  onSuccess?: (response: TResponse) => void;
  onError?: (error: any) => void;
}

interface UseOfflineMutationReturn<TData, TResponse> {
  mutate: (config: MutationConfig<TData, TResponse>) => Promise<void>;
  isPending: boolean;
}

export function useOfflineMutation<
  TData = unknown,
  TResponse = unknown,
>(): UseOfflineMutationReturn<TData, TResponse> {
  const [isPending, setIsPending] = useState(false);
  const { isOnline } = useNetwork();

  const mutate = useCallback(
    async (config: MutationConfig<TData, TResponse>) => {
      setIsPending(true);

      // Capture rollback data before optimistic update
      let rollbackData: Record<string, unknown> = {};
      if (config.optimisticUpdate) {
        const current = await getCachedIgnoringTTL(config.optimisticUpdate.key);
        if (current !== null) {
          rollbackData[config.optimisticUpdate.key] = current;
        }
        await updateCacheOptimistic(
          config.optimisticUpdate.key,
          config.optimisticUpdate.updater,
        );
      }

      if (isOnline) {
        try {
          const response = await api.request<TResponse>({
            method: config.method,
            url: config.url,
            data: config.data,
          });
          // Update cache with server response if applicable
          if (config.optimisticUpdate && response.data) {
            await setCache(config.optimisticUpdate.key, response.data);
          }
          config.onSuccess?.(response.data);
        } catch (error: any) {
          config.onError?.(error);
        } finally {
          setIsPending(false);
        }
      } else {
        // Offline: queue mutation
        await queueMutation({
          method: config.method,
          url: config.url,
          data: config.data,
          cacheKeys: config.cacheKeys ?? [],
          rollbackData,
          description: config.description ?? '',
        });
        setIsPending(false);
        Alert.alert(
          'Registrado offline',
          'Será sincronizado quando houver conexão.',
        );
      }
    },
    [isOnline],
  );

  return { mutate, isPending };
}
