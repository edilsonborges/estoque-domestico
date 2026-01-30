import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useEstoque } from '../../src/hooks/useEstoque';
import { getItens, getAlertas, type Alerta } from '../../src/services/item.service';
import { SummaryCard } from '../../src/components/SummaryCard';
import { AlertPreviewList } from '../../src/components/AlertPreviewList';

export default function HomeScreen() {
  const router = useRouter();
  const { estoque, loading: estoqueLoading, refresh: refreshEstoque } = useEstoque();

  const [totalAtivos, setTotalAtivos] = useState(0);
  const [vencendoBreve, setVencendoBreve] = useState(0);
  const [vencidos, setVencidos] = useState(0);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!estoque) return;

    try {
      const [itens, alertasData] = await Promise.all([
        getItens(estoque.id, { status: 'ATIVO' }),
        getAlertas(),
      ]);

      setTotalAtivos(itens.length);

      const expiringCount = itens.filter(
        (i) => i.status_validade === 'ATENCAO' || i.status_validade === 'URGENTE',
      ).length;
      setVencendoBreve(expiringCount);

      const expiredCount = itens.filter((i) => i.status_validade === 'VENCIDO').length;
      setVencidos(expiredCount);

      setAlertas(
        alertasData.map((a) => ({
          id: a.id,
          nome: a.nome,
          dias_restantes: a.dias_restantes,
          status_validade: a.dias_restantes === null
            ? 'OK'
            : a.dias_restantes < 0
              ? 'VENCIDO'
              : a.dias_restantes <= 1
                ? 'URGENTE'
                : a.dias_restantes <= 5
                  ? 'ATENCAO'
                  : 'OK',
        })),
      );
    } catch {
      // Silently handle errors; data stays at defaults
    } finally {
      setLoadingData(false);
    }
  }, [estoque]);

  useEffect(() => {
    if (estoque) {
      fetchDashboardData();
    } else if (!estoqueLoading) {
      setLoadingData(false);
    }
  }, [estoque, estoqueLoading, fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEstoque();
    await fetchDashboardData();
    setRefreshing(false);
  }, [refreshEstoque, fetchDashboardData]);

  function handleAlertPress(id: string) {
    router.push(`/item/${id}`);
  }

  function handleScanPress() {
    router.push('/(tabs)/scan');
  }

  if (estoqueLoading || loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {estoque && (
          <Text style={styles.estoqueName}>{estoque.nome}</Text>
        )}

        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.cardsRow}>
          <SummaryCard label="Itens Ativos" value={totalAtivos} color={colors.primary} />
          <SummaryCard label="Vencendo" value={vencendoBreve} color={colors.statusAtencao} />
          <SummaryCard label="Vencidos" value={vencidos} color={colors.statusVencido} />
        </View>

        <Text style={styles.sectionTitle}>Alertas de Validade</Text>
        <AlertPreviewList alertas={alertas} onPress={handleAlertPress} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleScanPress} activeOpacity={0.8}>
        <Ionicons name="qr-code" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  estoqueName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
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
