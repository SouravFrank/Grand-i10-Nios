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
  const recordedDate = latestEntry ? dayjs(latestEntry.createdAt).format(INDIA_DATE_FORMAT) : 'No records yet';
  const recordedBy = latestEntry?.userName ? latestEntry.userName.toUpperCase() : 'N/A';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.sectionBadge,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST ODOMETER</Text>
        </View>
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

      <View
        style={[
          styles.heroPanel,
          
        ]}>
        <View style={styles.heroRow}>
          <View style={styles.odometerWrap}>
            <Text style={[styles.odometer, { color: colors.textPrimary }]}>{latestEntry ? latestEntry.odometer : '--'}</Text>
          </View>
          <View style={[styles.unitBadge, { backgroundColor: colors.invertedBackground }]}>
            <Text style={[styles.unitLabel, { color: colors.invertedText }]}>KM</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaChip,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}>
          <MaterialIcons name="calendar-today" size={16} color={colors.textSecondary} />
          <View style={styles.metaContent}>
            <Text style={[styles.metaChipLabel, { color: colors.textSecondary }]}>Recorded</Text>
            <Text style={[styles.metaChipValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {recordedDate}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.metaChip,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}>
          <MaterialIcons name="person-outline" size={18} color={colors.textSecondary} />
          <View style={styles.metaContent}>
            <Text style={[styles.metaChipLabel, { color: colors.textSecondary }]}>Last entry by</Text>
            <Text style={[styles.metaChipValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {recordedBy}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.statusStrip,
        ]}>
        <SyncStatusIndicator
          status={syncStatus}
          queuedCount={queuedCount}
          isOnline={isOnline}
          lastSyncError={lastSyncError}
          onRetry={syncStatus === 'failed' ? onRetrySync : undefined}
        />
      </View>
      {/* {syncStatus === 'failed' && lastSyncError ? (
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{lastSyncError}</Text>
      ) : null} */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  syncButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPanel: {
    // borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  odometerWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  odometer: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 38,
  },
  heroCaption: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  unitBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metaChipLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  metaChipValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusStrip: {
    // borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
