import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processMutationQueue, getMutationQueueSize } from '../services/sync';
import { syncEvents } from '../services/syncEvents';

interface NetworkContextValue {
  isOnline: boolean;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;
}

export const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const wasOfflineRef = useRef(false);
  const syncingRef = useRef(false);

  // Load initial queue size
  useEffect(() => {
    getMutationQueueSize().then(setPendingSyncCount);
  }, []);

  // Listen for queue changes
  useEffect(() => {
    return syncEvents.on('queue:changed', ({ count }) => {
      setPendingSyncCount(count);
    });
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await processMutationQueue();
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      if (!online) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        // Transition offline → online: trigger sync
        wasOfflineRef.current = false;
        triggerSync();
      }
    });

    return unsubscribe;
  }, [triggerSync]);

  // Sync on mount if there's a queue (app was closed with pending mutations)
  useEffect(() => {
    getMutationQueueSize().then((size) => {
      if (size > 0) {
        triggerSync();
      }
    });
  }, [triggerSync]);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingSyncCount, triggerSync }}>
      {children}
    </NetworkContext.Provider>
  );
}
