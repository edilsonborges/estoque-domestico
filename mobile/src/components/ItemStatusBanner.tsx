import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface ItemStatusBannerProps {
  statusValidade: string;
  diasRestantes: number | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  OK: {
    color: '#065F46',
    bg: '#D1FAE5',
    label: 'Dentro da validade',
    icon: 'checkmark-circle',
  },
  ATENCAO: {
    color: '#92400E',
    bg: '#FEF3C7',
    label: 'Atenção - vencendo em breve',
    icon: 'alert-circle',
  },
  URGENTE: {
    color: '#9A3412',
    bg: '#FFEDD5',
    label: 'Urgente - vence muito em breve',
    icon: 'warning',
  },
  VENCIDO: {
    color: '#991B1B',
    bg: '#FEE2E2',
    label: 'Produto vencido',
    icon: 'close-circle',
  },
};

function getDiasText(dias: number | null): string {
  if (dias === null) return 'Sem data de validade';
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `${dias} dias restantes`;
}

export function ItemStatusBanner({ statusValidade, diasRestantes }: ItemStatusBannerProps) {
  const config = STATUS_CONFIG[statusValidade] || STATUS_CONFIG.OK;

  return (
    <View style={[styles.banner, { backgroundColor: config.bg }]}>
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
        size={24}
        color={config.color}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.dias, { color: config.color }]}>
          {getDiasText(diasRestantes)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 0,
  },
  textContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
  dias: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});
