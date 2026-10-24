import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, SyncStatus } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import { getEntryOwnerName } from '@/utils/entryOwnership';

// ─── Layout constants ────────────────────────────────────────────────────────
const DIGIT_H = 60;
const DIGIT_W = 46;
const DIGIT_GAP = 7;
const NUM_DIGITS = 6; // always 6 slots; leading zeros are dimmed

// ─── Single digit slot roller ────────────────────────────────────────────────
// Each digit lives in an overflow:hidden window. An Animated.View containing
// digits 0–9 is translateY'd so the correct digit scrolls into view with a
// satisfying spring overshoot — like a mechanical odometer.
type DigitRollerProps = {
  digit: number;
  delay: number;
  isLeading: boolean;
  textPrimary: string;
  textSecondary: string;
  slotBg: string;
  borderColor: string;
};

function DigitRoller({ digit, delay, isLeading, textPrimary, textSecondary, slotBg, borderColor }: DigitRollerProps) {
  const rollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rollY.setValue(0);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(rollY, {
        toValue: -digit * DIGIT_H,
        useNativeDriver: true,
        tension: 44,
        friction: 7,
        overshootClamping: false,
      }),
    ]).start();
  }, [digit]);

  const digitColor = isLeading ? textSecondary + '55' : textPrimary;

  return (
    <View style={[styles.digitWindow, { backgroundColor: slotBg, borderColor }]}>
      <Animated.View style={{ transform: [{ translateY: rollY }] }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <View key={n} style={styles.digitSlot}>
            <Text style={[styles.digitText, { color: digitColor }]}>
              {n}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Soft fades at the top/bottom of each window for depth */}
      <View pointerEvents="none" style={[styles.edgeFade, { top: 0, backgroundColor: slotBg }]} />
      <View pointerEvents="none" style={[styles.edgeFade, { bottom: 0, backgroundColor: slotBg }]} />
    </View>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
type DashboardSummaryCardProps = {
  entries?: EntryRecord[];
  syncStatus: SyncStatus;
  lastSyncError?: string | null;
  queuedCount: number;
  isOnline: boolean;
  onRetrySync: () => void;
};

// ─── DashboardSummaryCard ────────────────────────────────────────────────────
export function DashboardSummaryCard({
  entries,
  syncStatus,
  lastSyncError,
  queuedCount,
  isOnline,
  onRetrySync,
}: DashboardSummaryCardProps) {
  const { colors } = useAppTheme();

  // Find entry with max odometer value
  const maxEntry = entries && entries.length > 0
    ? entries.reduce((max, entry) =>
      Number(entry.odometer) > Number(max.odometer) ? entry : max
    )
    : undefined;

  const isSyncing = syncStatus === 'syncing';
  const recordedDate = maxEntry
    ? dayjs(maxEntry.createdAt).format(INDIA_DATE_FORMAT)
    : '—';
  const recordedBy = maxEntry
    ? getEntryOwnerName(maxEntry).toUpperCase()
    : '—';
  const odometerVal = maxEntry ? Number(maxEntry.odometer) : undefined;

  // ── Sync status chip (dot + label, mirrors SyncStatusIndicator semantics) ──
  const syncNotConfigured = syncStatus === 'failed' && (lastSyncError ?? '').toLowerCase().includes('not configured');
  const offlinePending = !isOnline && queuedCount > 0;
  const statusLabel = offlinePending
    ? `Offline · Pending ${queuedCount} ${queuedCount > 1 ? 'entries' : 'entry'}`
    : syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'failed'
        ? (syncNotConfigured ? 'Sync not configured' : 'Sync Failed')
        : 'Synced';
  const statusColor = offlinePending || syncStatus === 'syncing'
    ? '#F9A825'
    : syncStatus === 'failed'
      ? '#D93025'
      : '#2E7D32';

  // ── Shared animation refs ───────────────────────────────────────────────
  const cardY = useRef(new Animated.Value(32)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const kmOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // ── Mount sequence ──────────────────────────────────────────────────────
  useEffect(() => {
    const lastDigitDelay = (NUM_DIGITS - 1) * 60 + 720; // ≈ when all digits settled

    // Card entrance — spring slide + fade
    Animated.parallel([
      Animated.spring(cardY, {
        toValue: 0, useNativeDriver: true, tension: 54, friction: 9,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 340, useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // KM label fades in after digits settle
    Animated.timing(kmOpacity, {
      toValue: 1, duration: 280, delay: lastDigitDelay,
      useNativeDriver: true, easing: Easing.out(Easing.ease),
    }).start();
  }, []);

  // ── Sync spin ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1, duration: 860,
          easing: Easing.linear, useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isSyncing]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── Digit calculation ───────────────────────────────────────────────────
  const displayVal = odometerVal ?? 0;
  const padded = String(displayVal).padStart(NUM_DIGITS, '0');
  const digits = padded.split('').map(Number);
  const firstLive = digits.findIndex(d => d !== 0);
  const cutoff = firstLive === -1 ? NUM_DIGITS - 1 : firstLive;

  // ── Theme ───────────────────────────────────────────────────────────────
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;
  const slotBg = colors.backgroundSecondary;
  const border = colors.border;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: border,
          opacity: cardOpacity,
          transform: [{ translateY: cardY }],
        },
      ]}
    >
      {/* ── Header: icon + label + sync controls ── */}
      <View style={styles.headerRow}>
        <View style={[styles.headerIconTile, { backgroundColor: slotBg }]}>
          <MaterialIcons name="speed" size={20} color={textPrimary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>ODOMETER</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]} numberOfLines={1}>
            Total distance recorded
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusWrap}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
          <Pressable onPress={onRetrySync} disabled={isSyncing} hitSlop={10} style={[styles.refreshBtn, { backgroundColor: slotBg }]}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialIcons name="sync" size={15} color={textPrimary} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* ── Odometer: digit rollers + KM unit ── */}
      <View style={styles.odometerRow}>
        {odometerVal !== undefined
          ? digits.map((d, i) => (
            <DigitRoller
              key={i}
              digit={d}
              delay={i * 60} // left-to-right cascade
              isLeading={i < cutoff}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              slotBg={slotBg}
              borderColor={border}
            />
          ))
          : Array.from({ length: NUM_DIGITS }).map((_, i) => (
            <View
              key={i}
              style={[styles.digitWindow, { backgroundColor: slotBg, borderColor: border }]}
            >
              <Text style={[styles.digitText, { color: textSecondary + '55' }]}>—</Text>
            </View>
          ))}

        {/* KM unit — fades in after digits settle */}
        <Animated.Text
          style={[
            styles.kmLabel,
            { color: textPrimary, opacity: odometerVal !== undefined ? kmOpacity : 1 },
          ]}
        >
          KM
        </Animated.Text>
      </View>

      {/* ── Thin horizontal separator ── */}
      <View style={[styles.separator, { backgroundColor: border }]} />

      {/* ── Meta: last recorded date + entry owner ── */}
      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <View style={[styles.metaIconWrap, { backgroundColor: slotBg }]}>
            <MaterialIcons name="event" size={16} color={textPrimary} />
          </View>
          <View style={styles.metaText}>
            <Text style={[styles.metaLabel, { color: textSecondary }]}>LAST RECORDED</Text>
            <Text style={[styles.metaValue, { color: textPrimary }]} numberOfLines={1}>
              {recordedDate}
            </Text>
          </View>
        </View>

        <View style={[styles.metaDivider, { backgroundColor: border }]} />

        <View style={styles.metaCell}>
          <View style={[styles.metaIconWrap, { backgroundColor: slotBg }]}>
            <MaterialIcons name="person" size={16} color={textPrimary} />
          </View>
          <View style={styles.metaText}>
            <Text style={[styles.metaLabel, { color: textSecondary }]}>ENTRY BY</Text>
            <Text style={[styles.metaValue, { color: textPrimary }]} numberOfLines={1}>
              {recordedBy}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── StyleSheet ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  // ── Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 118,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Odometer
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DIGIT_GAP,
    marginTop: 16,
  },
  digitWindow: {
    width: DIGIT_W,
    height: DIGIT_H,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  digitSlot: {
    height: DIGIT_H,
    width: DIGIT_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 30,
    fontWeight: '800',
    includeFontPadding: false,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  edgeFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    opacity: 0.55,
  },
  kmLabel: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 4,
  },

  // ── Separator
  separator: {
    height: 1,
    marginTop: 16,
  },

  // ── Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  metaCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  metaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metaDivider: {
    width: 1,
    height: 30,
  },
});
