# **ETAPA 17 — Tela de Detalhe do Item + Ações Rápidas**

**Sistema: Estoque Doméstico Inteligente**

Esta etapa descreve a **tela de detalhe do item** com informações completas, **ações rápidas** (consumir, descartar, editar) e **tratamento de conflito de versão**, incluindo:

* Tela de detalhe com dados do item e banner de status
* Botões de ação rápida com modais de consumo e descarte
* Tela de edição com lock otimista
* Componentes visuais: banner, botões, modais e diálogo de conflito

---

## 1. Tela de Detalhe do Item

### 1.1 `app/item/[id].tsx`

```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getItem, consumeItem, discardItem } from '../../src/services/item.service';
import { ItemStatusBanner } from '../../src/components/ItemStatusBanner';
import { QuickActionButton } from '../../src/components/QuickActionButton';
import { ConsumeModal } from '../../src/components/ConsumeModal';
import { DiscardModal } from '../../src/components/DiscardModal';
import { VersionConflictDialog } from '../../src/components/VersionConflictDialog';
import { colors } from '../../src/theme/colors';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      const data = await getItem(id);
      setItem(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o item.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const handleConsume = async (quantidade: number, observacao?: string) => {
    try {
      await consumeItem(id, {
        quantidade,
        version: item.version,
        observacao,
      });
      setShowConsumeModal(false);
      await fetchItem();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setShowConsumeModal(false);
        setShowConflict(true);
      } else {
        Alert.alert('Erro', 'Não foi possível consumir o item.');
      }
    }
  };

  const handleDiscard = async (observacao?: string) => {
    try {
      await discardItem(id, {
        version: item.version,
        observacao,
      });
      setShowDiscardModal(false);
      await fetchItem();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setShowDiscardModal(false);
        setShowConflict(true);
      } else {
        Alert.alert('Erro', 'Não foi possível descartar o item.');
      }
    }
  };

  const handleReload = () => {
    setShowConflict(false);
    fetchItem();
  };

  if (!item) return null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          fetchItem();
        }} />
      }
    >
      <ItemStatusBanner
        dataValidade={item.data_validade}
        status={item.status}
      />

      <View style={styles.infoSection}>
        <InfoRow label="Nome" value={item.nome} />
        <InfoRow
          label="Quantidade"
          value={`${item.quantidade} ${item.unidade}`}
        />
        <InfoRow label="Categoria" value={item.categoria} />
        <InfoRow label="Localização" value={item.localizacao} />
        <InfoRow label="Data de Compra" value={item.data_compra} />
        <InfoRow label="Data de Validade" value={item.data_validade} />
        <InfoRow label="Status" value={item.status} />
      </View>

      <View style={styles.actionsRow}>
        <QuickActionButton
          icon="nutrition-outline"
          label="Consumir"
          color={colors.success}
          onPress={() => setShowConsumeModal(true)}
        />
        <QuickActionButton
          icon="trash-outline"
          label="Descartar"
          color={colors.danger}
          onPress={() => setShowDiscardModal(true)}
        />
        <QuickActionButton
          icon="create-outline"
          label="Editar"
          color={colors.info}
          onPress={() => router.push(`/item/edit/${id}`)}
        />
      </View>

      <ConsumeModal
        visible={showConsumeModal}
        maxQuantity={item.quantidade}
        onConfirm={handleConsume}
        onCancel={() => setShowConsumeModal(false)}
      />

      <DiscardModal
        visible={showDiscardModal}
        itemName={item.nome}
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />

      <VersionConflictDialog
        visible={showConflict}
        onReload={handleReload}
      />
    </ScrollView>
  );
}
```

**Estrutura da tela:**

* **ScrollView** com `RefreshControl` para pull-to-refresh
* **ItemStatusBanner** — banner colorido no topo indicando status de validade
* **Seção de informações** — linhas rotuladas com `label: value`
* **3 QuickActionButtons** em linha horizontal:
  * Consumir (verde) — abre `ConsumeModal`
  * Descartar (vermelho) — abre `DiscardModal`
  * Editar (azul) — navega para `/item/edit/[id]`
* **Modais** e **diálogo de conflito** controlados por estados booleanos
* Após consumo/descarte bem-sucedido: recarrega dados via `fetchItem()`
* Em caso de HTTP 409: fecha o modal ativo e exibe `VersionConflictDialog`

---

## 2. Tela de Edição

### 2.1 `app/item/edit/[id].tsx`

