import { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import {
  getItem,
  updateItem,
  type ItemEstoque,
} from '../../../src/services/item.service';
import { ItemForm } from '../../../src/components/ItemForm';
import { VersionConflictDialog } from '../../../src/components/VersionConflictDialog';
import { useCachedQuery } from '../../../src/hooks/useCachedQuery';
import { useOfflineMutation } from '../../../src/hooks/useOfflineMutation';

const CACHE_TTL = 5 * 60 * 1000;

export default function EditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate } = useOfflineMutation<any, ItemEstoque>();

  const cacheKey = `item:${id}`;
  const {
    data: item,
    loading,
    refresh,
  } = useCachedQuery<ItemEstoque>(
    cacheKey,
    () => getItem(id!),
    { ttl: CACHE_TTL, enabled: !!id },
  );

  const [saving, setSaving] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);

  async function handleSubmit(data: {
    nome: string;
    categoria: string;
    quantidade: string;
    unidade: string;
    data_validade: string;
    localizacao: string;
  }) {
    if (!id || !item) return;

    if (!data.nome.trim()) {
      Alert.alert('Erro', 'O nome do item é obrigatório');
      return;
    }

    setSaving(true);

    const updateData = {
      nome: data.nome.trim(),
      categoria: data.categoria,
      quantidade: parseFloat(data.quantidade) || item.quantidade,
      unidade: data.unidade || item.unidade,
      data_validade: data.data_validade || undefined,
      localizacao: data.localizacao || undefined,
      version: item.version,
    };

    await mutate({
      method: 'PUT',
      url: `/itens/${id}`,
      data: updateData,
      cacheKeys: [cacheKey, `items:${item.estoque_id}:ATIVO`, `dashboard-items:${item.estoque_id}`],
      description: `Editar ${item.nome}`,
      optimisticUpdate: {
        key: cacheKey,
        updater: (current: ItemEstoque) => ({
          ...current,
          nome: data.nome.trim(),
          categoria: data.categoria,
          quantidade: parseFloat(data.quantidade) || current.quantidade,
          unidade: data.unidade || current.unidade,
          data_validade: data.data_validade || current.data_validade,
          localizacao: data.localizacao || current.localizacao,
        }),
      },
      onSuccess: () => {
        setSaving(false);
        Alert.alert('Sucesso', 'Item atualizado com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      },
      onError: (error: any) => {
        setSaving(false);
        if (error?.response?.status === 409) {
          setConflictVisible(true);
        } else {
          Alert.alert('Erro', 'Não foi possível atualizar o item. Tente novamente.');
        }
      },
    });

    // For offline case, setSaving is handled by mutate completing
    setSaving(false);
  }

  async function handleConflictRefresh() {
    setConflictVisible(false);
    await refresh();
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Editar Item', headerBackTitle: 'Voltar' }} />
      {item && (
        <ItemForm
          onSubmit={handleSubmit}
          loading={saving}
          initialData={{
            nome: item.nome,
            categoria: item.categoria,
            quantidade: String(item.quantidade),
            unidade: item.unidade,
            data_validade: item.data_validade || '',
            localizacao: item.localizacao || '',
          }}
        />
      )}
      <VersionConflictDialog visible={conflictVisible} onRefresh={handleConflictRefresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
