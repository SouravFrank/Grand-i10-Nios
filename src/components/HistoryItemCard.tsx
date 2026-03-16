import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, normalizeIndianDate } from '@/utils/day';
import Swipeable from 'react-native-gesture-handler/Swipeable';

type HistoryItemCardProps = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer?: number | null;
  tripEndOdometer?: number | null;
  index: number;
  canEdit?: boolean;
  onPressEdit?: () => void;
};

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function prettyFieldName(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpecHistoryValue(value: string): string {
  const normalized = normalizeIndianDate(value);
  return normalized === value ? value : normalized;
}

export function HistoryItemCard({
  entry,
  distanceKm,
  tripStartOdometer = null,
  tripEndOdometer = null,
  index,
  canEdit,
  onPressEdit,
}: HistoryItemCardProps) {
  const { colors, isDark } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  const accentHex =
    entry.type === 'fuel'
      ? '#F59E0B'
      : entry.type === 'odometer'
        ? '#0EA5E9'
        : entry.type === 'expense'
          ? '#22C55E'
          : '#A855F7';
  const accentBorder = hexToRgba(accentHex, isDark ? 0.45 : 0.32);
  const accentTone = hexToRgba(accentHex, isDark ? 0.18 : 0.12);
  const accentIconColor = accentHex;

  const isTripSummary =
    entry.type === 'odometer' &&
    Boolean(entry.tripId) &&
    typeof tripStartOdometer === 'number' &&
    typeof tripEndOdometer === 'number';

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
    isTripSummary
      ? 'TRIP'
      : entry.type === 'odometer' && entry.tripStage === 'start'
      ? 'TRIP START'
      : entry.type === 'odometer' && entry.tripStage === 'end'
        ? 'TRIP END'
        : entry.type === 'fuel'
      ? 'FUEL ENTRY'
      : entry.type === 'spec_update'
        ? 'SPECS UPDATE'
        : entry.type === 'expense'
          ? 'EXPENSE ENTRY'
          : 'ODOMETER';

  const expenseCategoryLabel =
    entry.expenseCategory === 'shield_safety'
      ? 'SHIELD & SAFETY'
      : entry.expenseCategory === 'care_comfort'
        ? 'CARE & COMFORT'
        : entry.expenseCategory === 'maintenance_lab'
          ? 'MAINTENANCE LAB'
          : entry.expenseCategory === 'utility_addon'
            ? 'UTILITY ADD-ONS'
            : entry.expenseCategory === 'purchase'
              ? 'PURCHASE'
            : entry.expenseCategory === 'traffic_violation_fine'
              ? 'TRAFFIC VIOLATION FINE'
              : entry.expenseCategory === 'fasttag_toll_paid'
                ? 'FASTAG TOLL PAID'
                : entry.expenseCategory === 'other'
                  ? 'OTHER'
                  : null;

  const specUpdateLines =
    entry.specUpdateDetails?.map((detail) => {
      const label = detail.label || prettyFieldName(detail.field);
      return `${label}: ${normalizeSpecHistoryValue(detail.previousValue)} -> ${normalizeSpecHistoryValue(detail.nextValue)}`;
    }) ??
    entry.specUpdatedFields?.map((field) => `Updated: ${prettyFieldName(field)}`) ??
    [];

  const entryIcon =
    entry.type === 'fuel'
      ? 'local-gas-station'
      : entry.type === 'spec_update'
        ? 'tune'
        : entry.type === 'expense'
          ? 'receipt-long'
          : 'speed';

  const primaryText =
    entry.type === 'spec_update'
      ? specUpdateLines[0] ?? 'Specifications updated'
      : entry.type === 'expense'
        ? entry.expenseTitle || 'Expense logged'
        : isTripSummary
          ? `${tripStartOdometer} -> ${tripEndOdometer} km`
        : `${entry.odometer} km`;

  const detailChips: Array<{ icon: keyof typeof MaterialIcons.glyphMap; text: string; size?: 'large' | 'small' }> = [];

  if (entry.type === 'fuel') {
    const amount = typeof entry.fuelAmount === 'number' ? entry.fuelAmount : typeof entry.cost === 'number' ? entry.cost : null;
    const liters = typeof entry.fuelLiters === 'number' ? entry.fuelLiters : null;

    if (typeof amount === 'number') {
      detailChips.push({ icon: 'currency-rupee', text: `${amount}`, size: 'large' });
    }
    if (typeof liters === 'number') {
      detailChips.push({ icon: 'water-drop', text: `${liters} L`, size: 'large' });
    }
    if (typeof amount === 'number' && typeof liters === 'number' && liters > 0) {
      const perLiter = amount / liters;
      if (Number.isFinite(perLiter)) {
        detailChips.push({ icon: 'calculate', text: `Rs ${perLiter.toFixed(2)}/L` });
      }
    }
    if (entry.fullTank) {
      detailChips.push({ icon: 'check-circle', text: 'Full tank' });
    }
  }

  if (entry.type === 'expense') {
    if (typeof entry.cost === 'number') {
      detailChips.push({ icon: 'currency-rupee', text: `${entry.cost}`, size: 'large' });
    }
    detailChips.push({ icon: 'speed', text: `${entry.odometer} km`, size: 'large' });
    if (expenseCategoryLabel) {
      detailChips.push({ icon: 'sell', text: expenseCategoryLabel, size: 'small' });
    }
  }

  if (isTripSummary) {
    if (distanceKm !== null) {
      detailChips.push({ icon: 'route', text: `${distanceKm} km` });
    }
  } else {
    if (entry.type === 'odometer' && entry.tripStage === 'start') {
      detailChips.push({ icon: 'play-arrow', text: 'Trip started' });
    }
    if (entry.type === 'odometer' && entry.tripStage === 'end' && typeof entry.tripDistanceKm === 'number') {
      detailChips.push({ icon: 'route', text: `${entry.tripDistanceKm} km` });
    }
  }

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}>
      <Swipeable
        renderRightActions={() => {
          if (!canEdit) return null;
          return (
            <View style={styles.swipeActionWrap}>
              <Pressable
                onPress={onPressEdit}
                style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="edit" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          );
        }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentBorder }]}> 
          <View style={styles.topRow}>
            <View style={[styles.typeIconWrap, { backgroundColor: accentTone }]}>
              <MaterialIcons name={entryIcon} size={18} color={accentIconColor} />
            </View>

            <View style={styles.topCopy}>
              <View style={styles.metaRow}>
                <Text style={[styles.date, { color: colors.textPrimary }]}>
                  {dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}
                </Text>
                <Text style={[styles.entryType, { color: colors.textSecondary }]}>{entryTypeLabel}</Text>
                <View style={[styles.userChip, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{entry.userName}</Text>
                </View>
              </View>

              {isTripSummary ? (
                <View style={styles.tripSummaryRow}>
                  <View style={styles.tripSummaryNode}>
                    <MaterialCommunityIcons name="car-shift-pattern" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tripSummaryText, { color: colors.textPrimary }]}>{tripStartOdometer} km</Text>
                  </View>
                  <MaterialIcons name="arrow-right-alt" size={16} color={colors.textSecondary} />
                  <View style={styles.tripSummaryNode}>
                    <MaterialCommunityIcons name="flag-checkered" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tripSummaryText, { color: colors.textPrimary }]}>{tripEndOdometer} km</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.primaryText, { color: colors.textPrimary }]} numberOfLines={2}>
                  {primaryText}
                </Text>
              )}
            </View>

            {entry.sharedTrip ? (
              <View style={[styles.sharedTripTag, { borderColor: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="people-alt" size={12} color={colors.textPrimary} />
              </View>
            ) : null}
          </View>

          {detailChips.length > 0 ? (
            <View style={styles.infoRow}>
              {detailChips.map((item) => (
                <View
                  key={`${item.icon}-${item.text}`}
                  style={[
                    styles.infoChip,
                    item.size === 'large' ? styles.infoChipLarge : item.size === 'small' ? styles.infoChipSmall : undefined,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                  ]}>
                  <MaterialIcons name={item.icon} size={item.size === 'large' ? 14 : item.size === 'small' ? 10 : 12} color={colors.textPrimary} />
                  <Text
                    style={[
                      styles.infoChipText,
                      item.size === 'large' ? styles.infoChipTextLarge : item.size === 'small' ? styles.infoChipTextSmall : undefined,
                      { color: colors.textPrimary },
                    ]}
                    numberOfLines={1}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {entry.type === 'spec_update' && specUpdateLines.length > 1
            ? specUpdateLines.slice(1).map((line) => (
                <Text key={line} style={[styles.secondaryLine, { color: colors.textSecondary }]}>
                  {line}
                </Text>
              ))
            : null}
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  sharedTripTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  infoChipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoChipTextLarge: {
    fontSize: 13,
  },
  infoChipSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    opacity: 0.75,
  },
  infoChipTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  tripSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  tripSummaryNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripSummaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryLine: {
    fontSize: 11,
    lineHeight: 16,
  },
  date: {
    fontSize: 13,
    fontWeight: '700',
  },
  swipeActionWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
