import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, SyncStatus } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import { getEntryOwnerName } from '@/utils/entryOwnership';

// ─── Layout constants ────────────────────────────────────────────────────────
const DIGIT_H        = 54;
const DIGIT_W        = 36;
const DIGIT_GAP      = 5;
const NUM_DIGITS     = 6;   // always 6 slots; leading zeros are dimmed
const GLIMMER_W      = 22;
const DIGIT_GROUP_W  = NUM_DIGITS * DIGIT_W + (NUM_DIGITS - 1) * DIGIT_GAP;

const MONO = Platform.select({
  ios:     'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// ─── Single digit slot roller ────────────────────────────────────────────────
// Each digit lives in an overflow:hidden window. An Animated.View containing
// digits 0–9 is translateY'd so the correct digit scrolls into view with a
// satisfying spring overshoot — like a mechanical odometer.
type DigitRollerProps = {
  digit:     number;
  delay:     number;
  isLeading: boolean;
  accent:    string;
  dim:       string;
  slotBg:    string;
};

function DigitRoller({ digit, delay, isLeading, accent, dim, slotBg }: DigitRollerProps) {
  const rollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rollY.setValue(0);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(rollY, {
        toValue:           -digit * DIGIT_H,
        useNativeDriver:   true,
        tension:           44,
        friction:          7,
        overshootClamping: false,
      }),
    ]).start();
  }, [digit]);

  const digitColor  = isLeading ? dim + '40' : accent;
  const borderColor = isLeading ? dim + '15' : accent + '28';

  return (
    <View style={[styles.digitWindow, { backgroundColor: slotBg, borderColor }]}>
      <Animated.View style={{ transform: [{ translateY: rollY }] }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <View key={n} style={styles.digitSlot}>
            <Text style={[styles.digitText, { color: digitColor, fontFamily: MONO }]}>
              {n}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Top edge fade — partial overlay to create depth illusion */}
      <View
        pointerEvents="none"
        style={[styles.edgeFade, { top: 0, backgroundColor: slotBg }]}
      />
      {/* Bottom edge fade */}
      <View
        pointerEvents="none"
        style={[styles.edgeFade, { bottom: 0, backgroundColor: slotBg }]}
      />
    </View>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
type DashboardSummaryCardProps = {
  entries?:       EntryRecord[];
  syncStatus:     SyncStatus;
  lastSyncError?: string | null;
  queuedCount:    number;
  isOnline:       boolean;
  onRetrySync:    () => void;
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

  const isSyncing    = syncStatus === 'syncing';
  const recordedDate = maxEntry
    ? dayjs(maxEntry.createdAt).format(INDIA_DATE_FORMAT)
    : '—';
  const recordedBy   = maxEntry
    ? getEntryOwnerName(maxEntry).toUpperCase()
    : '—';
  const odometerVal  = maxEntry ? Number(maxEntry.odometer) : undefined;

  // ── Shared animation refs ───────────────────────────────────────────────
  const cardY       = useRef(new Animated.Value(32)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const accentPct   = useRef(new Animated.Value(0)).current; // 0→1 strip grow
  const kmOpacity   = useRef(new Animated.Value(0)).current;
  const glimmerX    = useRef(new Animated.Value(-1)).current; // relative 0..1
  const spinValue   = useRef(new Animated.Value(0)).current;

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

    // Accent strip grows from left → right
    Animated.timing(accentPct, {
      toValue: 1, duration: 480, delay: 80,
      useNativeDriver: false,           // animating % width needs JS driver
      easing: Easing.out(Easing.cubic),
    }).start();

    // KM label fades in after digits settle
    Animated.timing(kmOpacity, {
      toValue: 1, duration: 280, delay: lastDigitDelay,
      useNativeDriver: true, easing: Easing.out(Easing.ease),
    }).start();

    // Glimmer sweeps L→R across digit group after digits settle
    Animated.sequence([
      Animated.delay(lastDigitDelay + 60),
      Animated.timing(glimmerX, {
        toValue: 1.2, duration: 620,
        useNativeDriver: true, easing: Easing.inOut(Easing.ease),
      }),
    ]).start();
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
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── Digit calculation ───────────────────────────────────────────────────
  const displayVal = odometerVal ?? 0;
  const padded     = String(displayVal).padStart(NUM_DIGITS, '0');
  const digits     = padded.split('').map(Number);
  const firstLive  = digits.findIndex(d => d !== 0);
  const cutoff     = firstLive === -1 ? NUM_DIGITS - 1 : firstLive;

  // ── Interpolations ──────────────────────────────────────────────────────
  const accentWidth = accentPct.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glimmerTransX = glimmerX.interpolate({
    inputRange:  [-1, 1.2],
    outputRange: [-GLIMMER_W * 2, DIGIT_GROUP_W + GLIMMER_W * 2],
  });

  // ── Theme ───────────────────────────────────────────────────────────────
  const accent   = colors.primary;
  const dim      = colors.textSecondary;
  const cardBg   = colors.card;
  const border   = colors.border;
  const slotBg   = colors.backgroundSecondary;
  const textMain = colors.textPrimary;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor:     border,
          opacity:         cardOpacity,
          transform:       [{ translateY: cardY }],
        },
      ]}
    >
      {/* ── Animated accent strip — grows from left after card appears ── */}
      <Animated.View
        style={[styles.accentStrip, { backgroundColor: accent, width: accentWidth }]}
      />

      <View style={styles.content}>

        {/* ── Header: label + sync controls ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="speed" size={12} color={dim} />
            <Text style={[styles.headerLabel, { color: dim }]}>ODOMETER</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={{ transform: [{ scale: 0.78 }], marginRight: -4 }}>
              <SyncStatusIndicator
                status={syncStatus}
                queuedCount={queuedCount}
                isOnline={isOnline}
                lastSyncError={lastSyncError}
                onRetry={undefined}
              />
            </View>
            <Pressable onPress={onRetrySync} disabled={isSyncing} hitSlop={12}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialIcons name="sync" size={16} color={dim} />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* ── Odometer: digit rollers + KM unit ── */}
        <View style={styles.odometerRow}>
          {/*
            digitGroupClip: explicit width + overflow:hidden so the glimmer
            shimmer is clipped cleanly at the group boundaries.
          */}
          <View style={[styles.digitGroupClip, { width: DIGIT_GROUP_W }]}>
            <View style={styles.digitGroup}>
              {odometerVal !== undefined
                ? digits.map((d, i) => (
                    <DigitRoller
                      key={i}
                      digit={d}
                      delay={i * 60}           // left-to-right cascade
                      isLeading={i < cutoff}
                      accent={accent}
                      dim={dim}
                      slotBg={slotBg}
                    />
                  ))
                : Array.from({ length: NUM_DIGITS }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.digitWindow,
                        { backgroundColor: slotBg, borderColor: dim + '15' },
                      ]}
                    >
                      <Text style={[styles.digitText, { color: dim + '35', fontFamily: MONO }]}>
                        —
                      </Text>
                    </View>
                  ))}
            </View>

            {/* Glimmer — a sheen of light that sweeps across after digits settle */}
            {odometerVal !== undefined && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glimmer,
                  { width: GLIMMER_W, transform: [{ translateX: glimmerTransX }] },
                ]}
              />
            )}
          </View>

          {/* KM unit — fades in after digits settle */}
          <Animated.View style={[styles.kmBlock, { opacity: odometerVal !== undefined ? kmOpacity : 1 }]}>
            <Text style={[styles.kmLabel, { color: accent }]}>KM</Text>
          </Animated.View>
        </View>

        {/* ── Thin horizontal separator ── */}
        <View style={[styles.separator, { backgroundColor: border }]} />

        {/* ── Meta: date + person ── */}
        <View style={styles.metaRow}>

          <View style={styles.metaCell}>
            <View style={[styles.metaIconWrap, { backgroundColor: accent + '12' }]}>
              <MaterialIcons name="event" size={11} color={accent} />
            </View>
            <View style={styles.metaText}>
              <Text style={[styles.metaLabel, { color: dim }]}>RECORDED</Text>
              <Text style={[styles.metaValue, { color: textMain }]} numberOfLines={1}>
                {recordedDate}
              </Text>
            </View>
          </View>

          <View style={[styles.metaDivider, { backgroundColor: border }]} />

          <View style={styles.metaCell}>
            <View style={[styles.metaIconWrap, { backgroundColor: accent + '12' }]}>
              <MaterialIcons name="person" size={11} color={accent} />
            </View>
            <View style={styles.metaText}>
              <Text style={[styles.metaLabel, { color: dim }]}>ENTRY BY</Text>
              <Text style={[styles.metaValue, { color: textMain }]} numberOfLines={1}>
                {recordedBy}
              </Text>
            </View>
          </View>

        </View>
      </View>
    </Animated.View>
  );
}

