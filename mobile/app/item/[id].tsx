import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import {
  getItem,
  consumeItem,
  discardItem,
  type ItemEstoque,
} from '../../src/services/item.service';
import { ItemStatusBanner } from '../../src/components/ItemStatusBanner';
import { QuickActionButton } from '../../src/components/QuickActionButton';
import { ConsumeModal } from '../../src/components/ConsumeModal';
import { DiscardModal } from '../../src/components/DiscardModal';
import { VersionConflictDialog } from '../../src/components/VersionConflictDialog';

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<ItemEstoque | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [consumeVisible, setConsumeVisible] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getItem(id);
      setItem(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o item.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItem();
    setRefreshing(false);
    setConflictVisible(false);
  }, [fetchItem]);

  async function handleConsume(quantidade: number, _observacao: string) {
    if (!id) return;
    try {
      const updated = await consumeItem(id, { quantidade });
      setItem(updated);
      setConsumeVisible(false);
      Alert.alert('Sucesso', 'Consumo registrado!');
    } catch (error: any) {
      setConsumeVisible(false);
      if (error?.response?.status === 409) {
        setConflictVisible(true);
      } else {
        Alert.alert('Erro', 'Não foi possível registrar o consumo.');
      }
    }
  }

  async function handleDiscard(motivo: string) {
    if (!id) return;
    try {
      await discardItem(id, { motivo });
      setDiscardVisible(false);
      Alert.alert('Sucesso', 'Item descartado!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      setDiscardVisible(false);
      if (error?.response?.status === 409) {
        setConflictVisible(true);
      } else {
        Alert.alert('Erro', 'Não foi possível descartar o item.');
      }
    }
  }

  function handleEdit() {
    if (!id) return;
    router.push(`/item/edit/${id}`);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Item não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: item.nome, headerBackTitle: 'Voltar' }} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {item.status_validade && (
          <ItemStatusBanner
            statusValidade={item.status_validade}
            diasRestantes={item.dias_restantes ?? null}
          />
        )}

        <View style={styles.infoSection}>
          <InfoRow label="Nome" value={item.nome} />
          <InfoRow label="Quantidade" value={`${item.quantidade} ${item.unidade}`} />
          <InfoRow label="Categoria" value={item.categoria} />
          <InfoRow label="Localização" value={item.localizacao || '---'} />
          <InfoRow label="Data de Compra" value={item.data_compra || '---'} />
          <InfoRow label="Data de Validade" value={item.data_validade || '---'} />
          <InfoRow label="Status" value={item.status} />
        </View>

        {item.status === 'ATIVO' && (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Ações</Text>
            <View style={styles.actionsRow}>
              <QuickActionButton
                icon="remove-circle-outline"
                label="Consumir"
                color={colors.statusOk}
                onPress={() => setConsumeVisible(true)}
              />
              <QuickActionButton
                icon="trash-outline"
                label="Descartar"
                color={colors.statusVencido}
                onPress={() => setDiscardVisible(true)}
              />
              <QuickActionButton
                icon="create-outline"
                label="Editar"
                color={colors.primary}
                onPress={handleEdit}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <ConsumeModal
        visible={consumeVisible}
        item={item}
        onConfirm={handleConsume}
        onClose={() => setConsumeVisible(false)}
      />

      <DiscardModal
        visible={discardVisible}
        item={item}
        onConfirm={handleDiscard}
        onClose={() => setDiscardVisible(false)}
      />

      <VersionConflictDialog visible={conflictVisible} onRefresh={onRefresh} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  actionsSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
  },
});
