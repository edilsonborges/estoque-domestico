import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { createItem } from '../../src/services/item.service';
import { ItemForm } from '../../src/components/ItemForm';
import { useNetwork } from '../../src/hooks/useNetwork';
import { updateCacheOptimistic } from '../../src/services/cache';
import { queueMutation } from '../../src/services/sync';
import type { ItemEstoque } from '../../src/services/item.service';

export default function NewItemScreen() {
  const router = useRouter();
  const { isOnline } = useNetwork();
  const params = useLocalSearchParams<{
    qr_code_id?: string;
    estoque_id?: string;
    from_barcode?: string;
    barcode?: string;
    nome?: string;
    categoria?: string;
    quantidade?: string;
    unidade?: string;
  }>();
  const [loading, setLoading] = useState(false);

  const initialData = params.from_barcode
    ? {
        nome: params.nome || '',
        categoria: params.categoria || '',
        quantidade: params.quantidade || '1',
        unidade: params.unidade || 'un',
      }
    : undefined;

  async function handleSubmit(data: {
    nome: string;
    categoria: string;
    quantidade: string;
    unidade: string;
    data_validade: string;
    localizacao: string;
  }) {
    if (!data.nome.trim()) {
      Alert.alert('Erro', 'O nome do item é obrigatório');
      return;
    }

    if (!params.estoque_id) {
      Alert.alert('Erro', 'Estoque não identificado');
      return;
    }

    const itemData = {
      estoque_id: params.estoque_id,
      qr_code_id: params.qr_code_id,
      nome: data.nome.trim(),
      categoria: data.categoria,
      quantidade: parseFloat(data.quantidade) || 1,
      unidade: data.unidade || 'un',
      data_validade: data.data_validade || undefined,
      localizacao: data.localizacao || undefined,
    };

    setLoading(true);

    if (isOnline) {
      try {
        await createItem(itemData);
        Alert.alert('Sucesso', 'Item cadastrado com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Erro', 'Não foi possível cadastrar o item. Tente novamente.');
      } finally {
        setLoading(false);
      }
    } else {
      // Offline: create temp item in cache + queue
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const tempItem: ItemEstoque = {
        id: tempId,
        estoque_id: params.estoque_id,
        qr_code_id: params.qr_code_id,
        nome: data.nome.trim(),
        categoria: data.categoria,
        quantidade: parseFloat(data.quantidade) || 1,
        unidade: data.unidade || 'un',
        data_validade: data.data_validade || undefined,
        localizacao: data.localizacao || undefined,
        status: 'ATIVO',
        version: 0,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      // Add to items cache optimistically
      const cacheKey = `items:${params.estoque_id}:ATIVO`;
      await updateCacheOptimistic<ItemEstoque[]>(cacheKey, (current) =>
        current ? [tempItem, ...current] : [tempItem],
      );

      await queueMutation({
        method: 'POST',
        url: '/itens',
        data: itemData,
        cacheKeys: [cacheKey, `dashboard-items:${params.estoque_id}`],
        description: `Cadastrar ${data.nome.trim()}`,
      });

      setLoading(false);
      Alert.alert(
        'Salvo offline',
        'Será sincronizado quando houver conexão.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: params.from_barcode ? 'Novo Item (Código de Barras)' : 'Novo Item',
          headerBackTitle: 'Voltar',
        }}
      />
      <ItemForm onSubmit={handleSubmit} loading={loading} initialData={initialData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
