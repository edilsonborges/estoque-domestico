import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useEstoque } from '../../src/hooks/useEstoque';
import { useItems } from '../../src/hooks/useItems';
import { ItemRow } from '../../src/components/ItemRow';
import { EmptyState } from '../../src/components/EmptyState';
import type { ItemEstoque } from '../../src/services/item.service';

type TabKey = 'estoque' | 'arquivo';

export default function ItemsScreen() {
  const router = useRouter();
  const { estoque, loading: estoqueLoading } = useEstoque();
  const [activeTab, setActiveTab] = useState<TabKey>('estoque');

  const isArchive = activeTab === 'arquivo';
  const { items, loading, refresh, total } = useItems(estoque?.id, {
    arquivados: isArchive,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  function handleItemPress(item: ItemEstoque) {
    router.push(`/item/${item.id}`);
  }

  function handleAddPress() {
    router.push('/(tabs)/scan');
  }

  function renderItem({ item }: { item: ItemEstoque }) {
    return <ItemRow item={item} onPress={() => handleItemPress(item)} />;
  }

  if (estoqueLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'estoque' && styles.tabActive]}
          onPress={() => setActiveTab('estoque')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'estoque' && styles.tabTextActive]}>
            Estoque
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'arquivo' && styles.tabActive]}
          onPress={() => setActiveTab('arquivo')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'arquivo' && styles.tabTextActive]}>
            Arquivo
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={isArchive ? 'archive-outline' : 'basket-outline'}
          message={
            isArchive
              ? 'Nenhum item arquivado'
              : 'Nenhum item no estoque. Escaneie um QR Code para começar!'
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isArchive && (
        <TouchableOpacity style={styles.fab} onPress={handleAddPress} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
