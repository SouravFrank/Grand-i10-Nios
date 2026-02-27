import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs } from '@/utils/day';

type HistoryItemCardProps = {
  entry: EntryRecord;
  distanceKm: number | null;
  index: number;
};

function prettyFieldName(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function HistoryItemCard({ entry, distanceKm, index }: HistoryItemCardProps) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: Math.min(index * 40, 280),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        delay: Math.min(index * 40, 280),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const entryTypeLabel =
    entry.type === 'fuel' ? 'FUEL ENTRY' : entry.type === 'spec_update' ? 'SPECS UPDATE' : 'ODOMETER';

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={styles.topRow}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{entry.userName.toUpperCase()}</Text>
          <Text style={[styles.separator, { color: colors.textSecondary }]}>|</Text>
          <Text style={[styles.entryType, { color: colors.textSecondary }]}>{entryTypeLabel}</Text>
        </View>

        <Text style={[styles.odometer, { color: colors.textPrimary }]}>
          {entry.type === 'spec_update' ? 'SPECIFICATIONS UPDATED' : `${entry.odometer} km`}
        </Text>

        {entry.type === 'fuel' ? (
          <Text style={[styles.fuelMeta, { color: colors.textSecondary }]}>
            {entry.fuelAmount ? `₹${entry.fuelAmount}` : ''}
            {entry.fuelAmount && entry.fuelLiters ? ' | ' : ''}
            {entry.fuelLiters ? `${entry.fuelLiters} L` : ''}
            {entry.fullTank ? ' | FULL TANK' : ''}
          </Text>
        ) : null}

        {entry.type === 'spec_update' && entry.specUpdatedFields?.length ? (
          <Text style={[styles.fuelMeta, { color: colors.textSecondary }]}>
            UPDATED: {entry.specUpdatedFields.map((field) => prettyFieldName(field)).join(', ').toUpperCase()}
          </Text>
        ) : null}

        {typeof entry.cost === 'number' ? (
          <Text style={[styles.fuelMeta, { color: colors.textSecondary }]}>COST: ₹{entry.cost}</Text>
        ) : null}

        <View style={[styles.bottomRow, { borderTopColor: colors.border }]}> 
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {dayjs(entry.createdAt).format('DD MMM YYYY, hh:mm A')}
          </Text>
          {distanceKm !== null && entry.type !== 'spec_update' ? (
            <Text style={[styles.distance, { color: colors.textSecondary }]}>DISTANCE TRAVELLED: {distanceKm} KM</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  separator: {
    fontSize: 13,
  },
  entryType: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  odometer: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  fuelMeta: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  bottomRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4,
  },
  date: {
    fontSize: 12,
  },
  distance: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
