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
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { HistoryItemCard } from '@/components/HistoryItemCard';
import { TripCard } from '@/components/CardVariants';
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

  // ── Mount animation (mirrors HistoryItemCard) ──────────────────────────────
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  // ── Chevron rotation ───────────────────────────────────────────────────────
  const chevronRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronRotate, {
      toValue: expanded ? 1 : 0,
      duration: 200,
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
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
        <View
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
              colors={colors}
              headerAccessory={
                hasMembers ? (
                  <View style={styles.headerAccessory}>
                    <View style={[styles.countPill, { backgroundColor: theme.accentAlpha(0.12) }]}>
                      <MaterialIcons name="layers" size={11} color={theme.accent} />
                      <Text style={[styles.countPillText, { color: theme.accent }]}>
                        {members.length}
                      </Text>
                    </View>
                    <Animated.View
                      style={[
                        styles.chevronBadge,
                        {
                          borderColor: theme.accentAlpha(0.3),
                          transform: [
                            {
                              rotate: chevronRotate.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '180deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <MaterialIcons name="expand-more" size={16} color={theme.accent} />
                    </Animated.View>
                  </View>
                ) : undefined
              }
            />
            {!expanded && members.length > 0 && (
              <View style={[styles.childRowsWrap, { borderTopColor: colors.border }]}>
                <Text style={[styles.childRowsLabel, { color: colors.textSecondary }]}>
                  TRIP ENTRIES
                </Text>
                {members.map((member, index) => {
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
                      style={[
                        styles.childRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <MaterialIcons name={childTheme.icon} size={13} color={childTheme.accent} />
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
              </View>
            )}
          </Pressable>

          {expanded && hasMembers && (
            <View style={[styles.itineraryWrap, { borderTopColor: colors.border }]}>
              <Text style={[styles.itineraryLabel, { color: colors.textSecondary }]}>
                TRIP ENTRIES
              </Text>
              <View style={styles.itineraryRow}>
                <View style={[styles.rail, { backgroundColor: theme.accentAlpha(0.25) }]} />
                <View style={styles.itineraryList}>
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
              </View>
            </View>
          )}
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  chevronBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  childRowsLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
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
  itineraryRow: {
    flexDirection: 'row',
  },
  // Rail sits under the 32pt icon badges of the nested cards.
  rail: {
    width: 2,
    borderRadius: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  itineraryList: {
    flex: 1,
  },
});
