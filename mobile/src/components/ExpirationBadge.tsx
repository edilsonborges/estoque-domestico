import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface ExpirationBadgeProps {
  statusValidade: string;
  diasRestantes: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  OK: '#10B981',
  ATENCAO: '#F59E0B',
  URGENTE: '#F97316',
  VENCIDO: '#EF4444',
};

function getLabel(diasRestantes: number | null): string {
  if (diasRestantes === null) return '---';
  if (diasRestantes < 0) return 'Vencido';
  if (diasRestantes === 0) return 'Hoje';
  if (diasRestantes === 1) return '1d';
  return `${diasRestantes}d`;
}

export function ExpirationBadge({ statusValidade, diasRestantes }: ExpirationBadgeProps) {
  const bgColor = STATUS_COLORS[statusValidade] || '#94A3B8';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{getLabel(diasRestantes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
