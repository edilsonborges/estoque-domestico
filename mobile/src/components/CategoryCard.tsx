import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface CategoryCardProps {
  categoria: string;
  count: number;
  onPress: () => void;
}

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  Frutas: { emoji: '\uD83C\uDF4E', color: '#EF4444' },
  Verduras: { emoji: '\uD83E\uDD66', color: '#22C55E' },
  Carnes: { emoji: '\uD83E\uDD69', color: '#DC2626' },
  Laticinios: { emoji: '\uD83E\uDDC0', color: '#F59E0B' },
  Bebidas: { emoji: '\uD83E\uDD64', color: '#3B82F6' },
  Graos: { emoji: '\uD83C\uDF3E', color: '#D97706' },
  Congelados: { emoji: '\u2744\uFE0F', color: '#06B6D4' },
  Temperos: { emoji: '\uD83C\uDF36\uFE0F', color: '#F97316' },
  Padaria: { emoji: '\uD83C\uDF5E', color: '#92400E' },
  Limpeza: { emoji: '\uD83E\uDDF9', color: '#8B5CF6' },
  Higiene: { emoji: '\uD83E\uDDF4', color: '#EC4899' },
  Enlatados: { emoji: '\uD83E\uDD6B', color: '#6B7280' },
};

const DEFAULT_CONFIG = { emoji: '\uD83D\uDCE6', color: colors.primary };

export function CategoryCard({ categoria, count, onPress }: CategoryCardProps) {
  const config = CATEGORY_CONFIG[categoria] || DEFAULT_CONFIG;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Categoria ${categoria}, ${count} ${count === 1 ? 'item' : 'itens'}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {categoria}
      </Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'item' : 'itens'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
