import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
    Pressable,
    SectionList,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { HistoryItemCard } from '@/components/HistoryItemCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SmartFilterSheet, type CategoryFilter, type DatePreset, type DateTarget } from '@/components/SmartFilterSheet';
import { TripGroupCard } from '@/components/TripGroupCard';
import type { AppStackParamList } from '@/navigation/types';
import { DEFAULT_MONTHLY_MILEAGE } from '@/screens/reporting/reportCalculations';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';
import { getEntryOwnerId } from '@/utils/entryOwnership';

type Props = NativeStackScreenProps<AppStackParamList, 'History'>;

type HistoryRow = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer: number | null;
  tripEndOdometer: number | null;
  tripTotalCost: number;
  tripTotalFuelCost: number;
};

type ExpenseSubcategory = 'fasttag' | 'car_maintenance' | 'parking' | 'traffic_violation' | 'others';

const MIN_FILTER_DATE = dayjs('2026-02-01').startOf('day');
const MAX_FILTER_DATE = dayjs().endOf('day');

function canEditEntry(entry: EntryRecord, currentUserId?: string | null) {
  if (!currentUserId) {
    return false;
  }
  return getEntryOwnerId(entry) === currentUserId;
}

function resolveMonthMileage(monthKey: string, mileageByMonth: Record<string, number>): number {
  const saved = mileageByMonth[monthKey];
  return Number.isFinite(saved) ? saved : DEFAULT_MONTHLY_MILEAGE;
}

function getFuelAmount(entry: EntryRecord): number | null {
  if (entry.type !== 'fuel') return null;
  const amount = typeof entry.fuelAmount === 'number' ? entry.fuelAmount : entry.cost;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
}

function getFuelLiters(entry: EntryRecord): number | null {
  if (entry.type !== 'fuel') return null;
  return typeof entry.fuelLiters === 'number' && Number.isFinite(entry.fuelLiters)
    ? entry.fuelLiters
    : null;
}

// Entries that belong to a trip card: fuel fills, parking, FASTag toll
// payments and traffic fines. Other expenses (maintenance, purchases, annual
// pass, recharges…) and car records (spec updates, standalone odometer
// readings) stay as standalone timeline rows.
function isTripEntry(entry: EntryRecord): boolean {
  if (entry.type === 'fuel') return true;
  if (entry.type !== 'expense') return false;
  return (
    entry.expenseCategory === 'parking' ||
    entry.expenseCategory === 'fasttag_toll_paid' ||
    entry.expenseCategory === 'traffic_violation_fine'
  );
}

// Fuel logged at the pump minutes before the trip starts shares the trip's
// start odometer; the guard keeps far-away-in-time entries from matching a
// trip through a coincidental odometer reading alone.
const TRIP_MEMBER_TIME_GUARD_MS = 12 * 60 * 60 * 1000;

type TripWindow = {
  tripId: string;
  startTs: number;
  endTs: number;
  startOdo: number;
  endOdo: number;
};

function buildCompleteTripWindows(entries: EntryRecord[]): TripWindow[] {
  const trips = new Map<string, { start?: EntryRecord; end?: EntryRecord }>();
  for (const entry of entries) {
    if (entry.type !== 'odometer' || !entry.tripId || !entry.tripStage) {
      continue;
    }
    const bucket = trips.get(entry.tripId) ?? {};
    if (entry.tripStage === 'start') bucket.start = entry;
    if (entry.tripStage === 'end') bucket.end = entry;
    trips.set(entry.tripId, bucket);
  }

  return Array.from(trips.entries())
    .filter(([, trip]) => trip.start && trip.end)
    .map(([tripId, trip]) => ({
      tripId,
      startTs: trip.start!.createdAt,
      endTs: trip.end!.createdAt,
      startOdo: trip.start!.odometer,
      endOdo: trip.end!.odometer,
    }));
}

