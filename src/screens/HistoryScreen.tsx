import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { HistoryItemCard } from '@/components/HistoryItemCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';

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

export function HistoryScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const entries = useAppStore((state) => state.entries);

  const rows = useMemo(() => buildHistoryRows(entries), [entries]);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>BACK</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>HISTORY</Text>
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
  backText: {
    fontSize: 12,
    letterSpacing: 0.8,
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
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
