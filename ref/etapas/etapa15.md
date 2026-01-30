# **ETAPA 15 — Tela de Lista de Itens**

**Sistema: Estoque Doméstico Inteligente**

---

## 1. Visão Geral

A tela de Lista de Itens exibe todos os itens do estoque ativo, divididos em duas abas: **Estoque** (itens ativos) e **Arquivo** (consumidos/descartados). Cada item é exibido em um componente `ItemRow` com nome, quantidade, badge de validade e categoria. Um botão flutuante (FAB) permite adicionar novos itens via scanner.

---

## 2. Tela de Itens

### 2.1 Items Screen (`app/(tabs)/items.tsx`)

```typescript
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useItems } from '../../src/hooks/useItems';
import { useEstoque } from '../../src/hooks/useEstoque';
import { ItemRow } from '../../src/components/ItemRow';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

type Tab = 'estoque' | 'arquivo';

export default function ItemsScreen() {
  const insets = useSafeAreaInsets();
  const { estoque } = useEstoque();
  const [activeTab, setActiveTab] = useState<Tab>('estoque');

  const isArquivo = activeTab === 'arquivo';

  const { items, loading, refresh, total } = useItems(
    estoque?.id || '',
    { arquivados: isArquivo }
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Itens</Text>
        <Text style={styles.subtitle}>{total} itens</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'estoque' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('estoque')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'estoque' && styles.tabTextActive,
            ]}
          >
            Estoque
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'arquivo' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('arquivo')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'arquivo' && styles.tabTextActive,
            ]}
          >
            Arquivo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={isArquivo ? 'archive-outline' : 'cube-outline'}
            message={
              isArquivo
                ? 'Nenhum item arquivado'
                : 'Nenhum item no estoque'
            }
          />
        }
        contentContainerStyle={items.length === 0 && styles.emptyList}
      />

      {/* FAB — só na aba Estoque */}
      {activeTab === 'estoque' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 2.2 Estrutura da Tela

* **Header:** título "Itens" e contagem total
* **Tab bar no topo:** duas abas ("Estoque" e "Arquivo") com underline na aba ativa
* **FlatList:** renderiza `ItemRow` para cada item, com pull-to-refresh
* **EmptyState:** exibido quando a lista está vazia (ícone + mensagem contextual)
* **FAB (+):** botão flutuante visível apenas na aba "Estoque", navega para scanner

---

## 3. Componente ItemRow

### 3.1 Implementação (`src/components/ItemRow.tsx`)

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ItemEstoque } from '../services/item.service';
import { ExpirationBadge } from './ExpirationBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface ItemRowProps {
  item: ItemEstoque;
  onPress: () => void;
}

export function ItemRow({ item, onPress }: ItemRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.nome} numberOfLines={1}>
          {item.nome}
        </Text>
        {item.categoria && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.categoria}</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <Text style={styles.quantidade}>
          {item.quantidade} {item.unidade}
        </Text>
        {item.data_validade && (
          <ExpirationBadge dataValidade={item.data_validade} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  nome: {
    ...typography.body,
    color: colors.text,
  },
  categoryTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  quantidade: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
```

**Layout:**

* **Lado esquerdo:** nome do item (truncado com `numberOfLines={1}`) + tag de categoria
* **Lado direito:** quantidade com unidade + badge de validade
* **TouchableOpacity:** ao tocar, navega para `/item/[id]` (tela de detalhe)
* **Separador:** borda inferior `borderLight` (#F1F5F9)

---

## 4. Componente ExpirationBadge

### 4.1 Implementação (`src/components/ExpirationBadge.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ExpirationBadgeProps {
  dataValidade: string;
}

function calcularDiasRestantes(dataValidade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  const diff = validade.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusColor(dias: number): string {
  if (dias < 0) return colors.statusVencido;    // #EF4444 vermelho
  if (dias <= 1) return colors.statusUrgente;    // #F97316 laranja
  if (dias <= 5) return colors.statusAtencao;    // #F59E0B amarelo
  return colors.statusOk;                         // #10B981 verde
}

function getStatusText(dias: number): string {
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

export function ExpirationBadge({ dataValidade }: ExpirationBadgeProps) {
  const dias = calcularDiasRestantes(dataValidade);
  const bgColor = getStatusColor(dias);
  const texto = getStatusText(dias);

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
```

**Regras de cor:**

| Condição | Cor | Texto |
|----------|-----|-------|
| dias < 0 | `#EF4444` (vermelho) | "Vencido" |
| dias <= 1 | `#F97316` (laranja) | "Vence hoje" ou "1 dia" |
| dias <= 5 | `#F59E0B` (amarelo) | "N dias" |
| dias > 5 | `#10B981` (verde) | "N dias" |

---

## 5. Componente EmptyState

### 5.1 Implementação (`src/components/EmptyState.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface EmptyStateProps {
  icon: IoniconsName;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.textLight} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
```

**Props:**

* **icon:** nome do Ionicons (ex: `"cube-outline"`, `"archive-outline"`)
* **message:** texto descritivo (ex: "Nenhum item no estoque")

---

## 6. Hook useItems

### 6.1 Implementação (`src/hooks/useItems.ts`)

```typescript
import { useCallback, useEffect, useState } from 'react';
import {
  getItens,
  ItemEstoque,
  GetItensParams,
} from '../services/item.service';

export function useItems(
  estoqueId: string,
  options?: GetItensParams
) {
  const [items, setItems] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async () => {
    if (!estoqueId) return;

    try {
      setLoading(true);
      const response = await getItens(estoqueId, options);
      setItems(response.itens);
      setTotal(response.total);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  }, [estoqueId, options?.arquivados]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const refresh = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  return { items, loading, refresh, total };
}
```

**Parâmetros:**

* **estoqueId:** ID do estoque ativo
* **options:** `{ arquivados }` — quando `true`, busca itens CONSUMIDO/DESCARTADO

**Retorno:**

* **items:** array de `ItemEstoque`
* **loading:** estado de carregamento
* **refresh:** função para recarregar (pull-to-refresh)
* **total:** contagem total de itens

---

## 7. Estilos da Tela

### 7.1 Tab Bar

```typescript
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
```

* **Aba ativa:** borda inferior teal de 2px + texto teal
* **Aba inativa:** sem borda inferior + texto cinza
* **FAB:** circular 56x56, fundo teal, ícone "+" branco, sombra com elevation

---

## Resultado da Etapa 15

✅ Tela de itens funcional com FlatList e dados reais da API
✅ Tab bar com duas abas: "Estoque" (ativos) e "Arquivo" (consumidos/descartados)
✅ Componente ItemRow com nome, quantidade, tag de categoria e badge de validade
✅ ExpirationBadge com cores dinâmicas (verde, amarelo, laranja, vermelho)
✅ EmptyState reutilizável com ícone e mensagem personalizáveis
✅ Pull-to-refresh via RefreshControl
✅ FAB (+) visível apenas na aba Estoque, navega para scanner
✅ Hook useItems com suporte a filtro de arquivados e refresh
✅ Navegação para detalhe do item ao tocar em um ItemRow
