import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { ExpirationBadge } from './ExpirationBadge';
import type { ItemEstoque } from '../services/item.service';

interface ItemRowProps {
  item: ItemEstoque;
  onPress: () => void;
}

export function ItemRow({ item, onPress }: ItemRowProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftSection}>
        <Text style={styles.nome} numberOfLines={1}>
          {item.nome}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.quantidade}>
            {item.quantidade} {item.unidade}
          </Text>
          {item.categoria ? (
            <View style={styles.categoriaBadge}>
              <Text style={styles.categoriaText}>{item.categoria}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rightSection}>
        {item.status_validade ? (
          <ExpirationBadge
            statusValidade={item.status_validade}
            diasRestantes={item.dias_restantes ?? null}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nome: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  quantidade: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoriaBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  categoriaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
});
