import { useState, useEffect, useCallback } from 'react';
import { syncEvents } from '../services/syncEvents';

interface SyncConflict {
  id: string;
  description: string;
}

interface UseSyncStatusReturn {
  pendingCount: number;
  isSyncing: boolean;
  conflicts: SyncConflict[];
  dismissConflict: (id: string) => void;
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    const unsubs = [
      syncEvents.on('queue:changed', ({ count }) => setPendingCount(count)),
      syncEvents.on('sync:start', () => setIsSyncing(true)),
      syncEvents.on('sync:complete', () => setIsSyncing(false)),
      syncEvents.on('sync:conflict', ({ description }) => {
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setConflicts((prev) => [...prev, { id, description }]);
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const dismissConflict = useCallback((id: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { pendingCount, isSyncing, conflicts, dismissConflict };
}
