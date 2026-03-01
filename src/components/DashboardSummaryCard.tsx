import { StyleSheet, Text, View } from 'react-native';

import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, SyncStatus } from '@/types/models';
import { dayjs } from '@/utils/day';

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

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST ODOMETER</Text>
      <Text style={[styles.odometer, { color: colors.textPrimary }]}>
        {latestEntry ? `${latestEntry.odometer} km` : '-- km'}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        Date recorded: {latestEntry ? dayjs(latestEntry.createdAt).format('DD MMM YYYY') : 'No records yet'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 14,
    gap: 7,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
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
});
