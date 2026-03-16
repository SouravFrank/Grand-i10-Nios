import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryItemCard } from '@/components/HistoryItemCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, EntryType } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'History'>;

type HistoryRow = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer: number | null;
  tripEndOdometer: number | null;
};

type CategoryFilter = 'all' | EntryType;
type DateTarget = 'from' | 'to';
type DatePreset = 'all' | 'last7' | 'last30' | 'thisMonth' | 'custom';

const MIN_FILTER_DATE = dayjs('2026-02-01').startOf('day');
const MAX_FILTER_DATE = dayjs().endOf('day');

function buildHistoryRows(entries: EntryRecord[]): HistoryRow[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  const trips = new Map<string, { start?: EntryRecord; end?: EntryRecord }>();
  for (const entry of sorted) {
    if (entry.type !== 'odometer' || !entry.tripId || !entry.tripStage) {
      continue;
    }
    const bucket = trips.get(entry.tripId) ?? {};
    if (entry.tripStage === 'start') bucket.start = entry;
    if (entry.tripStage === 'end') bucket.end = entry;
    trips.set(entry.tripId, bucket);
  }

  const visited = new Set<string>();
  const rows: HistoryRow[] = [];

  for (const entry of sorted) {
    if (visited.has(entry.id)) {
      continue;
    }

    if (entry.type === 'odometer' && entry.tripId && entry.tripStage) {
      const trip = trips.get(entry.tripId);
      const start = trip?.start;
      const end = trip?.end;

      // Merge trip start + end into a single row (shown at the end-entry timestamp).
      if (entry.tripStage === 'end' && start) {
        visited.add(entry.id);
        visited.add(start.id);
        const distanceKm = entry.odometer - start.odometer;
        rows.push({
          entry,
          distanceKm: distanceKm > 0 ? distanceKm : null,
          tripStartOdometer: start.odometer,
          tripEndOdometer: entry.odometer,
        });
        continue;
      }

      // If this is a start entry that has an end, skip it (it will be represented by the merged card).
      if (entry.tripStage === 'start' && end) {
        visited.add(entry.id);
        continue;
      }

      // Incomplete trips: show the single entry.
      visited.add(entry.id);
      rows.push({
        entry,
        distanceKm: null,
        tripStartOdometer: entry.tripStage === 'start' ? entry.odometer : null,
        tripEndOdometer: entry.tripStage === 'end' ? entry.odometer : null,
      });
      continue;
    }

    visited.add(entry.id);
    rows.push({
      entry,
      distanceKm: null,
      tripStartOdometer: null,
      tripEndOdometer: null,
    });
  }

  return rows;
}