// ─── StyleSheet ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderWidth:   1,
    borderRadius:  22,
    overflow:      'hidden',   // clips accent strip flush to top corners
    elevation:     5,
    shadowOpacity: 0.09,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 6 },
  },

  // 3-px accent strip that grows from the left on entrance
  accentStrip: {
    height: 3,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     14,
    gap:               14,
  },

  // ── Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  headerLabel: {
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 1.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },

  // ── Odometer
  odometerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  digitGroupClip: {
    overflow: 'hidden',   // clips the glimmer shimmer to group bounds
  },
  digitGroup: {
    flexDirection: 'row',
    gap:           DIGIT_GAP,
  },

  // Individual digit window — shows exactly one digit at a time
  digitWindow: {
    width:          DIGIT_W,
    height:         DIGIT_H,
    borderRadius:   8,
    borderWidth:    1,
    overflow:       'hidden',
    alignItems:     'center',
    justifyContent: 'flex-start',
  },
  digitSlot: {
    height:         DIGIT_H,
    width:          DIGIT_W,
    alignItems:     'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize:           28,
    fontWeight:         '700',
    includeFontPadding: false,
    textAlign:          'center',
    fontVariant:        ['tabular-nums'],
  },

  // Soft fade overlays at top/bottom of each digit window
  edgeFade: {
    position: 'absolute',
    left:     0,
    right:    0,
    height:   10,
    opacity:  0.55,
  },

  // Glimmer strip — absolute inside digitGroupClip, swept by translateX
  glimmer: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    5,
  },

  // KM unit
  kmBlock: {
    paddingBottom: 2,
    justifyContent:'flex-end',
  },
  kmLabel: {
    fontSize:      13,
    fontWeight:    '900',
    letterSpacing: 2.5,
  },

  // ── Separator
  separator: {
    height: 1,
  },

  // ── Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  metaCell: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  metaIconWrap: {
    width:          26,
    height:         26,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  metaText: {
    gap: 1,
  },
  metaLabel: {
    fontSize:      8.5,
    fontWeight:    '800',
    letterSpacing: 0.9,
  },
  metaValue: {
    fontSize:   12,
    fontWeight: '700',
  },
  metaDivider: {
    width:           1,
    height:          26,
    marginHorizontal:12,
  },
});