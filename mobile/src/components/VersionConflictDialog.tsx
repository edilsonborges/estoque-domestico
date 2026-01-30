import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface VersionConflictDialogProps {
  visible: boolean;
  onRefresh: () => void;
}

export function VersionConflictDialog({ visible, onRefresh }: VersionConflictDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRefresh}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Ionicons name="sync-circle" size={48} color={colors.warning} />
          <Text style={styles.title}>Conflito de versão</Text>
          <Text style={styles.message}>
            Este item foi atualizado por outro dispositivo. Os dados exibidos estão
            desatualizados. Recarregue para ver a versão mais recente.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onRefresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
});
