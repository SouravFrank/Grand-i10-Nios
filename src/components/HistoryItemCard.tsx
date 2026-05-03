import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, normalizeIndianDate } from '@/utils/day';
import { isPayerSelectableEntryType } from '@/utils/entryOwnership';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

type HistoryItemCardProps = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer?: number | null;
  tripEndOdometer?: number | null;
  tripTotalCost?: number;
  tripTotalFuelLiters?: number;
  index: number;
  canEdit?: boolean;
  onPressEdit?: () => void;
};

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function prettyFieldName(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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
  tripTotalCost = 0,
  tripTotalFuelLiters = 0,
  index,
  canEdit,
  onPressEdit,
}: HistoryItemCardProps) {
  const { colors, isDark } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  // Determine Category Color
  const accentHex =
    entry.type === 'fuel' ? '#F59E0B'
      : entry.type === 'odometer' ? '#0EA5E9'
        : entry.type === 'expense' && entry.expenseCategory === 'fasttag_toll_paid' ? '#EF4444'
          : entry.type === 'expense' && entry.expenseCategory === 'utility_addon' && (entry.expenseTitle?.toLowerCase().includes('fastag') || entry.expenseTitle?.toLowerCase().includes('fast tag')) && entry.expenseTitle?.toLowerCase().includes('recharge') ? '#3B82F6'
            : entry.type === 'expense' ? '#22C55E'
              : '#A855F7';
              
  const accentTone = hexToRgba(accentHex, isDark ? 0.15 : 0.1);
  const lightBorderTone = hexToRgba(accentHex, isDark ? 0.45 : 0.25); // Lightest border tone for the other 3 sides

  const isTripSummary =
    entry.type === 'odometer' && Boolean(entry.tripId) && typeof tripStartOdometer === 'number' && typeof tripEndOdometer === 'number';

  // Entry Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, delay: Math.min(index * 30, 200), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 250, delay: Math.min(index * 30, 200), useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateX]);

  const entryTypeLabel = isTripSummary ? 'TRIP'
    : entry.type === 'odometer' && entry.tripStage === 'start' ? 'TRIP START'
      : entry.type === 'odometer' && entry.tripStage === 'end' ? 'TRIP END'
        : entry.type === 'fuel' ? 'FUEL'
          : entry.type === 'spec_update' ? 'SPECS'
            : entry.type === 'expense' ? 'EXPENSE'
              : 'ODOMETER';

  const expenseCategoryLabel = entry.expenseCategory === 'fasttag_toll_paid' ? 'FASTAG TOLL'
    : entry.expenseCategory === 'parking' ? 'PARKING'
      : entry.expenseCategory === 'maintenance_lab' ? 'MAINTENANCE'
        : entry.expenseCategory === 'traffic_violation_fine' ? 'FINE'
          : entry.expenseCategory === 'other' ? 'OTHER CATEGORY'
            : null;

  const specUpdateLines = entry.specUpdateDetails?.map((detail) => `${detail.label || prettyFieldName(detail.field)}: ${normalizeSpecHistoryValue(detail.previousValue)} -> ${normalizeSpecHistoryValue(detail.nextValue)}`) ??
    entry.specUpdatedFields?.map((field) => `Updated: ${prettyFieldName(field)}`) ?? [];

  const entryIcon = entry.type === 'fuel' ? 'local-gas-station'
    : entry.type === 'spec_update' ? 'tune'
      : entry.type === 'expense' && entry.expenseCategory === 'fasttag_toll_paid' ? 'toll'
        : entry.type === 'expense' && entry.expenseCategory === 'parking' ? 'local-parking'
          : entry.type === 'expense' ? 'receipt-long'
            : 'speed';

  const primaryText = entry.type === 'spec_update' ? specUpdateLines[0] ?? 'Specifications updated'
    : entry.type === 'expense' ? entry.expenseTitle || 'Expense logged'
      : isTripSummary ? `${tripStartOdometer} -> ${tripEndOdometer}`
        : `${entry.odometer} KM`;

  const userChipLabel = isPayerSelectableEntryType(entry.type) && entry.expenseCategory !== 'fasttag_toll_paid' ? entry.userName : entry.userName;

  // Separate Metrics (Cost, Distance, Liters) from Tags (Categories, Status)
  const metrics: Array<{ icon: keyof typeof MaterialIcons.glyphMap; text: string }> = [];
  const tags: Array<{ icon: keyof typeof MaterialIcons.glyphMap; text: string }> = [];

  if (entry.type === 'fuel') {
    const amount = typeof entry.fuelAmount === 'number' ? entry.fuelAmount : typeof entry.cost === 'number' ? entry.cost : null;
    const liters = typeof entry.fuelLiters === 'number' ? entry.fuelLiters : null;
    if (typeof amount === 'number') metrics.push({ icon: 'currency-rupee', text: `${amount}` });
    if (typeof liters === 'number') metrics.push({ icon: 'water-drop', text: `${liters} L` });
    if (entry.fullTank) tags.push({ icon: 'check-circle', text: 'Full tank' });
  }

  if (entry.type === 'expense') {
    if (typeof entry.cost === 'number') metrics.push({ icon: 'currency-rupee', text: `${entry.cost}` });
    metrics.push({ icon: 'speed', text: `${entry.odometer} KM` });
    if (expenseCategoryLabel) tags.push({ icon: 'local-offer', text: expenseCategoryLabel });
  }

  if (isTripSummary) {
    if (distanceKm !== null) metrics.push({ icon: 'route', text: `${distanceKm} KM` });
    if (tripTotalFuelLiters > 0) metrics.push({ icon: 'water-drop', text: `${tripTotalFuelLiters.toFixed(2)} L` });
    if (tripTotalCost > 0) metrics.push({ icon: 'currency-rupee', text: `${tripTotalCost}` });
  } else {
    if (entry.type === 'odometer' && entry.tripStage === 'start') tags.push({ icon: 'play-arrow', text: 'Trip started' });
    if (entry.type === 'odometer' && entry.tripStage === 'end' && typeof entry.tripDistanceKm === 'number') metrics.push({ icon: 'route', text: `${entry.tripDistanceKm} KM` });
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <Swipeable
        renderRightActions={() => {
          if (!canEdit) return null;
          return (
            <View style={styles.swipeActionWrap}>
              <Pressable onPress={onPressEdit} style={[styles.editButton, { backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="edit" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          );
        }}>
        <View style={[
          styles.card, 
          { 
            backgroundColor: colors.card, 
            borderColor: lightBorderTone, // Lightest border on all sides
            borderLeftColor: accentHex  // Emphasized thick left border
          }
        ]}>
          
          {/* Prominent Shared Trip Icon at Top Right */}
          {entry.sharedTrip && (
            <View style={[styles.sharedBadge, { backgroundColor: hexToRgba(accentHex, 0.1) }]}>
              <MaterialIcons name="groups" size={20} color={colors.textPrimary} />
            </View>
          )}

          <View style={styles.topRow}>
            {/* Creative Telemetry Icon Badge */}
            <View style={[styles.typeIconWrap, { backgroundColor: accentTone }]}>
              <MaterialIcons name={entryIcon} size={16} color={accentHex} />
            </View>

            <View style={styles.topCopy}>
              {/* Compact Meta Row */}
              <View style={styles.metaRow}>
                <Text style={[styles.entryType, { color: accentHex }]}>{entryTypeLabel}</Text>
                <Text style={[styles.metaDivider, { color: colors.border }]}>•</Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}</Text>
                <Text style={[styles.metaDivider, { color: colors.border }]}>•</Text>
                <Text style={[styles.userName, { color: colors.textSecondary }]}>{userChipLabel}</Text>
              </View>

              {/* Main Reading Row */}
              {isTripSummary ? (
                <View style={styles.tripSummaryRow}>
                  <Text style={[styles.primaryText, { color: colors.textPrimary }]}>{tripStartOdometer}</Text>
                  <MaterialIcons name="arrow-right-alt" size={16} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.primaryText, { color: colors.textPrimary }]}>{tripEndOdometer}</Text>
                </View>
              ) : (
                <Text style={[styles.primaryText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {primaryText}
                </Text>
              )}
            </View>
          </View>

          {/* Unified Metrics & Distinct Tags Row */}
          {(metrics.length > 0 || tags.length > 0) && (
            <View style={styles.dataRow}>
              
              {/* Core Metric Pills (Uniform format) */}
              {metrics.map((item) => (
                <View key={item.text} style={[styles.metricPill, { backgroundColor: colors.backgroundSecondary }]}>
                  <MaterialIcons name={item.icon} size={14} color={colors.textPrimary} />
                  <Text style={[styles.metricText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.text}
                  </Text>
                </View>
              ))}

              {/* Tag / Category Labels (Subtle text format) */}
              {tags.map((item) => (
                <View key={item.text} style={styles.tagWrap}>
                  <MaterialIcons name={item.icon} size={14} color={colors.textSecondary} />
                  <Text style={[styles.tagText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.text}
                  </Text>
                </View>
              ))}

            </View>
          )}

          {/* Spec Updates */}
          {entry.type === 'spec_update' && specUpdateLines.length > 1 && (
            <View style={{ marginTop: 4 }}>
              {specUpdateLines.slice(1).map((line) => (
                <Text key={line} style={[styles.secondaryLine, { color: colors.textSecondary }]}>{line}</Text>
              ))}
            </View>
          )}
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2, // Full 4-sided border
    borderLeftWidth: 4, // Overrides left to be thicker
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 10,
    position: 'relative', // Allows absolute positioning of the shared badge
  },
  sharedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 36, // Ensures long text never overlaps with the absolute shared badge
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  entryType: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  date: {
    fontSize: 10,
    fontWeight: '600',
  },
  userName: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaDivider: {
    fontSize: 10,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tripSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginLeft: 48, // Aligns perfectly under the text, skipping the left icon width (36 + 12 gap)
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryLine: {
    fontSize: 11,
    marginLeft: 48,
    marginTop: 2,
  },
  swipeActionWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
    paddingBottom: 10, 
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});