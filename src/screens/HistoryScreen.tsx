import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((entry) => monthSet.add(dayjs(entry.createdAt).format('YYYY-MM')));
    return ['all', ...Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1))];
  }, [entries]);

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
  }, [category, entries, fromDate, selectedMonth, toDate]);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>HISTORY</Text>
        <View style={styles.iconPlaceholder} />
      </View>

      <View style={[styles.filtersPanel, { borderColor: colors.border, backgroundColor: colors.card }]}> 
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'odometer', 'fuel', 'spec_update'] as CategoryFilter[]).map((filter) => {
            const active = filter === category;
            const label =
              filter === 'all' ? 'ALL' : filter === 'spec_update' ? 'SPECS UPDATE' : filter.toUpperCase();

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

        <View style={styles.dateInputsRow}>
          <View style={styles.dateInputCell}>
            <AppTextField
              label="From Date"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.dateInputCell}>
            <AppTextField
              label="To Date"
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>
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
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  filtersPanel: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    gap: 8,
    marginBottom: 10,
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
