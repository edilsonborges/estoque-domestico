# **ETAPA 14 — Tela Home (Dashboard)**

**Sistema: Estoque Doméstico Inteligente**

---

## 1. Visão Geral

A tela Home é o **Dashboard principal** do app. Exibe um resumo do estoque ativo do usuário com cards de métricas, preview dos alertas mais urgentes e um botão flutuante (FAB) para acesso rápido ao scanner QR.

---

## 2. Tela Dashboard

### 2.1 Dashboard Screen (`app/(tabs)/index.tsx`)

```typescript
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEstoque } from '../../src/hooks/useEstoque';
import { SummaryCard } from '../../src/components/SummaryCard';
import { AlertPreviewList } from '../../src/components/AlertPreviewList';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { estoque, loading, refresh, summary, alertas } = useEstoque();
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
        <Text style={styles.headerLabel}>
          {estoque?.nome || 'Carregando...'}
        </Text>
        <Text style={styles.headerTitle}>Meu Estoque</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <SummaryCard
            label="Itens Ativos"
            value={summary.ativos}
            color={colors.primary}
          />
          <SummaryCard
            label="Vencendo"
            value={summary.vencendo}
            color={colors.statusUrgente}
          />
          <SummaryCard
            label="Vencidos"
            value={summary.vencidos}
            color={colors.statusVencido}
          />
        </View>

        {/* Alert Preview */}
        <AlertPreviewList alertas={alertas} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/(tabs)/scan')}
      >
        <Ionicons name="qr-code" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}
```

### 2.2 Estrutura da Tela