/**
 * Single source of truth for trip membership: assigns each fuel/parking/FASTag
 * entry to exactly ONE complete trip (latest-starting window wins — a fill at
 * the reading where one trip ended and the next began belongs to the trip it
 * was filled for). Both the trip card totals and the accordion children are
 * derived from this map, so the strip numbers always equal the rows shown.
 */
function assignTripMembers(entries: EntryRecord[]): Map<string, EntryRecord[]> {
  // Latest-starting window first, so boundary entries resolve to the newer trip.
  const windows = buildCompleteTripWindows(entries).sort((a, b) => b.startTs - a.startTs);

  const membersByTripId = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    if (!isTripEntry(entry)) continue;
    const window = windows.find((w) => {
      const inTimeWindow = entry.createdAt >= w.startTs && entry.createdAt <= w.endTs;
      const inOdometerRange =
        entry.odometer >= w.startOdo &&
        entry.odometer <= w.endOdo &&
        entry.createdAt >= w.startTs - TRIP_MEMBER_TIME_GUARD_MS &&
        entry.createdAt <= w.endTs + TRIP_MEMBER_TIME_GUARD_MS;
      return inTimeWindow || inOdometerRange;
    });
    if (!window) continue;
    const list = membersByTripId.get(window.tripId);
    if (list) {
      list.push(entry);
    } else {
      membersByTripId.set(window.tripId, [entry]);
    }
  }

  return membersByTripId;
}

function buildHistoryRows(entries: EntryRecord[], mileageByMonth: Record<string, number>): HistoryRow[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  // Weighted average fuel price across all fills logged up to a timestamp —
  // used to estimate a trip's fuel cost when nothing was logged inside it.
  function getWeightedAvgFuelRateUpTo(timestamp: number): number {
    let totalLiters = 0;
    let totalValue = 0;

    for (const entry of sorted) {
      if (entry.type !== 'fuel' || entry.createdAt > timestamp) continue;
      const liters = getFuelLiters(entry);
      const amount = getFuelAmount(entry);
      if (liters && amount) {
        totalLiters += liters;
        totalValue += amount;
      }
    }

    return totalLiters > 0 ? totalValue / totalLiters : 0;
  }

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

  const membersByTripId = assignTripMembers(entries);

  // Non-fuel spend assigned to the trip (parking, FASTag, fines). Fuel refill
  // money is NOT trip cost — the trip's fuel cost is consumption-based
  // (distance ÷ mileage × avg fuel rate) and is computed by the caller.
  function getTripOtherCost(tripId: string): number {
    let otherCost = 0;

    for (const member of membersByTripId.get(tripId) ?? []) {
      if (member.type === 'fuel') continue;
      if (typeof member.cost === 'number') {
        otherCost += member.cost;
      }
    }

    return otherCost;
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

        // Fuel cost of the trip = what the distance actually consumed:
        // distance ÷ month's mileage × weighted average fuel rate. Total =
        // that fuel cost + the other spend assigned to the trip.
        const monthKey = dayjs(entry.createdAt).format('YYYY-MM');
        const mileage = resolveMonthMileage(monthKey, mileageByMonth);
        const avgFuelRate = getWeightedAvgFuelRateUpTo(entry.createdAt);
        const fuelCost =
          distanceKm > 0 && mileage > 0 && avgFuelRate > 0
            ? (distanceKm * avgFuelRate) / mileage
            : 0;
        const otherCost = getTripOtherCost(entry.tripId);

        rows.push({
          entry,
          distanceKm: distanceKm > 0 ? distanceKm : null,
          tripStartOdometer: start.odometer,
          tripEndOdometer: entry.odometer,
          tripTotalCost: fuelCost + otherCost,
          tripTotalFuelCost: fuelCost,
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
        tripTotalCost: 0,
        tripTotalFuelCost: 0,
      });
      continue;
    }

    visited.add(entry.id);
    rows.push({
      entry,
      distanceKm: null,
      tripStartOdometer: null,
      tripEndOdometer: null,
      tripTotalCost: 0,
      tripTotalFuelCost: 0,
    });
  }

  return rows;
}

