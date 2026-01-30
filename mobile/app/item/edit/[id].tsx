import { useState, useEffect } from 'react';
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

export default function EditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<ItemEstoque | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);

  async function fetchItem() {
    if (!id) return;
    try {
      const data = await getItem(id);
      setItem(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o item.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItem();
  }, [id]);

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
    try {
      await updateItem(id, {
        nome: data.nome.trim(),
        categoria: data.categoria,
        quantidade: parseFloat(data.quantidade) || item.quantidade,
        unidade: data.unidade || item.unidade,
        data_validade: data.data_validade || undefined,
        localizacao: data.localizacao || undefined,
        version: item.version,
      });

      Alert.alert('Sucesso', 'Item atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setConflictVisible(true);
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o item. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConflictRefresh() {
    setConflictVisible(false);
    setLoading(true);
    await fetchItem();
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
