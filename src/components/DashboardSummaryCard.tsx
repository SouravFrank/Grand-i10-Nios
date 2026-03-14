import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, SyncStatus } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';

type DashboardSummaryCardProps = {
  latestEntry?: EntryRecord;
  syncStatus: SyncStatus;
  lastSyncError?: string | null;
  queuedCount: number;
  isOnline: boolean;
  onRetrySync: () => void;
};

export function DashboardSummaryCard({
  latestEntry,
  syncStatus,
  lastSyncError,
  queuedCount,
  isOnline,
  onRetrySync,
}: DashboardSummaryCardProps) {
  const { colors } = useAppTheme();
  const syncButtonDisabled = syncStatus === 'syncing';
  const syncIconName = syncStatus === 'syncing' ? 'sync' : 'refresh';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST ODOMETER</Text>
        <Pressable
          onPress={onRetrySync}
          disabled={syncButtonDisabled}
          style={[
            styles.syncButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundSecondary,
              opacity: syncButtonDisabled ? 0.55 : 1,
            },
          ]}>
          <MaterialIcons name={syncIconName} size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Text style={[styles.odometer, { color: colors.textPrimary }]}>
        {latestEntry ? `${latestEntry.odometer} km` : '-- km'}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        Date recorded: {latestEntry ? dayjs(latestEntry.createdAt).format(INDIA_DATE_FORMAT) : 'No records yet'}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}> 
        Last entry by:{' '}
        <Text style={[styles.metaHighlight, { color: colors.textPrimary }]}>
          {latestEntry?.userName ? latestEntry.userName.toUpperCase() : 'N/A'}
        </Text>
      </Text>
      <SyncStatusIndicator
        status={syncStatus}
        queuedCount={queuedCount}
        isOnline={isOnline}
        lastSyncError={lastSyncError}
        onRetry={syncStatus === 'failed' ? onRetrySync : undefined}
      />
      {/* {syncStatus === 'failed' && lastSyncError ? (
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{lastSyncError}</Text>
      ) : null} */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  odometer: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  meta: {
    fontSize: 13,
  },
  metaHighlight: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