type TripGroupData = {
  tripId: string;
  endEntry: EntryRecord;
  members: HistoryRow[];
  summary: {
    distanceKm: number | null;
    tripStartOdometer: number | null;
    tripEndOdometer: number | null;
    tripTotalCost: number;
    tripTotalFuelCost: number;
  };
};

type TimelineItem =
  | { kind: 'entry'; key: string; row: HistoryRow; positionTs: number }
  | { kind: 'trip-group'; key: string; group: TripGroupData; positionTs: number };

/**
 * Groups the flat history rows into accordion trip groups for the unfiltered
 * view. Members come from assignTripMembers — the same map the trip card
 * totals are summed from — so the strip numbers always equal the child rows
 * shown. Other expenses and car records stay as standalone rows.
 */
function buildGroupedTimeline(rows: HistoryRow[], entries: EntryRecord[]): TimelineItem[] {
  // Complete trips are already merged into summary rows by buildHistoryRows.
  const groupRowByTripId = new Map<string, HistoryRow>();
  for (const row of rows) {
    const entry = row.entry;
    if (entry.type !== 'odometer' || entry.tripStage !== 'end' || !entry.tripId) continue;
    if (row.tripStartOdometer === null || row.tripEndOdometer === null) continue;
    groupRowByTripId.set(entry.tripId, row);
  }

  const rowByEntryId = new Map(rows.map((row) => [row.entry.id, row]));
  const assignedEntries = assignTripMembers(entries);

  const membersByTripId = new Map<string, HistoryRow[]>();
  const memberRowIds = new Set<string>();
  for (const [tripId, tripEntries] of assignedEntries) {
    if (!groupRowByTripId.has(tripId)) continue;
    const memberRows = tripEntries
      .map((entry) => rowByEntryId.get(entry.id))
      .filter((row): row is HistoryRow => Boolean(row));
    membersByTripId.set(
      tripId,
      memberRows.sort((a, b) => a.entry.createdAt - b.entry.createdAt),
    );
    for (const row of memberRows) {
      memberRowIds.add(row.entry.id);
    }
  }

  const items: TimelineItem[] = [];
  for (const row of rows) {
    if (memberRowIds.has(row.entry.id)) continue;
    if (
      row.entry.type === 'odometer' &&
      row.entry.tripId &&
      groupRowByTripId.has(row.entry.tripId)
    ) {
      continue;
    }
    items.push({ kind: 'entry', key: row.entry.id, row, positionTs: row.entry.createdAt });
  }

  for (const [tripId, row] of groupRowByTripId) {
    items.push({
      kind: 'trip-group',
      key: `trip-${tripId}`,
      positionTs: row.entry.createdAt,
      group: {
        tripId,
        endEntry: row.entry,
        members: membersByTripId.get(tripId) ?? [],
        summary: {
          distanceKm: row.distanceKm,
          tripStartOdometer: row.tripStartOdometer,
          tripEndOdometer: row.tripEndOdometer,
          tripTotalCost: row.tripTotalCost,
          tripTotalFuelCost: row.tripTotalFuelCost,
        },
      },
    });
  }

  items.sort((a, b) => b.positionTs - a.positionTs);
  return items;
}

