# **ETAPA 18 — Tela de Alertas e Notificações**

**Sistema: Estoque Doméstico Inteligente**

Esta etapa descreve a **tela de alertas** com notificações agrupadas por urgência, **badge de contagem** na tab bar e **marcação de leitura** com swipe, incluindo:

* Tela de alertas com SectionList agrupada por tipo
* Componente AlertItem com swipe e indicador de não lido
* Badge de notificações na tab bar
* Serviço de notificações com tipagem
* Hook useNotifications com atualização otimista

---

## 1. Tela de Alertas

### 1.1 `app/(tabs)/alerts.tsx`

```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AlertItem } from '../../src/components/AlertItem';
import { useNotifications } from '../../src/hooks/useNotifications';
import { colors } from '../../src/theme/colors';
import { Notificacao } from '../../src/services/notificacao.service';

type SectionType = {
  title: string;
  tipo: Notificacao['tipo'];
  color: string;
  priority: number;
  data: Notificacao[];
};

const SECTION_CONFIG: Record<
  Notificacao['tipo'],
  { title: string; color: string; priority: number }
> = {
  VENCIDO: {
    title: 'Vencidos',
    color: colors.statusVencido,
    priority: 0,
  },
  URGENTE: {
    title: 'Urgentes',
    color: colors.statusUrgente,
    priority: 1,
  },
  AVISO: {
    title: 'Avisos',
    color: colors.statusAtencao,
    priority: 2,
  },
};

export default function AlertsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
  } = useNotifications();

  const sections: SectionType[] = (['VENCIDO', 'URGENTE', 'AVISO'] as const)
    .map((tipo) => {
      const config = SECTION_CONFIG[tipo];
      const items = notifications.filter((n) => n.tipo === tipo);
      return {
        ...config,
        tipo,
        data: items,
      };
    })
    .filter((section) => section.data.length > 0)
    .sort((a, b) => a.priority - b.priority);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>Nenhum alerta</Text>
        <Text style={styles.emptySubtitle}>
          Você não possui notificações pendentes.
          Alertas de vencimento aparecerão aqui.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} />
      }
      renderSectionHeader={({ section }) => (
        <SectionHeader
          title={section.title}
          color={section.color}
          count={section.data.length}
        />
      )}
      renderItem={({ item }) => (
        <AlertItem
          notificacao={item}
          onMarkRead={() => markRead(item.id)}
        />
      )}
      stickySectionHeadersEnabled
      accessibilityRole="list"
    />
  );
}
```

**Estrutura da tela:**

* **SectionList** agrupada por tipo de notificação
* **Ordem das seções:** VENCIDO (prioridade 0) > URGENTE (prioridade 1) > AVISO (prioridade 2)
* Seções vazias são filtradas automaticamente
* **Pull-to-refresh** via `RefreshControl`
* **Loading state** — `ActivityIndicator` centralizado no carregamento inicial
* **Empty state** — ícone `notifications-off-outline` (64px) + "Nenhum alerta" + texto descritivo

---

### 1.2 Componente SectionHeader

```tsx
function SectionHeader({
  title,
  color,
  count,
}: {
  title: string;
  color: string;
  count: number;
}) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: `${color}26` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}
```

* **Fundo** — cor da seção com 15% de opacidade (sufixo hex `26`)
* **Indicador dot** — círculo preenchido com a cor da seção
* **Título** — "Vencidos", "Urgentes" ou "Avisos"
* **Contagem** — número de notificações na seção

---

### 1.3 Cores das Seções

| Tipo | Cor | Título |
|------|-----|--------|
| VENCIDO | `statusVencido` (vermelho) | Vencidos |
| URGENTE | `statusUrgente` (laranja) | Urgentes |
| AVISO | `statusAtencao` (amarelo) | Avisos |

---

## 2. Componente AlertItem

### 2.1 `src/components/AlertItem.tsx`

