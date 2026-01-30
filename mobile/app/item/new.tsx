import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { createItem } from '../../src/services/item.service';
import { ItemForm } from '../../src/components/ItemForm';

export default function NewItemScreen() {
  const router = useRouter();
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

    setLoading(true);
    try {
      await createItem({
        estoque_id: params.estoque_id,
        qr_code_id: params.qr_code_id,
        nome: data.nome.trim(),
        categoria: data.categoria,
        quantidade: parseFloat(data.quantidade) || 1,
        unidade: data.unidade || 'un',
        data_validade: data.data_validade || undefined,
        localizacao: data.localizacao || undefined,
      });

      Alert.alert('Sucesso', 'Item cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o item. Tente novamente.');
    } finally {
      setLoading(false);
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
