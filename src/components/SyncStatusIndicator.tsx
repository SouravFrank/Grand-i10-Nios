import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import type { SyncStatus } from '@/types/models';

type SyncStatusIndicatorProps = {
  status: SyncStatus;
  queuedCount: number;
  isOnline: boolean;
  lastSyncError?: string | null;
  onRetry?: () => void;
};

export function SyncStatusIndicator({ status, queuedCount, isOnline, lastSyncError, onRetry }: SyncStatusIndicatorProps) {
  const { colors } = useAppTheme();
  const syncNotConfigured = status === 'failed' && (lastSyncError ?? '').toLowerCase().includes('not configured');

  const label = (() => {
    if (!isOnline && queuedCount > 0) {
      return `Offline - Pending ${queuedCount} ${queuedCount > 1 ? 'entries' : 'entry'}`;
    }

    if (status === 'syncing') {
      return 'Syncing...';
    }

    if (status === 'failed') {
      if (syncNotConfigured) {
        return 'Sync not configured';
      }
      return 'Sync Failed';
    }

    return 'Synced';
  })();

  const dotColor = (() => {
    if (!isOnline && queuedCount > 0) {
      return '#F9A825';
    }
    if (status === 'syncing') {
      return '#F9A825';
    }
    if (status === 'failed') {
      return '#D93025';
    }
    return '#2E7D32';
  })();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: dotColor }]}>{label}</Text>
      {status === 'failed' && onRetry && !syncNotConfigured ? (
        <Pressable onPress={onRetry}>
          <Text style={[styles.retry, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>Retry Sync</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  retry: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
