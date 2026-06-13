/**
 * HistoryItemCard.tsx
 * Orchestrator: resolves card theme → delegates to variant component.
 * Fixes vs previous version:
 * - Shared badge moved inline (no absolute → no overlap)
 * - Animation: slide up (translateY) — natural for vertical feed
 * - Card shell: tighter marginBottom (8px), consistent border
 */
import { useAppTheme } from '@/theme/useAppTheme';
import type { EntryRecord } from '@/types/models';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { baseStyles } from './cardStyles';
import { resolveCardTheme } from './cardThemes';
import {
  ExpenseCard,
  FuelCard,
  OdometerCard,
  SpecCard,
  TripCard,
} from './CardVariants';

type HistoryItemCardProps = {
  entry: EntryRecord;
  distanceKm: number | null;
  tripStartOdometer?: number | null;
  tripEndOdometer?: number | null;
  tripTotalCost?: number;
  tripTotalFuelLiters?: number;
  mileage?: number | null;
  costPerKm?: number | null;
  index: number;
  canEdit?: boolean;
  onPressEdit?: () => void;
};

export function HistoryItemCard({
  entry,
  distanceKm,
  tripStartOdometer = null,
  tripEndOdometer = null,
  tripTotalCost = 0,
  tripTotalFuelLiters = 0,
  mileage = null,
  costPerKm = null,
  index,
  canEdit,
  onPressEdit,
}: HistoryItemCardProps) {
  const { colors, isDark } = useAppTheme();

  // ── Animation ──────────────────────────────────────────────────────────────
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: Math.min(index * 30, 220),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay: Math.min(index * 30, 220),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  // ── Theme resolution ────────────────────────────────────────────────────────
  const isTripSummary =
    entry.type === 'odometer' &&
    Boolean(entry.tripId) &&
    typeof tripStartOdometer === 'number' &&
    typeof tripEndOdometer === 'number';

  const theme = resolveCardTheme(
    entry.type,
    entry.expenseCategory,
    entry.expenseTitle,
    isTripSummary,
    entry.tripStage,
  );

  const borderColor = theme.accentAlpha(isDark ? 0.3 : 0.18);

  // ── Variant dispatch ───────────────────────────────────────────────────────
  let cardContent: React.ReactNode;
  switch (theme.variant) {
    case 'fuel':
      cardContent = <FuelCard theme={theme} entry={entry} colors={colors} />;
      break;
    case 'trip':
      cardContent = (
        <TripCard
          theme={theme}
          entry={entry}
          tripStartOdometer={tripStartOdometer}
          tripEndOdometer={tripEndOdometer}
          distanceKm={distanceKm}
          tripTotalCost={tripTotalCost}
          tripTotalFuelLiters={tripTotalFuelLiters}
          mileage={mileage}
          costPerKm={costPerKm}
          colors={colors}
        />
      );
      break;
    case 'odometer':
      cardContent = <OdometerCard theme={theme} entry={entry} colors={colors} />;
      break;
    case 'expense':
      cardContent = <ExpenseCard theme={theme} entry={entry} colors={colors} />;
      break;
    case 'spec':
      cardContent = <SpecCard theme={theme} entry={entry} colors={colors} />;
      break;
    default:
      cardContent = <OdometerCard theme={theme} entry={entry} colors={colors} />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[baseStyles.animatedWrapper, { opacity, transform: [{ translateY }] }]}
    >
      <ReanimatedSwipeable
        renderRightActions={() => {
          if (!canEdit) return null;
          return (
            <View style={baseStyles.swipeActionWrap}>
              <Pressable
                onPress={onPressEdit}
                style={[baseStyles.editButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <MaterialIcons name="edit" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          );
        }}
      >
        <View
          style={[
            baseStyles.card,
            {
              backgroundColor: colors.card,
              borderColor,
              borderLeftColor: theme.accent,
              borderLeftWidth: theme.leftBorderWidth,
            },
          ]}
        >
          {cardContent}
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}