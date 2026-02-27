import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { SyncStatus } from '@/types/models';

type SyncStatusIndicatorProps = {
  status: SyncStatus;
  queuedCount: number;
  isOnline: boolean;
};

export function SyncStatusIndicator({ status, queuedCount, isOnline }: SyncStatusIndicatorProps) {
  const config =
    status === 'syncing'
      ? { label: 'Syncing...', color: colors.warning }
      : status === 'failed'
        ? { label: `Failed (Queued: ${queuedCount})`, color: colors.danger }
        : { label: 'Synced', color: colors.success };

  return (
    <View style={[styles.wrapper, { borderColor: config.color }]}> 
      {status === 'syncing' ? <ActivityIndicator size="small" color={config.color} /> : null}
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
      {!isOnline ? <Text style={styles.offline}>Offline</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  offline: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
