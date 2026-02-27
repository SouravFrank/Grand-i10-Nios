import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import type { EntryRecord } from '@/types/models';
import { dayjs } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'History'>;

type HistoryRow = {
  entry: EntryRecord;
  distanceKm: number | null;
};

function buildHistoryRows(entries: EntryRecord[]): HistoryRow[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  return sorted.map((entry, index) => {
    const previous = sorted[index + 1];
    if (!previous) {
      return { entry, distanceKm: null };
    }

    const distanceKm = entry.odometer - previous.odometer;
    return {
      entry,
      distanceKm: distanceKm >= 0 ? distanceKm : null,
    };
  });
}

export function HistoryScreen(_: Props) {
  const entries = useAppStore((state) => state.entries);

  const rows = useMemo(() => buildHistoryRows(entries), [entries]);

  return (
    <ScreenContainer>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.entry.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No history available yet.</Text>}
        renderItem={({ item }) => {
          const { entry, distanceKm } = item;

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.user}>{entry.userName}</Text>
                <Text style={styles.date}>{dayjs(entry.createdAt).format('DD MMM YYYY, hh:mm A')}</Text>
              </View>

              <Text style={styles.type}>{entry.type === 'fuel' ? 'Fuel Entry' : 'Odometer Update'}</Text>
              <Text style={styles.odometer}>{entry.odometer} km</Text>

              {entry.type === 'fuel' ? (
                <Text style={styles.meta}>
                  {entry.fuelAmount ? `₹${entry.fuelAmount}` : ''}
                  {entry.fuelAmount && entry.fuelLiters ? ' • ' : ''}
                  {entry.fuelLiters ? `${entry.fuelLiters} L` : ''}
                  {entry.fullTank ? ' • Full tank' : ''}
                </Text>
              ) : null}

              {distanceKm !== null ? (
                <Text style={styles.distance}>Distance travelled: {distanceKm} km</Text>
              ) : null}

              <Text style={[styles.sync, { color: entry.synced ? colors.success : colors.warning }]}>
                {entry.synced ? 'Synced' : 'Queued'}
              </Text>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  user: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  type: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  odometer: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  distance: {
    marginTop: 4,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  sync: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
