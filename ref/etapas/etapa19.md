# **ETAPA 19 — Cache Offline + Tela de Categorias + Busca**

**Sistema: Estoque Doméstico Inteligente**

Esta etapa descreve a **infraestrutura de cache offline** com fila de mutações, a **tela de categorias** em grid e o **componente de busca** com debounce, incluindo:

* Serviço de cache com AsyncStorage e TTL configurável
* Fila de mutações para operações offline
* Hook genérico para cache + fetch
* Hook de busca com filtro case-insensitive
* Tela de categorias em grid 2 colunas com emojis
* Componente SearchBar com debounce

---

## 1. Serviço de Cache

### 1.1 `src/services/cache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache:';
const DEFAULT_TTL = 300000; // 5 minutos

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() > entry.expiry) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(entry)
    );
  } catch {
    // Falha silenciosa — cache é best-effort
  }
}

export async function clearCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Falha silenciosa
  }
}
```

**Funções:**

* **getCached\<T\>(key)** — lê o item do AsyncStorage, verifica o timestamp de expiração; retorna `data` se válido ou `null` se expirado/inexistente
* **setCache\<T\>(key, data, ttlMs?)** — armazena `{ data, expiry }` como JSON; TTL padrão de **5 minutos** (300.000ms)
* **clearCache()** — busca todas as chaves, filtra pelo prefixo `@cache:`, remove em batch via `multiRemove`

**Detalhes de implementação:**

* Prefixo `@cache:` evita colisão com outras chaves do AsyncStorage
* Expiração verificada na leitura (lazy expiry)
* Erros de I/O tratados silenciosamente (cache é best-effort)

---

## 2. Serviço de Sincronização

### 2.1 `src/services/sync.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const QUEUE_KEY = '@mutation_queue';

export interface MutationEntry {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: Record<string, any>;
  timestamp: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function queueMutation(mutation: {
  method: MutationEntry['method'];
  url: string;
  data?: Record<string, any>;
}): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: MutationEntry[] = raw ? JSON.parse(raw) : [];

    const entry: MutationEntry = {
      id: generateId(),
      method: mutation.method,
      url: mutation.url,
      data: mutation.data,
      timestamp: Date.now(),
    };

    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Falha silenciosa
  }
}

export async function processMutationQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;

    const queue: MutationEntry[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const failed: MutationEntry[] = [];

    for (const entry of queue) {
      try {
        await api.request({
          method: entry.method,
          url: entry.url,
          data: entry.data,
        });
      } catch {
        failed.push(entry);
      }
    }

    // Mantém apenas as mutações que falharam para retry
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } catch {
    // Falha silenciosa
  }
}

export async function getMutationQueueSize(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const queue: MutationEntry[] = JSON.parse(raw);
    return queue.length;
  } catch {
    return 0;
  }
}
```

**Interface MutationEntry:**

* `id` — identificador único gerado com timestamp + sufixo aleatório
* `method` — método HTTP (`POST`, `PUT`, `PATCH`, `DELETE`)
* `url` — endpoint da API
* `data` — payload opcional
* `timestamp` — momento em que a mutação foi enfileirada

**Funções:**

* **queueMutation({ method, url, data })** — gera ID único, adiciona ao array armazenado na chave `@mutation_queue`
* **processMutationQueue()** — lê a fila, executa cada mutação via `api.request()`, mantém apenas as falhas para retry posterior
* **getMutationQueueSize()** — retorna o número de mutações pendentes na fila

---

## 3. Hook useCachedQuery

### 3.1 `src/hooks/useCachedQuery.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getCached, setCache } from '../services/cache';

interface UseCachedQueryOptions {
  ttlMs?: number;
}

interface UseCachedQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCachedQuery<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options?: UseCachedQueryOptions
): UseCachedQueryReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Retorna cache imediatamente (se disponível)
      const cached = await getCached<T>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
      }

      // 2. Busca dados frescos em background
      const fresh = await fetchFn();
      setData(fresh);
      setError(null);

      // 3. Atualiza cache
      await setCache(cacheKey, fresh, options?.ttlMs);
    } catch (err) {
      // Se não tinha cache, exibe erro
      if (!data) {
        setError('Erro ao carregar dados.');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, options?.ttlMs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
```

**Comportamento (stale-while-revalidate):**

1. No mount: retorna dados do cache imediatamente (se disponíveis)
2. Em paralelo: busca dados frescos da API
3. Atualiza o cache após fetch bem-sucedido
4. Se não há cache e o fetch falha: exibe mensagem de erro
5. TTL configurável via `options.ttlMs` (padrão: 5 minutos)

---

## 4. Hook useSearch

### 4.1 `src/hooks/useSearch.ts`

```typescript
import { useState, useMemo } from 'react';

interface UseSearchReturn<T> {
  filteredItems: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function useSearch<T extends Record<string, any>>(
  items: T[],
  field: keyof T = 'nome' as keyof T
): UseSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const value = item[field];
      if (typeof value !== 'string') return false;
      return value.toLowerCase().includes(query);
    });
  }, [items, searchQuery, field]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
  };
}
```

* Hook genérico que aceita um array de objetos e o nome do campo para busca (padrão: `'nome'`)
* Filtragem **case-insensitive** via `toLowerCase().includes()`
* Resultado memoizado com `useMemo` para performance
* Query vazia retorna todos os itens

---

## 5. Tela de Categorias

### 5.1 `app/(tabs)/categories.tsx`

```tsx
import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryCard } from '../../src/components/CategoryCard';
import { useCachedQuery } from '../../src/hooks/useCachedQuery';
import { getItens } from '../../src/services/item.service';
import { colors } from '../../src/theme/colors';

