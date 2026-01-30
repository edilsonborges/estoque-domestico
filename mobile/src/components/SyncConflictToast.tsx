import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function SyncConflictToast() {
  const { conflicts, dismissConflict } = useSyncStatus();
  const current = conflicts[0];
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => dismissConflict(current.id));
    }, 5000);

    return () => clearTimeout(timer);
  }, [current?.id]);

  if (!current) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
      <Text style={styles.text} numberOfLines={2}>
        {current.description || 'Item atualizado por outro dispositivo. Dados do servidor aplicados.'}
      </Text>
      <TouchableOpacity onPress={() => dismissConflict(current.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.warning,
    borderRadius: 10,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
