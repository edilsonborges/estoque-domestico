import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { Notificacao } from '../services/notificacao.service';

interface AlertItemProps {
  notificacao: Notificacao;
  onMarkRead: (id: string) => void;
  onPress: (itemId: string) => void;
}

const SWIPE_THRESHOLD = -80;

const TIPO_BORDER_COLORS: Record<Notificacao['tipo'], string> = {
  VENCIDO: colors.statusVencido,
  URGENTE: colors.statusUrgente,
  AVISO: colors.statusAtencao,
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

export function AlertItem({ notificacao, onMarkRead, onPress }: AlertItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const borderColor = TIPO_BORDER_COLORS[notificacao.tipo];

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleMarkRead = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    onMarkRead(notificacao.id);
  };

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="button"
      accessibilityLabel={`Alerta: ${notificacao.mensagem}. ${notificacao.lida ? 'Lida' : 'Nao lida'}`}
    >
      {/* Swipe-behind action */}
      {!notificacao.lida && (
        <TouchableOpacity
          style={styles.swipeAction}
          onPress={handleMarkRead}
          accessibilityLabel="Marcar como lida"
          accessibilityRole="button"
        >
          <Text style={styles.swipeActionText}>Lida</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[styles.container, { transform: [{ translateX }] }]}
        {...(notificacao.lida ? {} : panResponder.panHandlers)}
      >
        <TouchableOpacity
          style={[styles.content, { borderLeftColor: borderColor }]}
          onPress={() => onPress(notificacao.item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Ver item ${notificacao.item.nome}`}
        >
          <View style={styles.topRow}>
            <View style={styles.messageRow}>
              {!notificacao.lida && (
                <View
                  style={[styles.unreadDot, { backgroundColor: borderColor }]}
                  accessibilityLabel="Nao lida"
                />
              )}
              <Text
                style={[
                  styles.message,
                  !notificacao.lida && styles.messageUnread,
                ]}
                numberOfLines={2}
              >
                {notificacao.mensagem}
              </Text>
            </View>
            <Text style={styles.timeAgo}>
              {formatTimeAgo(notificacao.criadaEm)}
            </Text>
          </View>
          <Text style={styles.itemName} numberOfLines={1}>
            {notificacao.item.nome}
          </Text>
        </TouchableOpacity>

        {/* Inline mark-as-read button for accessibility */}
        {!notificacao.lida && (
          <TouchableOpacity
            style={[styles.markReadButton, { backgroundColor: borderColor }]}
            onPress={handleMarkRead}
            accessibilityLabel="Marcar notificacao como lida"
            accessibilityRole="button"
          >
            <Text style={styles.markReadButtonText}>Lida</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    flex: 1,
  },
  messageUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textLight,
  },
  itemName: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  markReadButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: spacing.xs,
  },
  markReadButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
