import { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useNotifications } from '../../src/hooks/useNotifications';
import { AlertItem } from '../../src/components/AlertItem';
import type { Notificacao } from '../../src/services/notificacao.service';

type TipoNotificacao = Notificacao['tipo'];

interface AlertSection {
  tipo: TipoNotificacao;
  title: string;
  color: string;
  data: Notificacao[];
}

const SECTION_CONFIG: Record<
  TipoNotificacao,
  { title: string; color: string; order: number }
> = {
  VENCIDO: { title: 'Vencidos', color: colors.statusVencido, order: 0 },
  URGENTE: { title: 'Urgentes', color: colors.statusUrgente, order: 1 },
  AVISO: { title: 'Avisos', color: colors.statusAtencao, order: 2 },
};

export default function AlertsScreen() {
  const { notifications, loading, refresh, markRead } = useNotifications();
  const router = useRouter();

  const sections = useMemo<AlertSection[]>(() => {
    const grouped: Record<TipoNotificacao, Notificacao[]> = {
      VENCIDO: [],
      URGENTE: [],
      AVISO: [],
    };

    for (const notif of notifications) {
      if (grouped[notif.tipo]) {
        grouped[notif.tipo].push(notif);
      }
    }

    return (Object.entries(grouped) as [TipoNotificacao, Notificacao[]][])
      .filter(([, items]) => items.length > 0)
      .sort(([a], [b]) => SECTION_CONFIG[a].order - SECTION_CONFIG[b].order)
      .map(([tipo, data]) => ({
        tipo,
        title: SECTION_CONFIG[tipo].title,
        color: SECTION_CONFIG[tipo].color,
        data,
      }));
  }, [notifications]);

  const handlePress = useCallback(
    (itemId: string) => {
      router.push(`/items/${itemId}` as never);
    },
    [router],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: AlertSection }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: `${section.color}15` },
        ]}
        accessibilityRole="header"
      >
        <View
          style={[styles.sectionDot, { backgroundColor: section.color }]}
        />
        <Text style={[styles.sectionTitle, { color: section.color }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, { color: section.color }]}>
          {section.data.length}
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Notificacao }) => (
      <AlertItem
        notificacao={item}
        onMarkRead={markRead}
        onPress={handlePress}
      />
    ),
    [markRead, handlePress],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View
        style={styles.emptyContainer}
        accessibilityRole="text"
        accessibilityLabel="Nenhum alerta encontrado"
      >
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={colors.textLight}
        />
        <Text style={styles.emptyTitle}>Nenhum alerta</Text>
        <Text style={styles.emptyDescription}>
          Voce nao possui alertas no momento. Alertas de validade aparecerao
          aqui automaticamente.
        </Text>
      </View>
    );
  }, [loading]);

  if (loading && notifications.length === 0) {
    return (
      <View
        style={styles.loadingContainer}
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando alertas"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyList : styles.list
        }
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        accessibilityRole="list"
        accessibilityLabel="Lista de alertas"
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.sm,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
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
