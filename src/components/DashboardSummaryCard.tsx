import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, SyncStatus } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import { getEntryOwnerName } from '@/utils/entryOwnership';

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
  
  const isSyncing = syncStatus === 'syncing';
  const recordedDate = latestEntry ? dayjs(latestEntry.createdAt).format(INDIA_DATE_FORMAT) : 'No records yet';
  const recordedBy = latestEntry ? getEntryOwnerName(latestEntry).toUpperCase() : 'N/A';

  // Animations
  const slideY = useRef(new Animated.Value(20)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Creative Odometer Highlight Animation
  const highlightScale = useRef(new Animated.Value(0.95)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();

    // Creative "Scanner" border highlight around the odometer reading
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(highlightScale, { toValue: 1.05, useNativeDriver: true, tension: 40, friction: 5 }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(highlightOpacity, { toValue: 0, duration: 600, useNativeDriver: true, delay: 200 }),
    ]).start();
  }, [slideY, fadeIn, highlightScale, highlightOpacity]);

  // Sync icon spinning animation
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateY: slideY }],
          opacity: fadeIn,
        },
      ]}
    >
      {/* Header: Title + Compact Sync Status */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialIcons name="speed" size={16} color={colors.textSecondary} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ODOMETER READING</Text>
        </View>
        
        <View style={styles.syncWrap}>
          {/* Scaled down Sync Indicator seamlessly integrated into header */}
          <View style={{ transform: [{ scale: 0.85 }] }}>
             <SyncStatusIndicator
              status={syncStatus}
              queuedCount={queuedCount}
              isOnline={isOnline}
              lastSyncError={lastSyncError}
              onRetry={undefined} // Handled by the button next to it
            />
          </View>
          <Pressable
            onPress={onRetrySync}
            disabled={isSyncing}
            style={styles.syncButton}
            hitSlop={10}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialIcons name="sync" size={18} color={colors.textSecondary} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Main Odometer Display */}
      <View style={styles.odometerContainer}>
        {/* Animated Highlight Border */}
        <Animated.View 
          style={[
            styles.odometerHighlight, 
            { 
              borderColor: colors.primary, 
              opacity: highlightOpacity,
              transform: [{ scale: highlightScale }] 
            }
          ]} 
        />
        <Text style={[styles.odometerText, { color: colors.textPrimary }]}>
          {latestEntry ? latestEntry.odometer : '--'}
        </Text>
        <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>KM</Text>
      </View>

      {/* Compact Meta Information Row */}
      <View style={[styles.metaContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.metaItem}>
          <MaterialIcons name="calendar-today" size={14} color={colors.textSecondary} style={{ marginBottom: 2 }} />
          <View>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>LAST UPDATE</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{recordedDate}</Text>
          </View>
        </View>

        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metaItem}>
          <MaterialIcons name="person-outline" size={16} color={colors.textSecondary} style={{ marginBottom: 2 }} />
          <View>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>LAST ENTRY</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{recordedBy}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  syncWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncButton: {
    padding: 4,
    borderRadius: 12,
  },
  odometerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  odometerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 12,
  },
  odometerText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});