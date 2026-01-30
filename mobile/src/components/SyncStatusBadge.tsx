import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../hooks/useNetwork';
import { colors } from '../theme/colors';

export function SyncStatusBadge() {
  const { pendingSyncCount } = useNetwork();

  if (pendingSyncCount === 0) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.warning,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
