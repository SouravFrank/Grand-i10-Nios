import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, normalizeIndianDate } from '@/utils/day';

type HistoryItemCardProps = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer?: number | null;
  tripEndOdometer?: number | null;
  index: number;
  showSharedTripToggle?: boolean;
  onPressSharedTripToggle?: () => void;
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
  showSharedTripToggle,
  onPressSharedTripToggle,
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

  const detailChips: Array<{ icon: keyof typeof MaterialIcons.glyphMap; text: string }> = [];

  if (entry.type === 'fuel') {
    const amount = typeof entry.fuelAmount === 'number' ? entry.fuelAmount : typeof entry.cost === 'number' ? entry.cost : null;
    const liters = typeof entry.fuelLiters === 'number' ? entry.fuelLiters : null;

    if (typeof amount === 'number') {
      detailChips.push({ icon: 'currency-rupee', text: `${amount}` });
    }
    if (typeof liters === 'number') {
      detailChips.push({ icon: 'water-drop', text: `${liters} L` });
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
      detailChips.push({ icon: 'currency-rupee', text: `${entry.cost}` });
    }
    if (expenseCategoryLabel) {
      detailChips.push({ icon: 'sell', text: expenseCategoryLabel });
    }
    detailChips.push({ icon: 'speed', text: `${entry.odometer} km` });
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
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentBorder }]}> 
        <View style={styles.topRow}>
          <View style={[styles.typeIconWrap, { backgroundColor: accentTone }]}>
            <MaterialIcons name={entryIcon} size={18} color={accentIconColor} />
          </View>

          <View style={styles.topCopy}>
            <View style={styles.metaRow}>
              <Text style={[styles.entryType, { color: colors.textSecondary }]}>{entryTypeLabel}</Text>
              <View style={[styles.userChip, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{entry.userName}</Text>
              </View>
            </View>

            <Text style={[styles.primaryText, { color: colors.textPrimary }]} numberOfLines={2}>
              {primaryText}
            </Text>
          </View>

          {entry.sharedTrip ? (
            <View style={[styles.sharedTripTag, { borderColor: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}>
              <MaterialIcons name="people-alt" size={12} color={colors.textPrimary} />
              <Text style={[styles.sharedTripTagText, { color: colors.textPrimary }]}>Shared</Text>
            </View>
          ) : null}
        </View>

        {detailChips.length > 0 ? (
          <View style={styles.infoRow}>
            {detailChips.map((item) => (
              <View
                key={`${item.icon}-${item.text}`}
                style={[styles.infoChip, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name={item.icon} size={12} color={colors.textPrimary} />
                <Text style={[styles.infoChipText, { color: colors.textPrimary }]} numberOfLines={1}>
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

        {entry.sharedTrip && entry.sharedTripMarkedByName ? (
          <Text style={[styles.secondaryLine, { color: colors.textSecondary }]}>
            Shared by {entry.sharedTripMarkedByName}
          </Text>
        ) : null}

        {showSharedTripToggle ? (
          <Pressable
            onPress={entry.sharedTrip ? undefined : onPressSharedTripToggle}
            style={[styles.sharedTripToggleRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons
              name={entry.sharedTrip ? 'check-box' : 'check-box-outline-blank'}
              size={18}
              color={entry.sharedTrip ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={[styles.sharedTripToggleText, { color: colors.textPrimary }]}>
              {entry.sharedTrip ? 'Shared Trip Enabled' : 'Mark as Shared Trip'}
            </Text>
          </Pressable>
        ) : null}

        <View style={[styles.bottomRow, { borderTopColor: colors.border }]}> 
          <View style={styles.footerMetaRow}>
            <View style={styles.footerItem}>
              <MaterialIcons name="schedule" size={13} color={colors.textSecondary} />
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}
              </Text>
            </View>
            {distanceKm !== null && (entry.type === 'fuel' || entry.type === 'odometer') ? (
              <View style={styles.footerItem}>
                <MaterialIcons name="route" size={13} color={colors.textSecondary} />
                <Text style={[styles.distance, { color: colors.textSecondary }]}>
                  {distanceKm} km
                </Text>
              </View>
            ) : null}
          </View>
          {canEdit ? (
            <Pressable
              onPress={onPressEdit}
              style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <MaterialIcons name="edit" size={15} color={colors.textPrimary} />
              <Text style={[styles.editButtonText, { color: colors.textPrimary }]}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedTripTagText: {
    fontSize: 10,
    fontWeight: '700',
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
  infoChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryLine: {
    fontSize: 11,
    lineHeight: 16,
  },
  sharedTripToggleRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedTripToggleText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bottomRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  footerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    fontSize: 11,
  },
  distance: {
    fontSize: 11,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