```tsx
import { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Notificacao } from '../services/notificacao.service';
import { colors } from '../theme/colors';
import { formatTimeAgo } from '../utils/date';

interface AlertItemProps {
  notificacao: Notificacao;
  onMarkRead: () => void;
}

const TIPO_COLORS: Record<Notificacao['tipo'], string> = {
  VENCIDO: colors.statusVencido,
  URGENTE: colors.statusUrgente,
  AVISO: colors.statusAtencao,
};

export function AlertItem({ notificacao, onMarkRead }: AlertItemProps) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const color = TIPO_COLORS[notificacao.tipo];

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) > 10,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -80) {
        onMarkRead();
      }
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  const handlePress = () => {
    if (notificacao.item_id) {
      router.push(`/item/${notificacao.item_id}`);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.swipeAction}>
        <Ionicons name="checkmark" size={24} color="#fff" />
        <Text style={styles.swipeText}>Lida</Text>
      </View>

      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.border, { backgroundColor: color }]} />

        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Alerta: ${notificacao.mensagem}`}
        >
          <View style={styles.header}>
            <Text style={styles.message} numberOfLines={2}>
              {notificacao.mensagem}
            </Text>
            {!notificacao.lida && (
              <View
                style={[styles.unreadDot, { backgroundColor: color }]}
                accessibilityLabel="Não lida"
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.time}>
              {formatTimeAgo(notificacao.criada_em)}
            </Text>
            {notificacao.item_nome && (
              <Text style={styles.itemName}>
                {notificacao.item_nome}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.markReadButton}
            onPress={onMarkRead}
            accessibilityRole="button"
            accessibilityLabel="Marcar como lida"
          >
            <Text style={styles.markReadText}>Lida</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
```

**Funcionalidades:**

* **Card** com borda esquerda colorida de acordo com o tipo da notificação
* **Conteúdo** — mensagem (máximo 2 linhas), tempo em português (ex.: "há 2 horas"), nome do item
* **Indicador de não lida** — círculo colorido (`unreadDot`) quando `lida === false`
* **Swipe left** via `PanResponder` — revela ação "Lida"; se `dx < -80`, executa `onMarkRead`
* **Botão inline "Lida"** — alternativa acessível ao swipe
* **Tap** — navega para a tela de detalhe do item (`/item/[itemId]`)
* Spring animation retorna o card à posição original após o swipe

---

### 2.2 Utilitário `formatTimeAgo`

```typescript
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
  if (diffDias < 30) return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
  return `há ${Math.floor(diffDias / 30)} mês(es)`;
}
```

Formata datas em texto relativo em português: "agora", "há 5 min", "há 2 horas", "há 3 dias", "há 1 mês(es)".

---

## 3. Componente NotificationBadge

### 3.1 `src/components/NotificationBadge.tsx`

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <View
      style={styles.badge}
      accessibilityLabel={`${count} notificações não lidas`}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
```

* **Badge circular vermelho** sobreposto ao ícone da tab
* **Contagem** — exibe o número, limitado a "99+" para valores maiores que 99
* **Retorna null** quando `count === 0` (badge invisível)
* `accessibilityLabel` com contagem precisa e `accessibilityRole="text"`

---

## 4. Serviço de Notificações

### 4.1 `src/services/notificacao.service.ts`

```typescript
import { api } from './api';

export interface Notificacao {
  id: string;
  usuario_id: string;
  item_id: string;
  item_nome?: string;
  tipo: 'AVISO' | 'URGENTE' | 'VENCIDO';
  mensagem: string;
  lida: boolean;
  criada_em: string;
}

interface NotificacoesResponse {
  notificacoes: Notificacao[];
  total: number;
  naoLidas: number;
}

export async function getNotificacoes(
  params?: Record<string, string>
): Promise<NotificacoesResponse> {
  const response = await api.get('/notificacoes', { params });
  return response.data;
}

export async function markAsRead(id: string): Promise<void> {
  await api.post(`/notificacoes/${id}/lida`);
}
```

* **Notificacao** — interface com `tipo` tipado como union literal `'AVISO' | 'URGENTE' | 'VENCIDO'`
* **getNotificacoes(params?)** — `GET /notificacoes`, retorna `{ notificacoes, total, naoLidas }`
* **markAsRead(id)** — `POST /notificacoes/:id/lida`, marca a notificação como lida

---

## 5. Hook useNotifications

### 5.1 `src/hooks/useNotifications.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  Notificacao,
  getNotificacoes,
  markAsRead,
} from '../services/notificacao.service';

interface UseNotificationsReturn {
  notifications: Notificacao[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  markRead: (id: string) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotificacoes();
      setNotifications(data.notificacoes);
      setUnreadCount(data.naoLidas);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(
    (id: string) => {
      // Atualização otimista: remove da lista local imediatamente
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Chama API em background
      markAsRead(id).catch(() => {
        // Em caso de erro, recarrega a lista completa
        fetchNotifications();
      });
    },
    [fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markRead,
  };
}
```

**Comportamento do hook:**

* **Fetch on mount** — busca notificações ao montar o componente
* **markRead (otimista):**
  1. Remove a notificação da lista local imediatamente
  2. Decrementa `unreadCount` localmente
  3. Chama `markAsRead(id)` na API em background
  4. Em caso de falha: recarrega a lista completa do servidor
* **Retorno** — `{ notifications, unreadCount, loading, error, refresh, markRead }`

---

## Resultado da Etapa 18

✅ Tela de alertas com `SectionList` agrupada por tipo (VENCIDO > URGENTE > AVISO)
✅ Cabeçalhos de seção com cor de fundo (15% opacity), dot, título e contagem
✅ Empty state com ícone `notifications-off-outline` e textos descritivos
✅ `AlertItem` com borda colorida, mensagem, tempo relativo e nome do item
✅ Indicador de não lida (dot colorido) quando `lida === false`
✅ Swipe left via `PanResponder` para marcar como lida + botão inline acessível
✅ Tap no alerta navega para detalhe do item (`/item/[itemId]`)
✅ `NotificationBadge` com contagem (máx "99+"), retorna null quando `count === 0`
✅ Serviço tipado com interface `Notificacao` e tipo literal para `tipo`
✅ Hook `useNotifications` com atualização otimista e fallback em caso de erro
