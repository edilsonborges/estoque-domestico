import { useState, useEffect, useCallback } from 'react';
import {
  getNotificacoes,
  markAsRead as markAsReadService,
  type Notificacao,
} from '../services/notificacao.service';

interface UseNotificationsReturn {
  notifications: Notificacao[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getNotificacoes();
      setNotifications(response.notificacoes);
      setUnreadCount(response.naoLidas);
    } catch (err) {
      setError('Erro ao carregar notificacoes');
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await markAsReadService(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail, user can retry
      }
    },
    [],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markRead,
  };
}
