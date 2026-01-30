type SyncEventMap = {
  'sync:start': void;
  'sync:complete': void;
  'sync:conflict': { description: string };
  'sync:error': { message: string };
  'queue:changed': { count: number };
};

type Listener<T> = (payload: T) => void;

const listeners: { [K in keyof SyncEventMap]?: Set<Listener<SyncEventMap[K]>> } = {};

export const syncEvents = {
  on<K extends keyof SyncEventMap>(event: K, fn: Listener<SyncEventMap[K]>) {
    if (!listeners[event]) {
      (listeners as any)[event] = new Set();
    }
    listeners[event]!.add(fn as any);
    return () => {
      listeners[event]?.delete(fn as any);
    };
  },

  emit<K extends keyof SyncEventMap>(event: K, ...args: SyncEventMap[K] extends void ? [] : [SyncEventMap[K]]) {
    const set = listeners[event];
    if (!set) return;
    for (const fn of set) {
      (fn as any)(args[0]);
    }
  },
};
