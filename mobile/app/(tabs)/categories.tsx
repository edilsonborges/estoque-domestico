import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { api } from '../../src/services/api';
import { CategoryCard } from '../../src/components/CategoryCard';

interface ItemEstoque {
  id: string;
  nome: string;
  categoria?: string;
  status: string;
}

interface CategoryGroup {
  categoria: string;
  count: number;
}

const FALLBACK_CATEGORY = 'Outros';

export default function CategoriesScreen() {
  const [items, setItems] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ItemEstoque[]>('/itens', {
        params: { status: 'ATIVO' },
      });
      setItems(data);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const categories = useMemo<CategoryGroup[]>(() => {
    const grouped: Record<string, number> = {};

    for (const item of items) {
      const cat = item.categoria || FALLBACK_CATEGORY;
      grouped[cat] = (grouped[cat] || 0) + 1;
    }

    return Object.entries(grouped)
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const handleCategoryPress = useCallback(
    (categoria: string) => {
      router.push(`/items?categoria=${encodeURIComponent(categoria)}` as never);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: CategoryGroup }) => (
      <CategoryCard
        categoria={item.categoria}
        count={item.count}
        onPress={() => handleCategoryPress(item.categoria)}
      />
    ),
    [handleCategoryPress],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View
        style={styles.emptyContainer}
        accessibilityRole="text"
        accessibilityLabel="Nenhuma categoria encontrada"
      >
        <Ionicons
          name="grid-outline"
          size={64}
          color={colors.textLight}
        />
        <Text style={styles.emptyTitle}>Nenhuma categoria</Text>
        <Text style={styles.emptyDescription}>
          Adicione itens ao seu estoque para ver as categorias aqui.
        </Text>
      </View>
    );
  }, [loading]);

  if (loading && items.length === 0) {
    return (
      <View
        style={styles.loadingContainer}
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando categorias"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.categoria}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={
          categories.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchItems}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        accessibilityRole="list"
        accessibilityLabel="Lista de categorias"
      />
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
  list: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