export function HistoryScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const entries = useAppStore((state) => state.entries);
  const currentUser = useAppStore((state) => state.currentUser);
  const markEntrySharedTrip = useAppStore((state) => state.markEntrySharedTrip);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [activeDateTarget, setActiveDateTarget] = useState<DateTarget | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const userOptions = useMemo(() => {
    const userMap = new Map<string, string>();
    entries.forEach((entry) => {
      if (!userMap.has(entry.userId)) {
        userMap.set(entry.userId, entry.userName);
      }
    });
    return [{ id: 'all', name: 'All users' }, ...Array.from(userMap.entries()).map(([id, name]) => ({ id, name }))];
  }, [entries]);

  const viewContextOptions = useMemo(() => {
    const opts = [
      { id: 'all', name: 'All Entries' },
      { id: 'me', name: 'My Entries Only' },
      { id: 'me_shared', name: 'My Entries + Shared' },
      { id: 'shared_only', name: 'Shared Trips Only' },
    ];
    if (currentUser) {
      userOptions.forEach((user) => {
        if (user.id !== 'all' && user.id !== currentUser.id) {
          opts.push({ id: user.id, name: `${user.name} Only` });
          opts.push({ id: `${user.id}_shared`, name: `${user.name} + Shared` });
        }
      });
    }
    return opts;
  }, [currentUser, userOptions]);

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((entry) => monthSet.add(dayjs(entry.createdAt).format('YYYY-MM')));
    return ['all', ...Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1))];
  }, [entries]);

  const activeFilterPills = useMemo(() => {
    const pills: string[] = [];

    if (category !== 'all') {
      pills.push(category === 'spec_update' ? 'Specs Update' : category.charAt(0).toUpperCase() + category.slice(1));
    }

    if (selectedUser !== 'all') {
      const contextName = viewContextOptions.find((ctx) => ctx.id === selectedUser)?.name;
      if (contextName) {
        pills.push(contextName);
      }
    }

    if (selectedMonth !== 'all') {
      pills.push(dayjs(`${selectedMonth}-01`).format(INDIA_MONTH_FORMAT));
    }

    if (datePreset !== 'all') {
      if (datePreset === 'last7') pills.push('Last 7 days');
      if (datePreset === 'last30') pills.push('Last 30 days');
      if (datePreset === 'thisMonth') pills.push('This month');
      if (datePreset === 'custom') pills.push('Custom range');
    }

    if (fromDate) {
      pills.push(`From ${dayjs(fromDate).format(INDIA_DATE_FORMAT)}`);
    }

    if (toDate) {
      pills.push(`To ${dayjs(toDate).format(INDIA_DATE_FORMAT)}`);
    }

    return pills;
  }, [category, datePreset, fromDate, selectedMonth, selectedUser, toDate, userOptions]);

  const rows = useMemo(() => {
    const baseRows = buildHistoryRows(entries);
    const fromTimestamp = fromDate
      ? dayjs(fromDate).startOf('day').isBefore(MIN_FILTER_DATE, 'day')
        ? MIN_FILTER_DATE.valueOf()
        : dayjs(fromDate).startOf('day').valueOf()
      : null;
    const toTimestamp = toDate
      ? dayjs(toDate).endOf('day').isAfter(MAX_FILTER_DATE, 'day')
        ? MAX_FILTER_DATE.valueOf()
        : dayjs(toDate).endOf('day').valueOf()
      : null;

    return baseRows.filter((row) => {
      const entry = row.entry;

      if (category !== 'all' && entry.type !== category) {
        return false;
      }

      if (selectedMonth !== 'all' && dayjs(entry.createdAt).format('YYYY-MM') !== selectedMonth) {
        return false;
      }

      if (selectedUser !== 'all') {
        if (selectedUser === 'me' && !(entry.userId === currentUser?.id)) return false;
        if (selectedUser === 'me_shared') {
           const isMyEntry = entry.userId === currentUser?.id;
           const isSharedTrip = entry.type === 'odometer' && entry.sharedTrip;
           if (!isMyEntry && !isSharedTrip) return false;
        }
        if (selectedUser === 'shared_only') {
           const isSharedTrip = entry.type === 'odometer' && entry.sharedTrip;
           if (!isSharedTrip) return false;
        }
        if (selectedUser !== 'me' && selectedUser !== 'me_shared' && selectedUser !== 'shared_only') {
           const isSharedIncluded = selectedUser.endsWith('_shared');
           const targetUserId = isSharedIncluded ? selectedUser.replace('_shared', '') : selectedUser;
           
           const isTargetEntry = entry.userId === targetUserId;
           const isSharedTrip = entry.type === 'odometer' && entry.sharedTrip;

           if (isSharedIncluded) {
              if (!isTargetEntry && !isSharedTrip) return false;
           } else {
              if (!isTargetEntry) return false;
           }
        }
      }

      if (fromTimestamp !== null && entry.createdAt < fromTimestamp) {
        return false;
      }

      if (toTimestamp !== null && entry.createdAt > toTimestamp) {
        return false;
      }

      return true;
    });
  }, [category, entries, fromDate, selectedMonth, selectedUser, toDate, currentUser]);

  const sectionedRows = useMemo(() => {
    const groups = new Map<string, HistoryRow[]>();
    for (const row of rows) {
      const monthLabel = dayjs(row.entry.createdAt).format(INDIA_MONTH_FORMAT);
      if (!groups.has(monthLabel)) {
        groups.set(monthLabel, []);
      }
      groups.get(monthLabel)!.push(row);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [rows]);

  const resetFilters = () => {
    setCategory('all');
    setSelectedUser('all');
    setSelectedMonth('all');
    setFromDate(null);
    setToDate(null);
    setDatePreset('all');
    setActiveDateTarget(null);
    setIsDatePickerVisible(false);
  };

  const setDateForTarget = (target: DateTarget, date: Date | null) => {
    if (!date) {
      if (target === 'from') {
        setFromDate(null);
      } else {
        setToDate(null);
      }
      return;
    }

    let nextDate = dayjs(date).startOf('day');
    if (nextDate.isBefore(MIN_FILTER_DATE, 'day')) {
      nextDate = MIN_FILTER_DATE;
    }
    if (nextDate.isAfter(MAX_FILTER_DATE, 'day')) {
      nextDate = MAX_FILTER_DATE.startOf('day');
    }

    if (target === 'from') {
      setFromDate(nextDate.toDate());
      if (toDate && dayjs(toDate).isBefore(nextDate, 'day')) {
        setToDate(nextDate.toDate());
      }
      return;
    }

    const lowerLimit = fromDate ? dayjs(fromDate).startOf('day') : MIN_FILTER_DATE;
    if (nextDate.isBefore(lowerLimit, 'day')) {
      nextDate = lowerLimit;
    }
    setToDate(nextDate.toDate());
  };

  const applyDatePreset = (preset: DatePreset) => {
    const today = dayjs().endOf('day');
    setDatePreset(preset);

    if (preset === 'all') {
      setFromDate(null);
      setToDate(null);
      return;
    }

    if (preset === 'last7') {
      setFromDate(today.subtract(6, 'day').startOf('day').toDate());
      setToDate(today.toDate());
      return;
    }

    if (preset === 'last30') {
      setFromDate(today.subtract(29, 'day').startOf('day').toDate());
      setToDate(today.toDate());
      return;
    }

    if (preset === 'thisMonth') {
      setFromDate(today.startOf('month').toDate());
      setToDate(today.toDate());
      return;
    }
  };

  const openDatePicker = (target: DateTarget) => {
    setActiveDateTarget(target);
    setIsDatePickerVisible(true);
    setDatePreset('custom');
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      if (Platform.OS === 'android') {
        setIsDatePickerVisible(false);
      }
      return;
    }

    if (!selectedDate || !activeDateTarget) {
      return;
    }

    setDateForTarget(activeDateTarget, selectedDate);
    setDatePreset('custom');

    if (Platform.OS === 'android') {
      setIsDatePickerVisible(false);
    }
  };

  const pickerDate = useMemo(() => {
    if (activeDateTarget === 'from') {
      return fromDate ?? MIN_FILTER_DATE.toDate();
    }
    if (activeDateTarget === 'to') {
      return toDate ?? fromDate ?? dayjs().toDate();
    }
    return dayjs().toDate();
  }, [activeDateTarget, fromDate, toDate]);

  const handleSharedTripToggle = (row: HistoryRow) => {
    if (!currentUser || row.entry.sharedTrip || row.entry.type !== 'odometer' || row.entry.userId === currentUser.id) {
      return;
    }

    Alert.alert('Shared Trip', 'Mark this odometer entry as shared trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          void (async () => {
            try {
              await markEntrySharedTrip(row.entry.id, {
                userId: currentUser.id,
                userName: currentUser.name,
              });
              void runSyncCycle();
            } catch (error) {
              Alert.alert('Could not update entry', error instanceof Error ? error.message : 'Unknown error');
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View pointerEvents="none" style={[styles.orbTop, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)' }]} />

      <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>TIMELINE</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Car Timeline</Text>
          </View>

          <Pressable
            onPress={() => setIsFilterOpen((prev) => !prev)}
            hitSlop={12}
            style={[styles.filterToggleBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name={isFilterOpen ? 'tune' : 'filter-list'} size={18} color={colors.textPrimary} />
            {activeFilterPills.length > 0 ? (
              <View style={[styles.filterCountBadge, { backgroundColor: colors.textPrimary }]}>
                <Text style={[styles.filterCountText, { color: colors.invertedText }]}>{activeFilterPills.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Modal transparent statusBarTranslucent animationType="slide" visible={isFilterOpen} onRequestClose={() => setIsFilterOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsFilterOpen(false)} />
          <View style={styles.sheetAnchor}>
            <View style={[styles.sheet, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.filterHeadRow}>
                <View>
                  <Text style={[styles.filterHeadTitle, { color: colors.textPrimary }]}>Smart Filters</Text>
                  <Text style={[styles.filterHeadMeta, { color: colors.textSecondary }]}>{rows.length} entries matched</Text>
                </View>
                <Pressable onPress={resetFilters} hitSlop={12} style={[styles.clearBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>Clear</Text>
                </Pressable>
              </View>

              {activeFilterPills.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePillsRow}>
              {activeFilterPills.map((pill) => (
                <View key={pill} style={[styles.activePill, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.activePillText, { color: colors.textPrimary }]}>{pill}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.noFilterText, { color: colors.textSecondary }]}>No active filters</Text>
          )}

              <ScrollView contentContainerStyle={styles.filterInner} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Entry type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all', 'odometer', 'fuel', 'expense', 'spec_update'] as CategoryFilter[]).map((filter) => {
                const active = filter === category;
                const label =
                  filter === 'all'
                    ? 'All'
                    : filter === 'spec_update'
                      ? 'Specs Update'
                      : filter === 'expense'
                        ? 'Expense'
                        : filter.toUpperCase();

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setCategory(filter)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.filterChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Visibility Context</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {viewContextOptions.map((ctx) => {
                const active = selectedUser === ctx.id;
                return (
                  <Pressable
                    key={ctx.id}
                    onPress={() => setSelectedUser(ctx.id)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.filterChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {ctx.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {monthOptions.map((month) => {
                const active = month === selectedMonth;
                const label = month === 'all' ? 'All months' : dayjs(`${month}-01`).format(INDIA_MONTH_FORMAT);

                return (
                  <Pressable
                    key={month}
                    onPress={() => setSelectedMonth(month)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.filterChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date range</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(
                [
                  { id: 'all', label: 'All time' },
                  { id: 'last7', label: 'Last 7 days' },
                  { id: 'last30', label: 'Last 30 days' },
                  { id: 'thisMonth', label: 'This month' },
                ] as { id: DatePreset; label: string }[]
              ).map((option) => {
                const active = datePreset === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => applyDatePreset(option.id)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.filterChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.datePickerRow}>
              {(['from', 'to'] as DateTarget[]).map((target) => {
                const selected = target === 'from' ? fromDate : toDate;
                return (
                  <Pressable
                    key={target}
                    onPress={() => openDatePicker(target)}
                    style={[styles.datePickCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.datePickLabel, { color: colors.textSecondary }]}>
                      {target === 'from' ? 'From' : 'To'}
                    </Text>
                    <View style={styles.datePickValueRow}>
                      <MaterialIcons name="calendar-month" size={16} color={colors.textPrimary} />
                      <Text style={[styles.datePickValue, { color: colors.textPrimary }]}>
                        {selected ? dayjs(selected).format(INDIA_DATE_FORMAT) : 'Select date'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {isDatePickerVisible && activeDateTarget ? (
              <View style={[styles.nativePickerWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.nativePickerTop}>
                  <Text style={[styles.nativePickerTitle, { color: colors.textPrimary }]}>
                    Choose {activeDateTarget === 'from' ? 'From Date' : 'To Date'}
                  </Text>
                  {Platform.OS === 'ios' ? (
                    <Pressable onPress={() => setIsDatePickerVisible(false)}>
                      <Text style={[styles.nativePickerDone, { color: colors.textPrimary }]}>Done</Text>
                    </Pressable>
                  ) : null}
                </View>
                <DateTimePicker
                  mode="date"
                  value={pickerDate}
                  accentColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                  display={Platform.OS === 'ios' ? 'spinner' : undefined}
                  minimumDate={activeDateTarget === 'from' ? MIN_FILTER_DATE.toDate() : fromDate ?? MIN_FILTER_DATE.toDate()}
                  maximumDate={
                    activeDateTarget === 'from'
                      ? toDate && dayjs(toDate).isBefore(MAX_FILTER_DATE, 'day')
                        ? toDate
                        : MAX_FILTER_DATE.toDate()
                      : MAX_FILTER_DATE.toDate()
                  }
                  onChange={handleDatePickerChange}
                  positiveButton={Platform.OS === 'android' ? { label: 'Apply', textColor: colors.textPrimary } : undefined}
                  negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: colors.textSecondary } : undefined}
                  textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                  themeVariant={Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined}
                />
                <Text style={[styles.nativePickerHint, { color: colors.textSecondary }]}>
                  Range starts from {MIN_FILTER_DATE.format(INDIA_DATE_FORMAT)}
                </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>

      <SectionList
        sections={sectionedRows}
        keyExtractor={(item) => item.entry.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No trips recorded yet.</Text>}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.monthHeaderRow}>
            <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.monthHeaderText, { color: colors.textSecondary }]}>{title}</Text>
            <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item, index }) => (
          <HistoryItemCard
            entry={item.entry}
            distanceKm={item.distanceKm}
            tripStartOdometer={item.tripStartOdometer}
            tripEndOdometer={item.tripEndOdometer}
            index={index}
            canEdit={Boolean(currentUser && item.entry.userId === currentUser.id)}
            onPressEdit={() => {
              if (item.entry.type === 'fuel') {
                navigation.navigate('FuelEntryModal', { entryId: item.entry.id });
              } else if (item.entry.type === 'odometer') {
                navigation.navigate('StartingCarModal', { entryId: item.entry.id, mode: 'edit' });
              } else if (item.entry.type === 'expense') {
                navigation.navigate('ExpenseEntryModal', { entryId: item.entry.id });
              }
            }}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  orbTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -30,
    right: -50,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    marginBottom: 12,
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
  filterToggleBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetAnchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  filterHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filterHeadTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  filterHeadMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activePillsRow: {
    gap: 7,
    paddingRight: 10,
  },
  activePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  noFilterText: {
    fontSize: 12,
  },
  filterInner: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  filterRow: {
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  datePickLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  datePickValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickValue: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nativePickerWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  nativePickerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nativePickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nativePickerDone: {
    fontSize: 12,
    fontWeight: '700',
  },
  nativePickerHint: {
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  monthDivider: {
    flex: 1,
    height: 1,
  },
  monthHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  empty: {
    marginTop: 60,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
