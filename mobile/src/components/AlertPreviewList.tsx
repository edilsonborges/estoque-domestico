import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface AlertItem {
  id: string;
  nome: string;
  dias_restantes: number | null;
  status_validade: string;
}

interface AlertPreviewListProps {
  alertas: AlertItem[];
  onPress: (id: string) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OK':
      return colors.statusOk;
    case 'ATENCAO':
      return colors.statusAtencao;
    case 'URGENTE':
      return colors.statusUrgente;
    case 'VENCIDO':
      return colors.statusVencido;
    default:
      return colors.textLight;
  }
}

function getDiasLabel(dias: number | null): string {
  if (dias === null) return 'Sem data';
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

export function AlertPreviewList({ alertas, onPress }: AlertPreviewListProps) {
  const items = alertas.slice(0, 3);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle-outline" size={32} color={colors.statusOk} />
        <Text style={styles.emptyText}>Nenhum alerta de validade</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((alerta) => {
        const statusColor = getStatusColor(alerta.status_validade);
        return (
          <TouchableOpacity
            key={alerta.id}
            style={styles.row}
            onPress={() => onPress(alerta.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.indicator, { backgroundColor: statusColor }]} />
            <View style={styles.info}>
              <Text style={styles.nome} numberOfLines={1}>
                {alerta.nome}
              </Text>
              <Text style={[styles.dias, { color: statusColor }]}>
                {getDiasLabel(alerta.dias_restantes)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  nome: {
    ...typography.body,
    color: colors.text,
  },
  dias: {
    ...typography.caption,
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
