import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppTextField } from '@/components/AppTextField';
import { HistoryItemCard } from '@/components/HistoryItemCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord, EntryType } from '@/types/models';
import { dayjs } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'History'>;

type HistoryRow = {
  entry: EntryRecord;
  distanceKm: number | null;
};

type CategoryFilter = 'all' | EntryType;

function buildHistoryRows(entries: EntryRecord[]): HistoryRow[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  return sorted.map((entry, index) => {
    const previous = sorted[index + 1];
    if (!previous || entry.type === 'spec_update' || previous.type === 'spec_update') {
      return { entry, distanceKm: null };
    }

    const distanceKm = entry.odometer - previous.odometer;
    return {
      entry,
      distanceKm: distanceKm >= 0 ? distanceKm : null,
    };
  });
}

function parseDateInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = dayjs(value.trim());
  return parsed.isValid() ? parsed.valueOf() : null;
}

export function HistoryScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const entries = useAppStore((state) => state.entries);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: isFilterOpen ? 1 : 0,
      duration: 190,
      useNativeDriver: false,
    }).start();
  }, [filterAnim, isFilterOpen]);

  const userOptions = useMemo(() => {
    const userMap = new Map<string, string>();
    entries.forEach((entry) => {
      if (!userMap.has(entry.userId)) {
        userMap.set(entry.userId, entry.userName);
      }
    });
    return [{ id: 'all', name: 'ALL USERS' }, ...Array.from(userMap.entries()).map(([id, name]) => ({ id, name }))];
  }, [entries]);

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
      const userName = userOptions.find((user) => user.id === selectedUser)?.name;
      if (userName) {
        pills.push(userName);
      }
    }

    if (selectedMonth !== 'all') {
      pills.push(dayjs(`${selectedMonth}-01`).format('MMM YYYY'));
    }

    if (fromDate) {
      pills.push(`From ${fromDate}`);
    }

    if (toDate) {
      pills.push(`To ${toDate}`);
    }

    return pills;
  }, [category, fromDate, selectedMonth, selectedUser, toDate, userOptions]);

  const rows = useMemo(() => {
    const baseRows = buildHistoryRows(entries);
    const fromTimestamp = parseDateInput(fromDate);
    const toTimestamp = parseDateInput(toDate);

    return baseRows.filter((row) => {
      const entry = row.entry;

      if (category !== 'all' && entry.type !== category) {
        return false;
      }

      if (selectedMonth !== 'all' && dayjs(entry.createdAt).format('YYYY-MM') !== selectedMonth) {
        return false;
      }

      if (selectedUser !== 'all' && entry.userId !== selectedUser) {
        return false;
      }

      if (fromTimestamp !== null && entry.createdAt < fromTimestamp) {
        return false;
      }

      if (toTimestamp !== null) {
        const endOfDay = dayjs(toTimestamp).endOf('day').valueOf();
        if (entry.createdAt > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [category, entries, fromDate, selectedMonth, selectedUser, toDate]);

  const resetFilters = () => {
    setCategory('all');
    setSelectedUser('all');
    setSelectedMonth('all');
    setFromDate('');
    setToDate('');
  };

  const animatedFilterStyle = {
    maxHeight: filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 420],
    }),
    opacity: filterAnim,
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.title, { color: colors.textPrimary }]}>HISTORY</Text>

        <Pressable
          onPress={() => setIsFilterOpen((prev) => !prev)}
          style={[styles.filterToggleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <MaterialIcons name={isFilterOpen ? 'filter-list-off' : 'filter-list'} size={19} color={colors.textPrimary} />
          {activeFilterPills.length > 0 ? (
            <View style={[styles.filterCountBadge, { backgroundColor: colors.textPrimary }]}>
              <Text style={[styles.filterCountText, { color: colors.invertedText }]}>{activeFilterPills.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.filterShell, { borderColor: colors.border, backgroundColor: colors.card }]}> 
        <View style={styles.filterHeadRow}>
          <Text style={[styles.filterHeadTitle, { color: colors.textPrimary }]}>Filters</Text>
          <View style={styles.filterHeadActions}>
            <Text style={[styles.filterHeadMeta, { color: colors.textSecondary }]}>{rows.length} entries</Text>
            <Pressable onPress={resetFilters}>
              <Text style={[styles.clearText, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {activeFilterPills.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePillsRow}>
            {activeFilterPills.map((pill) => (
              <View key={pill} style={[styles.activePill, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}> 
                <Text style={[styles.activePillText, { color: colors.textPrimary }]}>{pill.toUpperCase()}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.noFilterText, { color: colors.textSecondary }]}>No active filters</Text>
        )}

        <Animated.View style={[styles.filterContentWrap, animatedFilterStyle]}>
          <View style={styles.filterInner}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Entry Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all', 'odometer', 'fuel', 'spec_update'] as CategoryFilter[]).map((filter) => {
                const active = filter === category;
                const label = filter === 'all' ? 'ALL' : filter === 'spec_update' ? 'SPECS UPDATE' : filter.toUpperCase();

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setCategory(filter)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.backgroundSecondary : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>User</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {userOptions.map((user) => {
                const active = selectedUser === user.id;
                return (
                  <Pressable
                    key={user.id}
                    onPress={() => setSelectedUser(user.id)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.backgroundSecondary : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>
                      {user.name.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {monthOptions.map((month) => {
                const active = month === selectedMonth;
                const label = month === 'all' ? 'ALL MONTHS' : dayjs(`${month}-01`).format('MMM YYYY').toUpperCase();

                return (
                  <Pressable
                    key={month}
                    onPress={() => setSelectedMonth(month)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.backgroundSecondary : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date Range</Text>
            <View style={styles.dateInputsRow}>
              <View style={styles.dateInputCell}>
                <AppTextField
                  label="From"
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInputCell}>
                <AppTextField
                  label="To"
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.entry.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No trips recorded yet.</Text>}
        renderItem={({ item, index }) => (
          <HistoryItemCard entry={item.entry} distanceKm={item.distanceKm} index={index} />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  filterToggleBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  filterShell: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  filterHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filterHeadTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterHeadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterHeadMeta: {
    fontSize: 12,
  },
  clearText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  activePillsRow: {
    gap: 7,
    paddingRight: 10,
  },
  activePill: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.45,
  },
  noFilterText: {
    fontSize: 12,
  },
  filterContentWrap: {
    overflow: 'hidden',
  },
  filterInner: {
    gap: 9,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filterRow: {
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInputCell: {
    flex: 1,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    marginTop: 60,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
