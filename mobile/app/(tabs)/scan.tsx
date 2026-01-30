import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useEstoque } from '../../src/hooks/useEstoque';
import { resolveQr } from '../../src/services/qr.service';

export default function ScanScreen() {
  const router = useRouter();
  const { estoque } = useEstoque();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    if (!codigo.trim()) {
      Alert.alert('Erro', 'Insira o código QR');
      return;
    }

    if (!estoque) {
      Alert.alert('Erro', 'Nenhum estoque selecionado');
      return;
    }

    setLoading(true);
    try {
      const result = await resolveQr(codigo.trim(), estoque.id);

      if (result.status === 'EXISTENTE') {
        router.push(`/item/${result.item.id}`);
      } else {
        router.push(`/item/new?qr_code_id=${result.qr_code_id}&estoque_id=${estoque.id}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível resolver o QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.scanArea}>
        <Ionicons name="qr-code-outline" size={120} color={colors.textLight} />
        <Text style={styles.instruction}>Aponte para um QR Code</Text>
        <Text style={styles.subInstruction}>
          Ou insira o código manualmente abaixo
        </Text>
      </View>

      <View style={styles.manualSection}>
        <Text style={styles.label}>Código QR (manual)</Text>
        <TextInput
          style={styles.input}
          value={codigo}
          onChangeText={setCodigo}
          placeholder="Ex: f9a8c2e1-1c4d-4d5b-b2f4-3f2a9c18a111"
          placeholderTextColor={colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResolve}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Resolver QR</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  instruction: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subInstruction: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  manualSection: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
});
