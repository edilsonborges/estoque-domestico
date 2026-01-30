import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const QUEUE_KEY = '@mutation_queue';

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
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
}): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedMutation = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    method: mutation.method,
    url: mutation.url,
    data: mutation.data,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveQueue(queue);
}

export async function processMutationQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await api.request({
        method: mutation.method,
        url: mutation.url,
        data: mutation.data,
      });
    } catch {
      // Keep failed mutations in queue for retry
      remaining.push(mutation);
    }
  }

  await saveQueue(remaining);
}

export async function getMutationQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