```tsx
import { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ItemForm } from '../../../src/components/ItemForm';
import { VersionConflictDialog } from '../../../src/components/VersionConflictDialog';
import { getItem, updateItem } from '../../../src/services/item.service';
import { colors } from '../../../src/theme/colors';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConflict, setShowConflict] = useState(false);

  const fetchItem = async () => {
    try {
      const data = await getItem(id);
      setItem(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      await updateItem(id, {
        ...formData,
        version: item.version,
      });
      Alert.alert('Sucesso', 'Item atualizado com sucesso!');
      router.back();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setShowConflict(true);
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o item.');
      }
    }
  };

  const handleReload = () => {
    setShowConflict(false);
    setLoading(true);
    fetchItem();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ItemForm
        initialData={{
          nome: item.nome,
          categoria: item.categoria,
          quantidade: String(item.quantidade),
          unidade: item.unidade,
          data_validade: item.data_validade,
          localizacao: item.localizacao,
        }}
        onSubmit={handleSubmit}
      />

      <VersionConflictDialog
        visible={showConflict}
        onReload={handleReload}
      />
    </SafeAreaView>
  );
}
```

* Busca dados atuais do item ao montar (`useEffect` + `getItem`)
* Passa `initialData` para o `ItemForm` pré-preenchido
* No submit: envia `updateItem(id, { ...formData, version: item.version })`
* Em caso de **HTTP 409** — exibe `VersionConflictDialog`
* Ao recarregar — busca novamente os dados atualizados do servidor
* Loading state com `ActivityIndicator` centralizado

---

## 3. Componente ItemStatusBanner

### 3.1 `src/components/ItemStatusBanner.tsx`

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ItemStatusBannerProps {
  dataValidade: string;
  status: string;
}

type StatusConfig = {
  backgroundColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  textColor: string;
};

function getStatusConfig(dataValidade: string, status: string): StatusConfig {
  if (status === 'VENCIDO') {
    return {
      backgroundColor: colors.statusVencido,
      icon: 'close-circle',
      text: 'Vencido',
      textColor: '#fff',
    };
  }

  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / 86400000);

  if (diffDias <= 1) {
    return {
      backgroundColor: colors.statusUrgente,
      icon: 'warning',
      text: `Urgente — vence ${diffDias <= 0 ? 'hoje' : 'amanhã'}`,
      textColor: '#fff',
    };
  }

  if (diffDias <= 5) {
    return {
      backgroundColor: colors.statusAtencao,
      icon: 'alert-circle',
      text: `Atenção — vence em ${diffDias} dias`,
      textColor: '#000',
    };
  }

  return {
    backgroundColor: colors.statusOk,
    icon: 'checkmark-circle',
    text: `Dentro da validade (${diffDias} dias)`,
    textColor: '#fff',
  };
}

export function ItemStatusBanner({ dataValidade, status }: ItemStatusBannerProps) {
  const config = getStatusConfig(dataValidade, status);

  return (
    <View
      style={[styles.banner, { backgroundColor: config.backgroundColor }]}
      accessibilityRole="alert"
      accessibilityLabel={config.text}
    >
      <Ionicons name={config.icon} size={24} color={config.textColor} />
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.text}
      </Text>
    </View>
  );
}
```

**4 configurações de status:**

| Status | Cor de Fundo | Ícone | Texto |
|--------|-------------|-------|-------|
| OK | `statusOk` (verde) | `checkmark-circle` | "Dentro da validade (X dias)" |
| ATENCAO | `statusAtencao` (amarelo) | `alert-circle` | "Atenção — vence em X dias" |
| URGENTE | `statusUrgente` (laranja) | `warning` | "Urgente — vence hoje/amanhã" |
| VENCIDO | `statusVencido` (vermelho) | `close-circle` | "Vencido" |

* Banner em largura total, ícone Ionicons + texto + dias restantes
* `accessibilityRole="alert"` para leitores de tela

---

## 4. Componente QuickActionButton

### 4.1 `src/components/QuickActionButton.tsx`

```tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