export function HistoryScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const entries = useAppStore((state) => state.entries);
  const currentUser = useAppStore((state) => state.currentUser);
  const reportMileageByMonth = useAppStore((state) => state.reportMileageByMonth);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [activeDateTarget, setActiveDateTarget] = useState<DateTarget | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedTripIds, setExpandedTripIds] = useState<Set<string>>(() => new Set());

  const toggleTripGroup = (tripId: string) => {
    setExpandedTripIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const navigateToEdit = (entry: EntryRecord) => {
    if (entry.type === 'fuel') {
      navigation.navigate('FuelEntryModal', { entryId: entry.id });
    } else if (entry.type === 'odometer') {
      navigation.navigate('StartingCarModal', { entryId: entry.id, mode: 'edit' });
    } else if (entry.type === 'expense') {
      navigation.navigate('ExpenseEntryModal', { entryId: entry.id });
    }
  };

  const closeFilterModal = () => {
    setIsFilterOpen(false);
  };

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
    const opts = [{ id: 'all', name: 'All Entries' }];
    
    const ayan = userOptions.find(u => u.name.toLowerCase().includes('ayan'));
    const sourav = userOptions.find(u => u.name.toLowerCase().includes('sourav'));
    
    if (ayan) opts.push({ id: ayan.id, name: `${ayan.name} Only` });
    if (sourav) opts.push({ id: sourav.id, name: `${sourav.name} Only` });
    
    opts.push({ id: 'shared_only', name: 'Shared Trips Only' });
    
    if (ayan) opts.push({ id: `${ayan.id}_shared`, name: `${ayan.name} + Shared` });
    if (sourav) opts.push({ id: `${sourav.id}_shared`, name: `${sourav.name} + Shared` });
    
    userOptions.forEach((user) => {
      if (user.id !== 'all' && user.id !== ayan?.id && user.id !== sourav?.id) {
        opts.push({ id: user.id, name: `${user.name} Only` });
        opts.push({ id: `${user.id}_shared`, name: `${user.name} + Shared` });
      }
    });

    return opts;
  }, [userOptions]);

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((entry) => monthSet.add(dayjs(entry.createdAt).format('YYYY-MM')));
    return ['all', ...Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1))];
  }, [entries]);

  const activeFilterPills = useMemo(() => {
    const pills: string[] = [];

    if (category !== 'all') {
      const labelMap: Record<CategoryFilter, string> = {
        all: 'All',
        odometer: 'Odometer',
        fuel: 'Fuel',
        expense_fasttag: 'Fastag',
        expense_car_maintenance: 'Car Maintenance',
        expense_parking: 'Parking',
        expense_traffic_violation: 'Traffic Violation',
        expense_others: 'Others',
        spec_update: 'Specs Update',
      };
      pills.push(labelMap[category]);
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
    const baseRows = buildHistoryRows(entries, reportMileageByMonth);
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

      if (category !== 'all') {
        if (category.startsWith('expense_')) {
          if (entry.type !== 'expense') return false;
          const subcategory = category.replace('expense_', '') as ExpenseSubcategory;

          // Special handling for fasttag - includes toll paid, recharges and annual pass records
          if (subcategory === 'fasttag') {
            const isTollPaid = entry.expenseCategory === 'fasttag_toll_paid';
            const isFastagRecharge = entry.expenseCategory === 'utility_addon' &&
              entry.expenseTitle &&
              (entry.expenseTitle.toLowerCase().includes('fastag') || entry.expenseTitle.toLowerCase().includes('fast tag')) &&
              entry.expenseTitle.toLowerCase().includes('recharge');
            const isAnnualPass = entry.expenseCategory === 'annual_pass_purchase' || entry.expenseCategory === 'annual_pass_deduction';
            if (!isTollPaid && !isFastagRecharge && !isAnnualPass) return false;
          } else {
            const expenseCategoryMap: Record<Exclude<ExpenseSubcategory, 'fasttag'>, string[]> = {
              car_maintenance: ['maintenance_lab', 'shield_safety', 'care_comfort', 'utility_addon'],
              parking: ['parking'],
              traffic_violation: ['traffic_violation_fine'],
              others: ['other', 'purchase'],
            };
            const allowedCategories = expenseCategoryMap[subcategory];
            if (!allowedCategories?.includes(entry.expenseCategory || '')) return false;
          }
        } else if (entry.type !== category) {
          return false;
        }
      }

      if (selectedMonth !== 'all' && dayjs(entry.createdAt).format('YYYY-MM') !== selectedMonth) {
        return false;
      }

      if (selectedUser !== 'all') {
        if (selectedUser === 'shared_only') {
           const isSharedTrip = entry.type === 'odometer' && entry.sharedTrip;
           if (!isSharedTrip) return false;
        } else {
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

  const hasActiveFilters =
    category !== 'all' ||
    selectedUser !== 'all' ||
    selectedMonth !== 'all' ||
    datePreset !== 'all' ||
    fromDate !== null ||
    toDate !== null;

  const timelineItems = useMemo(() => {
    // Grouped view only when no filter is active; filtered views stay flat.
    if (hasActiveFilters) {
      return rows.map((row) => ({
        kind: 'entry' as const,
        key: row.entry.id,
        row,
        positionTs: row.entry.createdAt,
      }));
    }
    return buildGroupedTimeline(rows, entries);
  }, [rows, entries, hasActiveFilters]);

  const sectionedRows = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    for (const item of timelineItems) {
      const monthLabel = dayjs(item.positionTs).format(INDIA_MONTH_FORMAT);
      if (!groups.has(monthLabel)) {
        groups.set(monthLabel, []);
      }
      groups.get(monthLabel)!.push(item);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [timelineItems]);

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
            onPress={() => navigation.navigate('Report')}
            hitSlop={12}
            style={[styles.reportToggleBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons name="assessment" size={18} color={colors.textPrimary} />
          </Pressable>

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

      <SmartFilterSheet
        isOpen={isFilterOpen}
        isRendered={isFilterOpen}
        onClose={closeFilterModal}
        category={category}
        onCategoryChange={setCategory}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        datePreset={datePreset}
        onDatePresetChange={applyDatePreset}
        fromDate={fromDate}
        toDate={toDate}
        onDateChange={setDateForTarget}
        viewContextOptions={viewContextOptions}
        monthOptions={monthOptions}
        matchedCount={rows.length}
        activeFilterPills={activeFilterPills}
        isDatePickerVisible={isDatePickerVisible}
        onDatePickerVisibilityChange={setIsDatePickerVisible}
        activeDateTarget={activeDateTarget}
        onActiveDateTargetChange={setActiveDateTarget}
        onReset={resetFilters}
        minDate={MIN_FILTER_DATE.toDate()}
        maxDate={MAX_FILTER_DATE.toDate()}
      />

      <SectionList
        sections={sectionedRows}
        keyExtractor={(item) => item.key}
        extraData={expandedTripIds}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No trips recorded yet.</Text>}
        ListHeaderComponent={
          !hasActiveFilters && timelineItems.length > 0 ? (
            <Text style={[styles.groupHint, { color: colors.textSecondary }]}>
              Fuel &amp; stops are grouped inside their trips — tap a trip to expand.
            </Text>
          ) : null
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.monthHeaderRow}>
            <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.monthHeaderText, { color: colors.textSecondary }]}>{title}</Text>
            <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item, index }) => {
          if (item.kind === 'trip-group') {
            const { group } = item;
            return (
              <TripGroupCard
                endEntry={group.endEntry}
                members={group.members}
                summary={group.summary}
                expanded={expandedTripIds.has(group.tripId)}
                onToggle={() => toggleTripGroup(group.tripId)}
                canEditTrip={canEditEntry(group.endEntry, currentUser?.id)}
                onPressEditTrip={() => navigateToEdit(group.endEntry)}
                canEditMember={(entry) => canEditEntry(entry, currentUser?.id)}
                onPressEditMember={navigateToEdit}
              />
            );
          }

          const row = item.row;
          return (
            <HistoryItemCard
              entry={row.entry}
              distanceKm={row.distanceKm}
              tripStartOdometer={row.tripStartOdometer}
              tripEndOdometer={row.tripEndOdometer}
              tripTotalCost={row.tripTotalCost}
              tripTotalFuelCost={row.tripTotalFuelCost}
              index={index}
              canEdit={canEditEntry(row.entry, currentUser?.id)}
              onPressEdit={() => navigateToEdit(row.entry)}
            />
          );
        }}
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
  reportToggleBtn: {
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
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  groupHint: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 16,
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
