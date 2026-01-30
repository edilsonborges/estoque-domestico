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
import { lookupBarcode } from '../../src/services/barcode.service';
import { BarcodeCamera } from '../../src/components/BarcodeCamera';

type ScanMode = 'qr' | 'barcode';

export default function ScanScreen() {
  const router = useRouter();
  const { estoque } = useEstoque();
  const [mode, setMode] = useState<ScanMode>('qr');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // ── QR Code flow (existing) ──────────────────────
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

  // ── Barcode flow (new) ───────────────────────────
  async function handleBarcodeScan(barcode: string) {
    setCameraActive(false);

    if (!estoque) {
      Alert.alert('Erro', 'Nenhum estoque selecionado');
      return;
    }

    setLoading(true);
    try {
      const result = await lookupBarcode(barcode);

      if (result.found) {
        const params = new URLSearchParams({
          estoque_id: estoque.id,
          from_barcode: '1',
          barcode: result.barcode,
        });
        if (result.nome) params.set('nome', result.nome);
        if (result.categoria) params.set('categoria', result.categoria);
        if (result.quantidade) params.set('quantidade', result.quantidade);
        if (result.unidade) params.set('unidade', result.unidade);

        router.push(`/item/new?${params.toString()}`);
      } else {
        Alert.alert(
          'Produto não encontrado',
          'O código de barras não foi encontrado na base de dados. Você pode preencher os dados manualmente.',
          [
            {
              text: 'Preencher manualmente',
              onPress: () =>
                router.push(
                  `/item/new?estoque_id=${estoque.id}&from_barcode=1&barcode=${barcode}`,
                ),
            },
            {
              text: 'Escanear novamente',
              onPress: () => setCameraActive(true),
            },
          ],
        );
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível consultar o produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // ── Camera overlay ───────────────────────────────
  if (cameraActive) {
    return (
      <BarcodeCamera
        onBarcodeScanned={handleBarcodeScan}
        onClose={() => setCameraActive(false)}
      />
    );
  }

  // ── Main screen ──────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleTab, mode === 'qr' && styles.toggleTabActive]}
          onPress={() => setMode('qr')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={mode === 'qr' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[styles.toggleText, mode === 'qr' && styles.toggleTextActive]}>
            QR Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTab, mode === 'barcode' && styles.toggleTabActive]}
          onPress={() => setMode('barcode')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="barcode-outline"
            size={18}
            color={mode === 'barcode' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[styles.toggleText, mode === 'barcode' && styles.toggleTextActive]}>
            Código de Barras
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'qr' ? (
        /* ── QR Mode ── */
        <>
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
        </>
      ) : (
        /* ── Barcode Mode ── */
        <>
          <View style={styles.scanArea}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.instruction}>Consultando produto...</Text>
              </>
            ) : (
              <>
                <Ionicons name="barcode-outline" size={120} color={colors.textLight} />
                <Text style={styles.instruction}>Escanear Código de Barras</Text>
                <Text style={styles.subInstruction}>
                  Escaneie o código de barras do produto para identificá-lo automaticamente
                </Text>
              </>
            )}
          </View>

          <View style={styles.manualSection}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => setCameraActive(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Abrir Câmera</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 3,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    gap: spacing.xs,
  },
  toggleTabActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    paddingHorizontal: spacing.lg,
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