* **Header:** nome do estoque ativo + título "Meu Estoque"
* **3 SummaryCards:** dispostos em linha horizontal
  * "Itens Ativos" — cor `primary` (#0D9488)
  * "Vencendo" — cor `statusUrgente` (#F97316)
  * "Vencidos" — cor `statusVencido` (#EF4444)
* **AlertPreviewList:** lista dos 3 alertas mais urgentes
* **FAB:** botão circular teal no canto inferior direito, navega para `/(tabs)/scan`
* **Pull-to-refresh:** `ScrollView` com `RefreshControl`

---

## 3. Componente SummaryCard

### 3.1 Implementação (`src/components/SummaryCard.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
}

export function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  value: {
    ...typography.h1,
    color: colors.text,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
```

**Detalhes visuais:**

* **Borda lateral colorida:** `accent` de 4px com cor do prop `color`
* **Valor grande:** tipografia `h1` (28px bold) centralizado
* **Label:** tipografia `caption` (12px) abaixo do valor
* **Sombra:** `elevation: 2` (Android) + shadow (iOS)
* **Layout:** `flex: 1` para distribuição igual entre os 3 cards

---

## 4. Componente AlertPreviewList

### 4.1 Implementação (`src/components/AlertPreviewList.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Alerta {
  id: string;
  item_nome: string;
  dias_restantes: number;
  status: 'ATENCAO' | 'URGENTE' | 'VENCIDO';
}

interface AlertPreviewListProps {
  alertas: Alerta[];
}

const statusColors: Record<string, string> = {
  ATENCAO: colors.statusAtencao,
  URGENTE: colors.statusUrgente,
  VENCIDO: colors.statusVencido,
};

export function AlertPreviewList({ alertas }: AlertPreviewListProps) {
  const topAlertas = alertas.slice(0, 3);

  if (topAlertas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="checkmark-circle"
          size={48}
          color={colors.statusOk}
        />
        <Text style={styles.emptyText}>Tudo em dia!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas</Text>
      {topAlertas.map((alerta) => (
        <View key={alerta.id} style={styles.alertRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: statusColors[alerta.status] },
            ]}
          />
          <Text style={styles.itemName} numberOfLines={1}>
            {alerta.item_nome}
          </Text>
          <Text
            style={[
              styles.days,
              { color: statusColors[alerta.status] },
            ]}
          >
            {alerta.dias_restantes <= 0
              ? 'Vencido'
              : `${alerta.dias_restantes}d`}
          </Text>
        </View>
      ))}
    </View>
  );
}
```

**Comportamento:**

* Exibe no máximo **3 alertas** (os mais urgentes)
* Cada alerta mostra: **dot colorido** (status), **nome do item**, **dias restantes**
* **Estado vazio:** ícone de checkmark verde + texto "Tudo em dia!"
* **Cores por status:** ATENCAO (#F59E0B), URGENTE (#F97316), VENCIDO (#EF4444)

---

## 5. Serviços

### 5.1 Estoque Service (`src/services/estoque.service.ts`)

```typescript
import { api } from './api';

export interface Estoque {
  id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export async function getEstoques(): Promise<Estoque[]> {
  const response = await api.get('/estoques');
  return response.data;
}

export async function getEstoque(id: string): Promise<Estoque> {
  const response = await api.get(`/estoques/${id}`);
  return response.data;
}
```

### 5.2 Item Service (`src/services/item.service.ts`)

```typescript
import { api } from './api';

export interface ItemEstoque {
  id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
  unidade: string;
  data_validade: string | null;
  status: 'ATIVO' | 'CONSUMIDO' | 'DESCARTADO' | 'VENCIDO';
  categoria: string | null;
  estoque_id: string;
  qr_code_id: string | null;
  version: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Alerta {
  id: string;
  item_nome: string;
  dias_restantes: number;
  status: 'ATENCAO' | 'URGENTE' | 'VENCIDO';
}

export interface CreateItemData {
  nome: string;
  descricao?: string;
  quantidade: number;
  unidade: string;
  data_validade?: string;
  categoria?: string;
  qr_code_id?: string;
}

export interface UpdateItemData {
  nome?: string;
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  data_validade?: string;
  categoria?: string;
  version: number;
}

export interface ConsumeItemData {
  quantidade: number;
  version: number;
}

export interface DiscardItemData {
  version: number;
}

export interface GetItensParams {
  arquivados?: boolean;
  categoria?: string;
  busca?: string;
}

export async function getItens(
  estoqueId: string,
  params?: GetItensParams
): Promise<{ itens: ItemEstoque[]; total: number }> {
  const response = await api.get(`/estoques/${estoqueId}/itens`, { params });
  return response.data;
}

export async function getItem(
  estoqueId: string,
  itemId: string
): Promise<ItemEstoque> {
  const response = await api.get(`/estoques/${estoqueId}/itens/${itemId}`);
  return response.data;
}

export async function createItem(
  estoqueId: string,
  data: CreateItemData
): Promise<ItemEstoque> {
  const response = await api.post(`/estoques/${estoqueId}/itens`, data);
  return response.data;
}

export async function updateItem(
  estoqueId: string,
  itemId: string,
  data: UpdateItemData
): Promise<ItemEstoque> {
  const response = await api.put(
    `/estoques/${estoqueId}/itens/${itemId}`,
    data
  );
  return response.data;
}

export async function consumeItem(
  estoqueId: string,
  itemId: string,
  data: ConsumeItemData
): Promise<ItemEstoque> {
  const response = await api.post(
    `/estoques/${estoqueId}/itens/${itemId}/consumir`,
    data
  );
  return response.data;
}

export async function discardItem(
  estoqueId: string,
  itemId: string,
  data: DiscardItemData
): Promise<ItemEstoque> {
  const response = await api.post(
    `/estoques/${estoqueId}/itens/${itemId}/descartar`,
    data
  );
  return response.data;
}

export async function getAlertas(
  estoqueId: string
): Promise<Alerta[]> {
  const response = await api.get(`/estoques/${estoqueId}/alertas`);
  return response.data;
}
```

---

## 6. Hook useEstoque

### 6.1 Implementação (`src/hooks/useEstoque.ts`)

```typescript
import { useCallback, useEffect, useState } from 'react';
import * as estoqueService from '../services/estoque.service';
import { getItens, getAlertas, Alerta } from '../services/item.service';

interface Summary {
  ativos: number;
  vencendo: number;
  vencidos: number;
}

export function useEstoque() {
  const [estoque, setEstoque] = useState<estoqueService.Estoque | null>(null);
  const [estoques, setEstoques] = useState<estoqueService.Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    ativos: 0,
    vencendo: 0,
    vencidos: 0,
  });
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  const fetchData = useCallback(async (estoqueId: string) => {
    const [itensRes, alertasRes] = await Promise.all([
      getItens(estoqueId),
      getAlertas(estoqueId),
    ]);

    const ativos = itensRes.itens.filter((i) => i.status === 'ATIVO').length;
    const vencendo = alertasRes.filter(
      (a) => a.status === 'URGENTE' || a.status === 'ATENCAO'
    ).length;
    const vencidos = alertasRes.filter(
      (a) => a.status === 'VENCIDO'
    ).length;

    setSummary({ ativos, vencendo, vencidos });
    setAlertas(alertasRes);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const lista = await estoqueService.getEstoques();
        setEstoques(lista);

        if (lista.length > 0) {
          const primeiro = lista[0];
          setEstoque(primeiro);
          await fetchData(primeiro.id);
        }
      } catch (error) {
        console.error('Erro ao carregar estoque:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    if (estoque) {
      await fetchData(estoque.id);
    }
  }, [estoque, fetchData]);

  return { estoque, estoques, loading, refresh, summary, alertas };
}
```

**Comportamento:**

* **Ao montar:** busca lista de estoques, seleciona o primeiro como ativo
* **fetchData:** busca itens e alertas em paralelo (`Promise.all`), calcula summary
* **refresh:** recarrega dados do estoque ativo (pull-to-refresh)
* **Retorna:** `{ estoque, estoques, loading, refresh, summary, alertas }`

---

## Resultado da Etapa 14

✅ Dashboard funcional com dados reais da API
✅ Header exibe nome do estoque ativo e título "Meu Estoque"
✅ 3 SummaryCards com borda lateral colorida: Itens Ativos, Vencendo, Vencidos
✅ AlertPreviewList com top 3 alertas (dot colorido + nome + dias restantes)
✅ Estado vazio com ícone checkmark verde e "Tudo em dia!"
✅ FAB circular teal navega para scanner QR
✅ Pull-to-refresh via ScrollView + RefreshControl
✅ Serviços completos: estoque.service.ts e item.service.ts (CRUD + alertas)
✅ Hook useEstoque com fetch paralelo, seleção automática de estoque e refresh
