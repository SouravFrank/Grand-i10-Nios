/**
 * TripGroupCard.tsx
 * Accordion card for a complete trip on the timeline.
 *
 * Collapsed (default): the trip summary (TripCard — header, start→end
 * odometer journey bar, distance + total trip cost strip) plus crisp
 * one-line rows for every child entry and a rotating chevron. Tapping the
 * card toggles the accordion; swiping left still edits the trip.
 *
 * Expanded: the fuel, parking, FASTag and fine entries logged inside the
 * trip, each rendered as its full HistoryItemCard and still swipe-to-edit.
 * The trip's own start/end odometer readings stay in the collapsed summary
 * only — they are not repeated as child cards. Grouping is purely
 * presentational: no entry is hidden or summarized away.
 *
 * Motion: the card rises in on a spring and squishes softly while held;
 * the accordion height glides through a layout transition while the
 * TRIP ENTRIES sections crossfade between collapsed and expanded states,
 * and the chevron flicks over with a spring.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Pressable, Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { TripCard } from '@/components/CardVariants';
import { HistoryItemCard } from '@/components/HistoryItemCard';
import { baseStyles } from '@/components/cardStyles';
import { resolveCardTheme } from '@/components/cardThemes';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs } from '@/utils/day';

export type TripGroupMemberRow = {
  entry: EntryRecord;
  distanceKm: number | null;
};

type TripGroupCardProps = {
  endEntry: EntryRecord;
  members: TripGroupMemberRow[];
  summary: {
    distanceKm: number | null;
    tripStartOdometer: number | null;
    tripEndOdometer: number | null;
    tripTotalCost: number;
    tripTotalFuelCost: number;
    tripTotalFuelLiters: number;
  };
  expanded: boolean;
  onToggle: () => void;
  canEditTrip?: boolean;
  onPressEditTrip?: () => void;
  canEditMember?: (entry: EntryRecord) => boolean;
  onPressEditMember?: (entry: EntryRecord) => void;
};

export function TripGroupCard({
  endEntry,
  members,
  summary,
  expanded,
  onToggle,
  canEditTrip = false,
  onPressEditTrip,
  canEditMember,
  onPressEditMember,
}: TripGroupCardProps) {
  const { colors, isDark } = useAppTheme();

  const hasMembers = members.length > 0;

  // ── Mount animation: fade + spring rise ────────────────────────────────────
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(12)).current;
  const pressScale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      RNAnimated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  // ── Press feedback: soft squish while held, springy release ────────────────
  const handlePressIn = () => {
    RNAnimated.timing(pressScale, {
      toValue: 0.97,
      duration: 130,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    RNAnimated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 260,
      useNativeDriver: true,
    }).start();
  };

  // ── Chevron rotation (springy flick) ───────────────────────────────────────
  const chevronRotate = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(chevronRotate, {
      toValue: expanded ? 1 : 0,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [chevronRotate, expanded]);

  // Same theme resolution as the merged trip row in HistoryItemCard.
  const theme = resolveCardTheme(
    endEntry.type,
    endEntry.expenseCategory,
    endEntry.expenseTitle,
    true,
    endEntry.tripStage,
  );
  const borderColor = theme.accentAlpha(isDark ? 0.3 : 0.18);

  // Count + chevron toggle lives in the TRIP ENTRIES section header, not the
  // card header — it acts on that section in both collapsed and expanded states.
  const entryToggle = (
    <Pressable
      onPress={hasMembers ? onToggle : undefined}
      accessibilityRole={hasMembers ? 'button' : undefined}
      accessibilityState={hasMembers ? { expanded } : undefined}
      style={[styles.headerAccessory, { backgroundColor: theme.accentAlpha(0.12) }]}
    >
      <MaterialIcons name="layers" size={12} color={theme.accent} />
      <Text style={[styles.countPillText, { color: theme.accent }]}>{members.length}</Text>
      <View style={[styles.accessoryDivider, { backgroundColor: theme.accentAlpha(0.28) }]} />
      <RNAnimated.View
        style={{
          transform: [
            {
              rotate: chevronRotate.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            },
          ],
        }}
      >
        <MaterialIcons name="expand-more" size={15} color={theme.accent} />
      </RNAnimated.View>
    </Pressable>
  );

  return (
    <RNAnimated.View style={{ opacity, transform: [{ translateY }, { scale: pressScale }] }}>
      <ReanimatedSwipeable
        // While expanded, hand gestures to the nested entry swipeables.
        enabled={Boolean(canEditTrip) && !expanded}
        renderRightActions={() => {
          if (!canEditTrip) return null;
          return (
            <View style={baseStyles.swipeActionWrap}>
              <Pressable
                onPress={onPressEditTrip}
                style={[baseStyles.editButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <MaterialIcons name="edit" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          );
        }}
      >
        {/* Layout transition glides the card height as the sections swap. */}
        <Animated.View
          layout={LinearTransition.springify().damping(26).stiffness(220)}
          style={[
            baseStyles.card,
            {
              backgroundColor: colors.card,
              borderColor,
              borderLeftColor: theme.accent,
            },
          ]}
        >
          <Pressable
            onPress={hasMembers ? onToggle : undefined}
            onPressIn={hasMembers ? handlePressIn : undefined}
            onPressOut={hasMembers ? handlePressOut : undefined}
            accessibilityRole={hasMembers ? 'button' : undefined}
            accessibilityState={hasMembers ? { expanded } : undefined}
          >
            <TripCard
              theme={theme}
              entry={endEntry}
              tripStartOdometer={summary.tripStartOdometer}
              tripEndOdometer={summary.tripEndOdometer}
              distanceKm={summary.distanceKm}
              tripTotalCost={summary.tripTotalCost}
              tripTotalFuelCost={summary.tripTotalFuelCost}
              tripTotalFuelLiters={summary.tripTotalFuelLiters}
              colors={colors}
            />
            {!expanded && members.length > 0 && (
              <Animated.View
                entering={FadeInUp.springify().damping(20)}
                exiting={FadeOutUp.duration(180)}
                style={[styles.childRowsWrap, { borderTopColor: colors.border }]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.childRowsLabel, { color: colors.textSecondary }]}>
                    TRIP ENTRIES
                  </Text>
                  {entryToggle}
                </View>
                {members.map((member) => {
                  const childEntry = member.entry;
                  const childTheme = resolveCardTheme(
                    childEntry.type,
                    childEntry.expenseCategory,
                    childEntry.expenseTitle,
                    false,
                    childEntry.tripStage,
                  );
                  const isFuel = childEntry.type === 'fuel';
                  const liters =
                    isFuel && typeof childEntry.fuelLiters === 'number'
                      ? childEntry.fuelLiters
                      : null;
                  const amount = isFuel
                    ? typeof childEntry.fuelAmount === 'number' && childEntry.fuelAmount > 0
                      ? childEntry.fuelAmount
                      : typeof childEntry.cost === 'number' && childEntry.cost > 0
                        ? childEntry.cost
                        : null
                    : typeof childEntry.cost === 'number' && childEntry.cost > 0
                      ? childEntry.cost
                      : null;
                  const rowTitle = isFuel
                    ? liters !== null
                      ? `${liters} L`
                      : 'Fuel'
                    : childEntry.expenseTitle || 'Expense';
                  const isSameDay = dayjs(childEntry.createdAt).isSame(
                    dayjs(endEntry.createdAt),
                    'day',
                  );
                  return (
                    <View
                      key={childEntry.id}
                      style={[styles.childRow, { backgroundColor: childTheme.accentAlpha(0.06) }]}
                    >
                      <View
                        style={[
                          styles.childRowIcon,
                          { backgroundColor: childTheme.accentAlpha(0.14) },
                        ]}
                      >
                        <MaterialIcons name={childTheme.icon} size={13} color={childTheme.accent} />
                      </View>
                      <Text
                        style={[styles.childRowTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {rowTitle}
                      </Text>
                      {amount !== null && (
                        <Text style={[styles.childRowAmount, { color: childTheme.accent }]}>
                          ₹{amount}
                        </Text>
                      )}
                      {!isSameDay && (
                        <Text style={[styles.childRowDate, { color: colors.textSecondary }]}>
                          {dayjs(childEntry.createdAt).format('DD MMM')}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </Pressable>

          {expanded && hasMembers && (
            <Animated.View
              entering={FadeIn.duration(240)}
              exiting={FadeOutUp.duration(200)}
              style={[styles.itineraryWrap, { borderTopColor: colors.border }]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.itineraryLabel, { color: colors.textSecondary }]}>
                  TRIP ENTRIES
                </Text>
                {entryToggle}
              </View>
              <View>
                {members.map((member, index) => (
                  <HistoryItemCard
                    key={member.entry.id}
                    entry={member.entry}
                    distanceKm={member.distanceKm}
                    index={index}
                    canEdit={canEditMember ? canEditMember(member.entry) : false}
                    onPressEdit={
                      onPressEditMember ? () => onPressEditMember(member.entry) : undefined
                    }
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </ReanimatedSwipeable>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingLeft: 9,
    paddingRight: 7,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  accessoryDivider: {
    width: 1,
    height: 12,
    borderRadius: 1,
  },
  itineraryWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 8,
  },
  childRowsWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 12,
    gap: 6,
  },
  childRowsLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  childRowIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  childRowAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  childRowDate: {
    fontSize: 10,
    fontWeight: '700',
  },
  itineraryLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