interface CategoriaGroup {
  categoria: string;
  count: number;
}

export default function CategoriesScreen() {
  const router = useRouter();

  const { data: itens, loading, refresh } = useCachedQuery(
    'itens-ativos',
    () => getItens({ status: 'ATIVO' })
  );

  const categorias: CategoriaGroup[] = useMemo(() => {
    if (!itens) return [];

    const groups: Record<string, number> = {};

    for (const item of itens) {
      const cat = item.categoria || 'Outros';
      groups[cat] = (groups[cat] || 0) + 1;
    }

    return Object.entries(groups)
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count);
  }, [itens]);

  if (loading && !itens) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (categorias.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="grid-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>Nenhuma categoria</Text>
        <Text style={styles.emptySubtitle}>
          Seus itens aparecerão organizados por categoria aqui.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={categorias}
      keyExtractor={(item) => item.categoria}
      numColumns={2}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} />
      }
      renderItem={({ item }) => (
        <CategoryCard
          categoria={item.categoria}
          count={item.count}
          onPress={() =>
            router.push(`/items?categoria=${encodeURIComponent(item.categoria)}`)
          }
        />
      )}
      accessibilityRole="list"
    />
  );
}
```

**Comportamento:**

* Busca itens ativos via `GET /itens?status=ATIVO` (com cache)
* Agrupa itens por campo `categoria` usando `useMemo`
* Itens sem categoria agrupados sob **"Outros"**
* Ordenação por contagem **decrescente** (mais itens primeiro)
* **FlatList** com `numColumns={2}` para grid de 2 colunas
* **Tap** no card navega para `/items?categoria=X` (URL-encoded)
* Pull-to-refresh, loading state e empty state com ícone `grid-outline`

---

## 6. Componente CategoryCard

### 6.1 `src/components/CategoryCard.tsx`

```tsx
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CategoryCardProps {
  categoria: string;
  count: number;
  onPress: () => void;
}

const EMOJI_MAP: Record<string, string> = {
  'Frutas': '🍎',
  'Verduras': '🥬',
  'Carnes': '🥩',
  'Laticínios': '🧀',
  'Grãos': '🌾',
  'Bebidas': '🥤',
  'Congelados': '🧊',
  'Enlatados': '🥫',
  'Temperos': '🌿',
  'Higiene': '🧴',
};

export function CategoryCard({
  categoria,
  count,
  onPress,
}: CategoryCardProps) {
  const emoji = EMOJI_MAP[categoria];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${categoria}, ${count} itens`}
    >
      {emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : (
        <Ionicons
          name="cube-outline"
          size={32}
          color={colors.primary}
        />
      )}
      <Text style={styles.name} numberOfLines={1}>
        {categoria}
      </Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'item' : 'itens'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    // Sombra iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Sombra Android
    elevation: 3,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
```

**Mapa de emojis por categoria:**

| Categoria | Emoji |
|-----------|-------|
| Frutas | 🍎 |
| Verduras | 🥬 |
| Carnes | 🥩 |
| Laticínios | 🧀 |
| Grãos | 🌾 |
| Bebidas | 🥤 |
| Congelados | 🧊 |
| Enlatados | 🥫 |
| Temperos | 🌿 |
| Higiene | 🧴 |

* Categorias não mapeadas exibem ícone fallback `cube-outline` (Ionicons)
* Card com fundo branco, cantos arredondados (16px), sombra (iOS + Android)
* Exibe emoji/ícone + nome da categoria + contagem de itens
* `accessibilityLabel` com nome da categoria e quantidade

---

## 7. Componente SearchBar

### 7.1 `src/components/SearchBar.tsx`

```tsx
import { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export function SearchBar({
  placeholder = 'Buscar...',
  onSearch,
}: SearchBarProps) {
  const [text, setText] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounce de 300ms
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(text);
    }, 300);

    // Cleanup no unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text]);

  return (
    <View
      style={styles.container}
      accessibilityRole="search"
    >
      <Ionicons
        name="search"
        size={20}
        color={colors.textSecondary}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 44,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
});
```

* Ícone `search` (Ionicons) à esquerda do campo de texto
* **Debounce de 300ms** — usa `setTimeout` com limpeza via `clearTimeout`
* Callback `onSearch` chamado após o delay
* Cleanup no `unmount` — limpa o timeout pendente para evitar memory leaks
* Placeholder customizável (padrão: "Buscar...")
* `accessibilityRole="search"` no container
* Altura fixa de **44pt** (requisito mínimo de touch target)

---

## Resultado da Etapa 19

✅ Cache offline com AsyncStorage, prefixo `@cache:` e TTL configurável (padrão 5min)
✅ Verificação de expiração na leitura (lazy expiry) com remoção automática
✅ Fila de mutações offline (`@mutation_queue`) com `queueMutation` e `processMutationQueue`
✅ Mutações com falha mantidas na fila para retry posterior
✅ Hook `useCachedQuery` com padrão stale-while-revalidate (cache imediato + fetch em background)
✅ Hook `useSearch` genérico com filtragem case-insensitive via `useMemo`
✅ Tela de categorias com grid 2 colunas (`FlatList numColumns={2}`)
✅ Agrupamento por categoria com itens sem categoria sob "Outros", ordenado por contagem decrescente
✅ `CategoryCard` com emojis mapeados (10 categorias) e fallback `cube-outline`
✅ `SearchBar` com debounce de 300ms, cleanup no unmount e `accessibilityRole="search"`
