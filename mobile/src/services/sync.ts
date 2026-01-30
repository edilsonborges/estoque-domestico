import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { rollbackCache, invalidateCache } from './cache';
import { syncEvents } from './syncEvents';

const QUEUE_KEY = '@mutation_queue';

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  cacheKeys: string[];
  rollbackData: Record<string, unknown>;
  description: string;
  createdAt: string;
}

async function getQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function queueMutation(mutation: {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  cacheKeys?: string[];
  rollbackData?: Record<string, unknown>;
  description?: string;
}): Promise<string> {
  const queue = await getQueue();
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const entry: QueuedMutation = {
    id,
    method: mutation.method,
    url: mutation.url,
    data: mutation.data,
    cacheKeys: mutation.cacheKeys ?? [],
    rollbackData: mutation.rollbackData ?? {},
    description: mutation.description ?? '',
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveQueue(queue);
  syncEvents.emit('queue:changed', { count: queue.length });
  return id;
}

export async function removeMutation(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await saveQueue(filtered);
  syncEvents.emit('queue:changed', { count: filtered.length });
}

export async function getMutationQueue(): Promise<QueuedMutation[]> {
  return getQueue();
}

export async function getMutationQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message.toLowerCase();
    return msg.includes('network') || msg.includes('timeout');
  }
  return false;
}

export async function processMutationQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  syncEvents.emit('sync:start');

  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await api.request({
        method: mutation.method,
        url: mutation.url,
        data: mutation.data,
      });
      // Success: invalidate related caches so fresh data is fetched
      for (const key of mutation.cacheKeys) {
        await invalidateCache(key);
      }
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 409) {
        // Version conflict: server wins — rollback optimistic cache, invalidate
        for (const [key, data] of Object.entries(mutation.rollbackData)) {
          await rollbackCache(key, data);
        }
        for (const key of mutation.cacheKeys) {
          await invalidateCache(key);
        }
        syncEvents.emit('sync:conflict', { description: mutation.description });
      } else if (status === 401 || status === 403) {
        // Auth error: discard mutation (interceptor handles logout for 401)
      } else if (isNetworkError(error) || !error?.response) {
        // Network error: keep in queue for retry, stop processing
        remaining.push(mutation);
        // Also keep everything after this one
        const idx = queue.indexOf(mutation);
        remaining.push(...queue.slice(idx + 1));
        break;
      } else {
        // Other server error (4xx/5xx): discard + rollback
        for (const [key, data] of Object.entries(mutation.rollbackData)) {
          await rollbackCache(key, data);
        }
        syncEvents.emit('sync:error', {
          message: mutation.description || 'Erro ao sincronizar',
        });
      }
    }
  }

  await saveQueue(remaining);
  syncEvents.emit('queue:changed', { count: remaining.length });
  syncEvents.emit('sync:complete');
}
