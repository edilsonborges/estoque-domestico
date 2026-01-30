import { useCallback } from 'react';
import {
  getNotificacoes,
  markAsRead as markAsReadService,
  type Notificacao,
  type ListNotificacoesResponse,
} from '../services/notificacao.service';
import { useCachedQuery } from './useCachedQuery';
import { useNetwork } from './useNetwork';
import { updateCacheOptimistic } from '../services/cache';
import { queueMutation } from '../services/sync';

const CACHE_KEY = 'notifications';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useNotifications() {
  const { isOnline } = useNetwork();

  const { data, loading, error, refresh } = useCachedQuery<ListNotificacoesResponse>(
    CACHE_KEY,
    getNotificacoes,
    { ttl: CACHE_TTL },
  );

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      await updateCacheOptimistic<ListNotificacoesResponse>(
        CACHE_KEY,
        (current) => ({
          ...current,
          notificacoes: current.notificacoes.map((n) =>
            n.id === id ? { ...n, lida: true } : n,
          ),
          naoLidas: Math.max(0, current.naoLidas - 1),
        }),
      );

      if (isOnline) {
        try {
          await markAsReadService(id);
        } catch {
          // Revert will happen on next refresh
        }
      } else {
        await queueMutation({
          method: 'POST',
          url: `/notificacoes/${id}/lida`,
          cacheKeys: [CACHE_KEY],
          description: 'Marcar notificação como lida',
        });
      }

      // Refresh local state from cache
      await refresh();
    },
    [isOnline, refresh],
  );

  return {
    notifications: data?.notificacoes ?? [],
    unreadCount: data?.naoLidas ?? 0,
    loading,
    error,
    refresh,
    markRead,
  };
}
