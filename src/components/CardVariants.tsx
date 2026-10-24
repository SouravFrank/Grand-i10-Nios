import { FastagBrandIcon } from '@/components/FastagBrandIcon';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  baseStyles,
  expenseStyles,
  fuelStyles,
  odometerStyles,
  specStyles,
  tripStyles,
} from './cardStyles';
import type { CardTheme } from './cardThemes';

function CardHeader({
  theme,
  entry,
  textSecondary,
  trailing,
  children,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  textSecondary: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const isFasttagItem =
    entry.expenseCategory === 'fasttag_toll_paid' ||
    theme.icon === 'toll' ||
    Boolean(entry.expenseTitle?.toLowerCase().includes('fastag'));

  return (
    <View style={baseStyles.headerRow}>
      <View
        style={[
          baseStyles.iconBadge,
          {
            backgroundColor: theme.accentAlpha(0.14),
            borderColor: theme.accentAlpha(0.22),
            borderWidth: 1,
          },
        ]}
      >
        {isFasttagItem ? (
          <FastagBrandIcon size={17} color={theme.accent} />
        ) : (
          <MaterialIcons name={theme.icon} size={18} color={theme.accent} />
        )}
      </View>
      <View style={baseStyles.headerMeta}>
        <Text style={[baseStyles.typeLabel, { color: theme.accent }]} numberOfLines={1}>
          {theme.label}
        </Text>
        <View style={baseStyles.headerSubRow}>
          <Text style={[baseStyles.dateText, { color: textSecondary }]}>
            {dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}
          </Text>
          <Text style={[baseStyles.dot, { color: textSecondary }]}>·</Text>
          <Text style={[baseStyles.userText, { color: textSecondary }]} numberOfLines={1}>
            {entry.userName}
          </Text>
        </View>
      </View>

      {trailing}

      {entry.sharedTrip && (
        <View style={[baseStyles.sharedBadge, { backgroundColor: theme.accentAlpha(0.15) }]}>
          <MaterialIcons name="groups" size={15} color={theme.accent} />
        </View>
      )}

      {children}
    </View>
  );
}

function Chip({
  icon,
  value,
  accent,
  bg,
  textColor,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  accent: string;
  bg: string;
  textColor: string;
}) {
  return (
    <View style={[baseStyles.chip, { backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={12} color={accent} />
      <Text style={[baseStyles.chipText, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function MetricPill({
  icon,
  value,
  accent,
  bg,
  textColor,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  accent: string;
  bg?: string;
  textColor: string;
}) {
  return (
    <View style={[baseStyles.metricPill, { backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={15} color={accent} />
      <Text style={[baseStyles.metricPillText, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function formatOdometer(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.trunc(value)}` : '—';
}

function OdometerValue({
  value,
  color,
  style,
  textAlign,
}: {
  value: number | null | undefined;
  color: string;
  style?: StyleProp<TextStyle>;
  textAlign?: TextStyle['textAlign'];
}) {
  return (
    <Text style={[style, baseStyles.odometerDigitText, { color, textAlign }]}>
      {formatOdometer(value)}
    </Text>
  );
}

function OdometerChip({
  value,
  accent,
  bg,
  textColor,
}: {
  value: number;
  accent: string;
  bg: string;
  textColor: string;
}) {
  return (
    <View style={[baseStyles.chip, baseStyles.odometerChip, { backgroundColor: bg }]}>
      <MaterialIcons name="speed" size={12} color={accent} />
      <OdometerValue
        value={value}
        color={textColor}
        style={baseStyles.chipText}
      />
    </View>
  );
}

export function FuelCard({
  theme,
  entry,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  colors: Record<string, string>;
}) {
  const amount =
    typeof entry.fuelAmount === 'number'
      ? entry.fuelAmount
      : typeof entry.cost === 'number'
        ? entry.cost
        : null;
  const liters = typeof entry.fuelLiters === 'number' ? entry.fuelLiters : null;
  const ppl = amount && liters ? (amount / liters).toFixed(1) : null;
  const chipBg = theme.accentAlpha(0.08);
  const hasDataRow = liters !== null || entry.odometer > 0 || ppl !== null || entry.fullTank;

  return (
    <View style={fuelStyles.inner}>
      <CardHeader
        theme={theme}
        entry={entry}
        textSecondary={colors.textSecondary}
        trailing={
          amount !== null ? (
            <MetricPill icon="currency-rupee" value={`${amount}`} accent={theme.accent} textColor={colors.textPrimary} />
          ) : undefined
        }
      />

      {hasDataRow && (
        <Animated.View entering={FadeInUp.delay(60).springify().damping(20)} style={fuelStyles.dataRow}>
          {liters !== null && (
            <Chip icon="water-drop" value={`${liters} L`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {entry.odometer > 0 && (
            <OdometerChip value={entry.odometer} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {ppl !== null && (
            <Chip icon="local-gas-station" value={`₹${ppl}/L`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {entry.fullTank && (
            <View style={[baseStyles.tagPill, { backgroundColor: chipBg }]}>
              <MaterialIcons name="check-circle" size={11} color={theme.accent} />
              <Text style={[baseStyles.tagPillText, { color: theme.accent }]}>Full tank</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

export function TripCard({
  theme,
  entry,
  tripStartOdometer,
  tripEndOdometer,
  distanceKm,
  tripTotalCost,
  tripTotalFuelCost = 0,
  tripTotalFuelLiters = 0,
  headerAccessory,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  tripStartOdometer: number | null;
  tripEndOdometer: number | null;
  distanceKm: number | null;
  tripTotalCost: number;
  tripTotalFuelCost?: number;
  tripTotalFuelLiters?: number;
  headerAccessory?: React.ReactNode;
  colors: Record<string, string>;
}) {
  // Fuel consumed = distance ÷ mileage (liters); its cost = liters × avg fuel
  // rate — the two share one fuel block. Total = fuel cost + other trip costs
  // (parking, tolls, fines), highlighted, and shown only when it differs from
  // the fuel cost so a fuel-only trip doesn't display the same number twice.
  // The rupee glyph comes from the icons — never repeat ₹ in the total value.
  type Stat = {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    value: string;
    extra?: string;
    highlighted?: boolean;
  };
  const stats: Stat[] = [];
  if (distanceKm !== null) {
    stats.push({ key: 'distance', icon: 'route', value: `${distanceKm} km` });
  }
  if (tripTotalFuelLiters > 0 || tripTotalFuelCost > 0) {
    const liters = Math.round(tripTotalFuelLiters * 10) / 10;
    stats.push({
      key: 'fuel',
      icon: 'water-drop',
      value: `${liters} L`,
      extra: tripTotalFuelCost > 0 ? `₹${Math.round(tripTotalFuelCost)}` : undefined,
    });
  }
  if (
    tripTotalCost > 0 &&
    Math.round(tripTotalCost) !== Math.round(tripTotalFuelCost)
  ) {
    stats.push({
      key: 'total',
      icon: 'currency-rupee',
      value: `${Math.round(tripTotalCost)}`,
      highlighted: true,
    });
  }

  return (
    <View style={tripStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary}>
        {headerAccessory}
      </CardHeader>

      <Animated.View
        entering={FadeInUp.delay(40).springify().damping(22)}
        style={[tripStyles.journeyBar, { backgroundColor: theme.accentAlpha(0.08) }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary }]}>START</Text>
          <OdometerValue value={tripStartOdometer} color={colors.textPrimary} style={tripStyles.odomVal} />
        </View>

        <View style={tripStyles.routeSegment}>
          <View style={[tripStyles.routeDotHollow, { borderColor: theme.accentAlpha(0.45) }]} />
          <View style={[tripStyles.routeLine, { borderColor: theme.accentAlpha(0.35) }]} />
        </View>
        <View
          style={[
            tripStyles.routeVehicle,
            {
              backgroundColor: theme.accentAlpha(0.15),
              borderColor: theme.accentAlpha(0.28),
            },
          ]}
        >
          <MaterialIcons name="directions-car" size={17} color={theme.accent} />
        </View>
        <View style={tripStyles.routeSegment}>
          <View style={[tripStyles.routeLine, { borderColor: theme.accentAlpha(0.35) }]} />
          <View style={[tripStyles.routeDotSolid, { backgroundColor: theme.accent }]} />
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary, textAlign: 'right' }]}>END</Text>
          <OdometerValue value={tripEndOdometer} color={colors.textPrimary} style={tripStyles.odomVal} textAlign="right" />
        </View>
      </Animated.View>

      {stats.length > 0 && (
        <Animated.View entering={FadeInUp.delay(100).springify().damping(22)} style={tripStyles.statsRow}>
          {stats.map((stat) => (
            <View
              key={stat.key}
              style={[
                tripStyles.statChip,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: stat.highlighted ? theme.accentAlpha(0.45) : 'transparent',
                  paddingVertical: 8
                },
                stat.key === 'fuel' && {
                  flex: 1.5,
                  width: '45%'
                }
              ]}
            >
              <MaterialIcons name={stat.icon} size={14} color={theme.accent} />
              <Text
                style={[
                  tripStyles.statValue,
                  { fontSize: stat.highlighted ? 16 : 12, },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {stat.value}
              </Text>
              {stat.extra && (
                <>
                  <Text style={[tripStyles.statDot, { color: colors.textSecondary }]}>·</Text>
                  <Text
                    style={[tripStyles.statValue, { color: colors.textPrimary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {stat.extra}
                  </Text>
                </>
              )}
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

export function OdometerCard({
  theme,
  entry,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  colors: Record<string, string>;
}) {
  const isTripStart = entry.tripStage === 'start';
  const isTripEnd = entry.tripStage === 'end';

  return (
    <View style={odometerStyles.inner}>
      <CardHeader
        theme={theme}
        entry={entry}
        textSecondary={colors.textSecondary}
        trailing={
          <View style={baseStyles.readingRow}>
            {(isTripStart || isTripEnd) && (
              <View style={[baseStyles.stagePill, { backgroundColor: theme.accentAlpha(0.12) }]}>
                <MaterialIcons name={isTripStart ? 'play-arrow' : 'flag'} size={12} color={theme.accent} />
                <Text style={[baseStyles.stagePillText, { color: theme.accent }]}>
                  {isTripStart ? 'Start' : 'End'}
                </Text>
              </View>
            )}
            <OdometerValue value={entry.odometer} color={colors.textPrimary} style={odometerStyles.readingVal} />
          </View>
        }
      />

      {isTripEnd && typeof entry.tripDistanceKm === 'number' && entry.tripDistanceKm > 0 && (
        <Animated.View entering={FadeInUp.delay(60).springify().damping(20)} style={baseStyles.infoRow}>
          <Chip
            icon="route"
            value={`${entry.tripDistanceKm} km`}
            accent={theme.accent}
            bg={theme.accentAlpha(0.08)}
            textColor={colors.textPrimary}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function ExpenseCard({
  theme,
  entry,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  colors: Record<string, string>;
}) {
  const chipBg = theme.accentAlpha(0.08);
  const isFastagRecharge = theme.label === 'FASTAG RECHARGE';
  const isPassPurchase = entry.expenseCategory === 'annual_pass_purchase';
  const isPassDeduction = entry.expenseCategory === 'annual_pass_deduction';
  const costPill =
    typeof entry.cost === 'number' && entry.cost > 0 ? (
      <MetricPill icon="currency-rupee" value={`${entry.cost}`} accent={theme.accent} textColor={colors.textPrimary} />
    ) : undefined;

  if (isFastagRecharge) {
    return (
      <View style={expenseStyles.inner}>
        <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} trailing={costPill} />
      </View>
    );
  }

  return (
    <View style={expenseStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} trailing={costPill} />

      <View style={expenseStyles.titleRow}>
        <Text style={[expenseStyles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.expenseTitle || 'Expense'}
        </Text>
      </View>

      {isPassPurchase ? (
        <Animated.View entering={FadeInUp.delay(60).springify().damping(20)} style={baseStyles.infoRow}>
          {typeof entry.annualPassMaxTrips === 'number' && entry.annualPassMaxTrips > 0 && (
            <Chip
              icon="card-membership"
              value={`${entry.annualPassMaxTrips} crossings`}
              accent={theme.accent}
              bg={chipBg}
              textColor={colors.textPrimary}
            />
          )}
          {entry.annualPassExpiryDate ? (
            <Chip
              icon="event"
              value={`Valid till ${dayjs(entry.annualPassExpiryDate).format(INDIA_DATE_FORMAT)}`}
              accent={theme.accent}
              bg={chipBg}
              textColor={colors.textPrimary}
            />
          ) : null}
        </Animated.View>
      ) : isPassDeduction ? (
        <Animated.View entering={FadeInUp.delay(60).springify().damping(20)} style={baseStyles.infoRow}>
          {typeof entry.annualPassCrossings === 'number' && entry.annualPassCrossings > 0 && (
            <Chip
              icon="toll"
              value={`Crossing ${entry.annualPassCrossings}`}
              accent={theme.accent}
              bg={chipBg}
              textColor={colors.textPrimary}
            />
          )}
          {typeof entry.annualPassTollValue === 'number' && entry.annualPassTollValue > 0 && (
            <Chip
              icon="currency-rupee"
              value={`₹${entry.annualPassTollValue} covered`}
              accent={theme.accent}
              bg={chipBg}
              textColor={colors.textPrimary}
            />
          )}
        </Animated.View>
      ) : (
        entry.odometer > 0 && (
          <Animated.View entering={FadeInUp.delay(60).springify().damping(20)} style={expenseStyles.dataRow}>
            <OdometerChip value={entry.odometer} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          </Animated.View>
        )
      )}
    </View>
  );
}

function prettyField(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function SpecCard({
  theme,
  entry,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  colors: Record<string, string>;
}) {
  const diffLines =
    entry.specUpdateDetails?.map((d) => ({
      field: d.label || prettyField(d.field),
      from: d.previousValue,
      to: d.nextValue,
    })) ??
    entry.specUpdatedFields?.map((f) => ({ field: prettyField(f), from: null, to: null })) ??
    [];

  return (
    <View style={specStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />
      {diffLines.length > 0 && (
        <Animated.View
          entering={FadeInUp.delay(60).springify().damping(20)}
          style={[specStyles.diffBox, { backgroundColor: theme.accentAlpha(0.07) }]}
        >
          {diffLines.map((line, i) => (
            <View key={i.toString()} style={specStyles.diffRow}>
              <Text style={[specStyles.diffField, { color: colors.textSecondary }]}>
                {line.field}
              </Text>
              {line.from !== null && (
                <>
                  <Text style={[specStyles.diffFrom, { color: colors.textSecondary }]}>{line.from}</Text>
                  <Text style={[specStyles.diffArrow, { color: colors.textSecondary }]}>→</Text>
                </>
              )}
              {line.to !== null && (
                <Text style={[specStyles.diffTo, { color: theme.accent }]}>{line.to}</Text>
              )}
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
