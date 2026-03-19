import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, EntryType } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'Report'>;

type ReportFilterMode = 'month' | 'range';
type DateTarget = 'from' | 'to';

type Trip = {
  tripId: string;
  start: EntryRecord;
  end: EntryRecord;
  distanceKm: number;
  participantAId: string;
  participantBId?: string;
  isSharedParticipants: boolean;
};

function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatKm(value: number): string {
  if (!Number.isFinite(value)) return '0 km';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('en-IN')} km`;
}

export function ReportScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const entries = useAppStore((s) => s.entries);
  const currentUser = useAppStore((s) => s.currentUser);

  const [filterMode, setFilterMode] = useState<ReportFilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // YYYY-MM
  const [fromDate, setFromDate] = useState<Date | null>(dayjs().subtract(30, 'day').toDate());
  const [toDate, setToDate] = useState<Date | null>(dayjs().toDate());
  const [activeDateTarget, setActiveDateTarget] = useState<DateTarget | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>(() => currentUser?.id ?? 'all');

  const userOptions = useMemo(() => {
    const byId = new Map<string, string>();

    for (const entry of entries) {
      if (entry.userId) byId.set(entry.userId, entry.userName);

      if (entry.type === 'odometer' && entry.sharedTripMarkedById && entry.sharedTripMarkedByName) {
        byId.set(entry.sharedTripMarkedById, entry.sharedTripMarkedByName);
      }
    }

    const options = Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    options.sort((a, b) => a.name.localeCompare(b.name));
    return options;
  }, [entries]);

  const resolvedSelectedUserId = useMemo(() => {
    if (selectedUserId !== 'all') return selectedUserId;
    return currentUser?.id ?? (userOptions[0]?.id ?? 'all');
  }, [currentUser, selectedUserId, userOptions]);

  const trips = useMemo<Trip[]>(() => {
    const odometerEntries = entries.filter(
      (e): e is EntryRecord =>
        e.type === 'odometer' &&
        typeof e.tripId === 'string' &&
        typeof e.tripStage === 'string' &&
        e.tripStage !== undefined,
    );

    const buckets = new Map<
      string,
      {
        start?: EntryRecord;
        end?: EntryRecord;
      }
    >();

    for (const entry of odometerEntries) {
      const tripId = entry.tripId!;
      const bucket = buckets.get(tripId) ?? {};
      if (entry.tripStage === 'start') bucket.start = entry;
      if (entry.tripStage === 'end') bucket.end = entry;
      buckets.set(tripId, bucket);
    }

    const tripsList: Trip[] = [];

    for (const [tripId, bucket] of buckets.entries()) {
      if (!bucket.start || !bucket.end) continue;

      const start = bucket.start;
      const end = bucket.end;
      const distanceKm =
        typeof end.tripDistanceKm === 'number' ? end.tripDistanceKm : end.odometer - start.odometer;

      if (!Number.isFinite(distanceKm) || distanceKm <= 0) continue;

      const participantAId = end.userId;
      const participantBId =
        end.sharedTrip && end.sharedTripMarkedById && end.sharedTripMarkedById !== end.userId
          ? end.sharedTripMarkedById
          : undefined;

      tripsList.push({
        tripId,
        start,
        end,
        distanceKm,
        participantAId,
        participantBId,
        isSharedParticipants: Boolean(participantBId),
      });
    }

    // Sort by trip end date (most recent first)
    tripsList.sort((a, b) => b.end.createdAt - a.end.createdAt);
    return tripsList;
  }, [entries]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of trips) {
      set.add(dayjs(t.end.createdAt).format('YYYY-MM'));
    }
    return ['all', ...Array.from(set).sort((a, b) => (a < b ? 1 : -1))];
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const fromTs = fromDate ? dayjs(fromDate).startOf('day').valueOf() : null;
    const toTs = toDate ? dayjs(toDate).endOf('day').valueOf() : null;

    const isWithin = (trip: Trip) => {
      if (filterMode === 'month') {
        if (selectedMonth === 'all') return true;
        return dayjs(trip.end.createdAt).format('YYYY-MM') === selectedMonth;
      }

      const createdAt = trip.end.createdAt;
      if (fromTs !== null && createdAt < fromTs) return false;
      if (toTs !== null && createdAt > toTs) return false;
      return true;
    };

    return trips.filter(isWithin);
  }, [filterMode, fromDate, selectedMonth, toDate, trips]);

  const report = useMemo(() => {
    if (resolvedSelectedUserId === 'all') {
      return {
        totalKmShare: 0,
        totalTrips: filteredTrips.length,
        fuelCost: 0,
        otherCost: 0,
        tollCost: 0,
        totalSpend: 0,
        sharedMoney: 0,
      };
    }

    const selectedId = resolvedSelectedUserId;

    const tripByOdometer = (odo: number): Trip | null => {
      // Odometer increases monotonically through trips, so this is typically unique.
      // We keep it simple (linear scan) since local data sizes are modest.
      for (const trip of filteredTrips) {
        const min = Math.min(trip.start.odometer, trip.end.odometer);
        const max = Math.max(trip.start.odometer, trip.end.odometer);
        if (odo >= min && odo <= max) return trip;
      }
      return null;
    };

    let totalKmDriven = 0;
    let userKmShare = 0;
    let fuelCost = 0;
    let otherCost = 0;
    let tollCost = 0;
    let sharedMoney = 0; // money attributed via 50-50 splits

    // 1) KM share
    for (const trip of filteredTrips) {
      totalKmDriven += trip.distanceKm;

      const isParticipantA = trip.participantAId === selectedId;
      const isParticipantB = trip.participantBId && trip.participantBId === selectedId;

      if (trip.isSharedParticipants) {
        if (isParticipantA || isParticipantB) {
          userKmShare += trip.distanceKm / 2;
        }
      } else {
        if (isParticipantA) userKmShare += trip.distanceKm;
      }
    }

    // 2) Money allocation (fuel + expenses mapped into trip ranges)
    for (const entry of entries) {
      const trip = entry.odometer ? tripByOdometer(entry.odometer) : null;
      if (!trip) continue;

      if (entry.type === 'fuel') {
        const cost = typeof entry.cost === 'number' ? entry.cost : typeof entry.fuelAmount === 'number' ? entry.fuelAmount : null;
        if (cost === null) continue;

        const isParticipantA = trip.participantAId === selectedId;
        const isParticipantB = trip.participantBId && trip.participantBId === selectedId;

        if (trip.isSharedParticipants) {
          if (isParticipantA || isParticipantB) {
            const share = cost / 2;
            fuelCost += share;
            sharedMoney += share;
          }
        } else {
          if (isParticipantA) {
            fuelCost += cost;
          }
        }
        continue;
      }

      if (entry.type === 'expense') {
        const cost = typeof entry.cost === 'number' ? entry.cost : null;
        if (cost === null) continue;

        const isParticipantA = trip.participantAId === selectedId;
        const isParticipantB = trip.participantBId && trip.participantBId === selectedId;

        const isToll = entry.expenseCategory === 'fasttag_toll_paid';

        if (isToll) {
          // Special rule:
          // Toll is split only when BOTH:
          // - trip is shared, AND
          // - this toll expense is marked shared in the expense entry.
          const shouldSplit = trip.isSharedParticipants && Boolean(entry.sharedTrip);

          if (shouldSplit) {
            if (isParticipantA || isParticipantB) {
              const share = cost / 2;
              tollCost += share;
              sharedMoney += share;
            }
          } else {
            // Otherwise bill based on who logged it (expense.userId).
            if (entry.userId === selectedId) {
              tollCost += cost;
            }
          }
        } else {
          // Other expenses:
          // On a shared trip, default split 50-50 between participants.
          if (trip.isSharedParticipants) {
            if (isParticipantA || isParticipantB) {
              const share = cost / 2;
              otherCost += share;
              sharedMoney += share;
            }
          } else {
            if (entry.userId === selectedId) {
              otherCost += cost;
            }
          }
        }
      }
    }

    const totalSpend = fuelCost + tollCost + otherCost;
    return {
      totalKmDriven,
      totalKmShare: userKmShare,
      totalTrips: filteredTrips.length,
      fuelCost,
      otherCost,
      tollCost,
      totalSpend,
      sharedMoney,
    };
  }, [entries, filteredTrips, resolvedSelectedUserId]);

  const openDatePicker = (target: DateTarget) => {
    setActiveDateTarget(target);
    setIsDatePickerVisible(true);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setIsDatePickerVisible(false);
      return;
    }
    if (!selectedDate || !activeDateTarget) return;

    if (activeDateTarget === 'from') setFromDate(selectedDate);
    if (activeDateTarget === 'to') setToDate(selectedDate);
    setIsDatePickerVisible(false);
  };

  const tripSummarySubtitle = useMemo(() => {
    if (filterMode === 'month') {
      if (selectedMonth === 'all') return 'All months';
      return dayjs(`${selectedMonth}-01`).format(INDIA_MONTH_FORMAT);
    }
    const fromLabel = fromDate ? dayjs(fromDate).format(INDIA_DATE_FORMAT) : 'Start';
    const toLabel = toDate ? dayjs(toDate).format(INDIA_DATE_FORMAT) : 'End';
    return `${fromLabel} - ${toLabel}`;
  }, [filterMode, fromDate, selectedMonth, toDate]);

  return (
    <ScreenContainer>
      <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>REPORT</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Spending & KM</Text>
          </View>

          <View style={[styles.headerPill, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name="event" size={16} color={colors.textSecondary} />
            <Text style={[styles.headerPillText, { color: colors.textPrimary }]}>{tripSummarySubtitle}</Text>
          </View>
        </View>

        <View style={styles.filterBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Pressable
              onPress={() => setFilterMode('month')}
              style={[
                styles.chip,
                {
                  borderColor: filterMode === 'month' ? colors.textPrimary : colors.border,
                  backgroundColor: filterMode === 'month' ? colors.textPrimary : colors.backgroundSecondary,
                },
              ]}
            >
              {filterMode === 'month' ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
              <Text
                style={[
                  styles.chipText,
                  { color: filterMode === 'month' ? colors.invertedText : colors.textPrimary },
                ]}
              >
                Month
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterMode('range')}
              style={[
                styles.chip,
                {
                  borderColor: filterMode === 'range' ? colors.textPrimary : colors.border,
                  backgroundColor: filterMode === 'range' ? colors.textPrimary : colors.backgroundSecondary,
                },
              ]}
            >
              {filterMode === 'range' ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
              <Text
                style={[
                  styles.chipText,
                  { color: filterMode === 'range' ? colors.invertedText : colors.textPrimary },
                ]}
              >
                Date Range
              </Text>
            </Pressable>
          </ScrollView>

          {filterMode === 'month' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
              {monthOptions.map((m) => {
                const active = m === selectedMonth;
                const label = m === 'all' ? 'All months' : dayjs(`${m}-01`).format(INDIA_MONTH_FORMAT);
                return (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedMonth(m)}
                    style={[
                      styles.monthChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.monthChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.rangeRow}>
              <Pressable
                onPress={() => openDatePicker('from')}
                style={[styles.rangeCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
              >
                <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>From</Text>
                <View style={styles.rangeValueRow}>
                  <MaterialIcons name="calendar-month" size={16} color={colors.textPrimary} />
                  <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                    {fromDate ? dayjs(fromDate).format(INDIA_DATE_FORMAT) : 'Select date'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => openDatePicker('to')}
                style={[styles.rangeCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
              >
                <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>To</Text>
                <View style={styles.rangeValueRow}>
                  <MaterialIcons name="calendar-month" size={16} color={colors.textPrimary} />
                  <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                    {toDate ? dayjs(toDate).format(INDIA_DATE_FORMAT) : 'Select date'}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {isDatePickerVisible && activeDateTarget ? (
            <View style={[styles.nativePickerWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.nativePickerTitle, { color: colors.textPrimary }]}>
                Choose {activeDateTarget === 'from' ? 'From date' : 'To date'}
              </Text>

              <DateTimePicker
                mode="date"
                value={activeDateTarget === 'from' ? fromDate ?? new Date() : toDate ?? new Date()}
                accentColor={colors.textPrimary}
                display="spinner"
                onChange={handleDatePickerChange}
              />

              <Pressable onPress={() => setIsDatePickerVisible(false)} style={[styles.nativePickerDone, { borderColor: colors.border }]}>
                <Text style={[styles.nativePickerDoneText, { color: colors.textPrimary }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.userBlock}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Quick user reports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userRow}>
          {userOptions.length === 0 ? (
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No users yet.</Text>
          ) : (
            userOptions.map((u) => {
              const active = u.id === resolvedSelectedUserId;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    setSelectedUserId(u.id);
                  }}
                  style={[
                    styles.userChip,
                    {
                      borderColor: active ? colors.textPrimary : colors.border,
                      backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                    },
                  ]}
                >
                  {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                  <MaterialIcons name="person" size={14} color={active ? colors.invertedText : colors.textSecondary} />
                  <Text style={[styles.userChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{u.name}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      <View style={styles.cardsGrid}>
        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total KM</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatKm(report.totalKmShare)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>{report.totalTrips} trips</Text>
        </View>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spend</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatINR(report.totalSpend)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>Fuel + Toll + Other</Text>
        </View>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fuel Cost</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatINR(report.fuelCost)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>Allocated by KM share</Text>
        </View>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Toll Cost</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatINR(report.tollCost)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>Split only on shared + marked</Text>
        </View>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Other Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatINR(report.otherCost)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>50-50 on shared trips</Text>
        </View>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Share</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatINR(report.sharedMoney)}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>Money from shared splits</Text>
        </View>
      </View>

      {filteredTrips.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="directions-car" size={26} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No trips in this period</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add trips from Timeline to generate reports.</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterBlock: {
    gap: 10,
  },
  filterRow: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthRow: {
    gap: 8,
  },
  monthChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rangeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rangeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  nativePickerWrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  nativePickerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  nativePickerDone: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nativePickerDoneText: {
    fontSize: 14,
    fontWeight: '800',
  },
  userBlock: {
    marginTop: 6,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  userRow: {
    gap: 10,
  },
  userChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userChipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexGrow: 0,
    flexBasis: '48%',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    marginTop: 22,
    alignItems: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