export function QuickActionButton({
  icon,
  label,
  color,
  onPress,
}: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          borderColor: color,
          backgroundColor: `${color}1A`, // 10% opacity
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
```

* Botão arredondado com borda colorida
* Fundo com cor principal em **10% de opacidade** (sufixo `1A` no hex)
* Ícone Ionicons + texto do label
* `accessibilityRole="button"` com label descritivo

---

## 5. Componente ConsumeModal

### 5.1 `src/components/ConsumeModal.tsx`

```tsx
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

interface ConsumeModalProps {
  visible: boolean;
  maxQuantity: number;
  onConfirm: (quantidade: number, observacao?: string) => void;
  onCancel: () => void;
}

export function ConsumeModal({
  visible,
  maxQuantity,
  onConfirm,
  onCancel,
}: ConsumeModalProps) {
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const qtd = Number(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    if (qtd > maxQuantity) {
      setError(`Quantidade máxima disponível: ${maxQuantity}`);
      return;
    }
    setError('');
    onConfirm(qtd, observacao || undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Consumir Item</Text>

          <Text style={styles.label}>Quantidade</Text>
          <TextInput
            style={styles.input}
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="numeric"
            placeholder={`Máx: ${maxQuantity}`}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observacao}
            onChangeText={setObservacao}
            multiline
            placeholder="Ex: Usado no jantar"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

* **Bottom sheet** — `Modal` com overlay semi-transparente e `animationType="slide"`
* **Título** — "Consumir Item"
* **Campo quantidade** — validação: deve ser > 0 e <= quantidade disponível
* **Campo observação** — opcional, `multiline`
* **Botões** — "Cancelar" (estilo neutro) e "Confirmar" (estilo primário)
* Chama `consumeItem(id, { quantidade, version, observacao })` via callback

---

## 6. Componente DiscardModal

### 6.1 `src/components/DiscardModal.tsx`

```tsx
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface DiscardModalProps {
  visible: boolean;
  itemName: string;
  onConfirm: (observacao?: string) => void;
  onCancel: () => void;
}

export function DiscardModal({
  visible,
  itemName,
  onConfirm,
  onCancel,
}: DiscardModalProps) {
  const [observacao, setObservacao] = useState('');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Ionicons
            name="warning-outline"
            size={40}
            color={colors.danger}
          />
          <Text style={styles.title}>Descartar Item</Text>
          <Text style={styles.warning}>
            Tem certeza que deseja descartar "{itemName}"?
            Esta ação não pode ser desfeita.
          </Text>

          <Text style={styles.label}>Motivo (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observacao}
            onChangeText={setObservacao}
            multiline
            placeholder="Ex: Estragou, mau cheiro"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.discardButton}
              onPress={() => onConfirm(observacao || undefined)}
            >
              <Text style={styles.discardText}>Descartar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

* **Bottom sheet** — mesmo padrão do `ConsumeModal`
* **Ícone de aviso** — `warning-outline` em vermelho (40px)
* **Título** — "Descartar Item"
* **Texto de alerta** — confirma o nome do item e avisa que a ação é irreversível
* **Campo motivo** — opcional, `multiline`
* **Botões** — "Cancelar" e "Descartar" (estilo vermelho/danger)
* Chama `discardItem(id, { version, observacao })` via callback

---

## 7. Componente VersionConflictDialog

### 7.1 `src/components/VersionConflictDialog.tsx`

```tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface VersionConflictDialogProps {
  visible: boolean;
  onReload: () => void;
}

export function VersionConflictDialog({
  visible,
  onReload,
}: VersionConflictDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Ionicons
            name="sync-outline"
            size={48}
            color={colors.warning}
          />
          <Text style={styles.title}>Conflito de Versão</Text>
          <Text style={styles.message}>
            Este item foi atualizado por outro dispositivo.
            Os dados exibidos estão desatualizados.
          </Text>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={onReload}
            accessibilityRole="button"
            accessibilityLabel="Recarregar dados do item"
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.reloadText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

* **Modal centralizado** — overlay semi-transparente com `animationType="fade"`
* **Ícone** — `sync-outline` em amarelo/warning (48px)
* **Título** — "Conflito de Versão"
* **Texto explicativo** — "Este item foi atualizado por outro dispositivo"
* **Botão "Recarregar"** — ícone `refresh` + texto, chama o callback `onReload`
* O `onReload` recarrega os dados do item do servidor com a versão atualizada

---

## Resultado da Etapa 17

✅ Tela de detalhe com `ScrollView`, `RefreshControl` e seção de informações rotuladas
✅ `ItemStatusBanner` com 4 configurações visuais (OK, ATENCAO, URGENTE, VENCIDO)
✅ 3 botões de ação rápida: Consumir (verde), Descartar (vermelho), Editar (azul)
✅ `ConsumeModal` com validação de quantidade (> 0 e <= disponível) e observação opcional
✅ `DiscardModal` com texto de aviso, motivo opcional e confirmação
✅ `VersionConflictDialog` exibido em resposta a HTTP 409 com botão "Recarregar"
✅ Tela de edição com `ItemForm` pré-preenchido e lock otimista via campo `version`
✅ Todos os componentes com `accessibilityRole` e `accessibilityLabel`
