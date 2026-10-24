import { FastagBrandIcon } from '@/components/FastagBrandIcon';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fragment } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, View } from 'react-native';
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
  children,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  textSecondary: string;
  children?: React.ReactNode;
}) {
  const isFasttagItem =
    entry.expenseCategory === 'fasttag_toll_paid' ||
    theme.icon === 'toll' ||
    Boolean(entry.expenseTitle?.toLowerCase().includes('fastag'));

  return (
    <View style={baseStyles.headerRow}>
      <View style={[baseStyles.iconBadge, { backgroundColor: theme.accentAlpha(0.14) }]}>
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
  const hasPrimaryMetrics = amount !== null || liters !== null;
  const hasSecondaryMetrics = entry.odometer > 0 || ppl !== null || entry.fullTank;

  return (
    <View style={fuelStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />

      {hasPrimaryMetrics && (
        <View style={fuelStyles.primaryRow}>
          {amount !== null && (
            <MetricPill icon="currency-rupee" value={`${amount}`} accent={theme.accent} textColor={colors.textPrimary} />
          )}
          {liters !== null && (
            <MetricPill icon="water-drop" value={`${liters} L`} accent={theme.accent} textColor={colors.textPrimary} />
          )}
        </View>
      )}

      {hasSecondaryMetrics && (
        <View style={fuelStyles.dataRow}>
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
        </View>
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
  headerAccessory?: React.ReactNode;
  colors: Record<string, string>;
}) {
  // Fuel cost = what the trip consumed (distance ÷ mileage × avg fuel rate),
  // not the money spent at the pump. Total = that fuel cost + other trip
  // costs (parking, tolls, fines) — shown only when it differs from the fuel
  // cost, so a fuel-only trip doesn't display the same number twice. The
  // rupee glyph comes from the icons — never repeat ₹ inside the total's value.
  const metrics: { icon: keyof typeof MaterialIcons.glyphMap; value: string }[] = [];
  if (distanceKm !== null) {
    metrics.push({ icon: 'route', value: `${distanceKm} km` });
  }
  if (tripTotalFuelCost > 0) {
    metrics.push({ icon: 'water-drop', value: `₹${Math.round(tripTotalFuelCost)}` });
  }
  if (
    tripTotalCost > 0 &&
    Math.round(tripTotalCost) !== Math.round(tripTotalFuelCost)
  ) {
    metrics.push({ icon: 'currency-rupee', value: `${Math.round(tripTotalCost)}` });
  }

  return (
    <View style={tripStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary}>
        {headerAccessory}
      </CardHeader>

      <View style={[tripStyles.journeyBar, { backgroundColor: theme.accentAlpha(0.08) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary }]}>START</Text>
          <OdometerValue value={tripStartOdometer} color={colors.textPrimary} style={tripStyles.odomVal} />
        </View>

        <View style={[tripStyles.routeLine, { borderColor: theme.accentAlpha(0.35) }]} />
        <View style={[tripStyles.routeVehicle, { backgroundColor: theme.accentAlpha(0.16) }]}>
          <MaterialIcons name="directions-car" size={17} color={theme.accent} />
        </View>
        <View style={[tripStyles.routeLine, { borderColor: theme.accentAlpha(0.35) }]} />

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary, textAlign: 'right' }]}>END</Text>
          <OdometerValue value={tripEndOdometer} color={colors.textPrimary} style={tripStyles.odomVal} textAlign="right" />
        </View>
      </View>

      {metrics.length > 0 && (
        <View style={[tripStyles.statsRow, { backgroundColor: colors.backgroundSecondary }]}>
          {metrics.map((metric, index) => (
            <Fragment key={metric.value}>
              {index > 0 && (
                <View style={[tripStyles.statsDivider, { backgroundColor: colors.border }]} />
              )}
              <View style={tripStyles.statCell}>
                <View style={tripStyles.statValueRow}>
                  <MaterialIcons name={metric.icon} size={14} color={theme.accent} />
                  <Text style={[tripStyles.statValue, { color: colors.textPrimary }]}>
                    {metric.value}
                  </Text>
                </View>
              </View>
            </Fragment>
          ))}
        </View>
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
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />

      <View style={baseStyles.readingRow}>
        {(isTripStart || isTripEnd) && (
          <View style={[baseStyles.stagePill, { backgroundColor: theme.accentAlpha(0.12) }]}>
            <MaterialIcons name={isTripStart ? 'play-arrow' : 'flag'} size={12} color={theme.accent} />
            <Text style={[baseStyles.stagePillText, { color: theme.accent }]}>
              {isTripStart ? 'Start' : 'End'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <OdometerValue value={entry.odometer} color={colors.textPrimary} style={odometerStyles.readingVal} />
      </View>

      {isTripEnd && typeof entry.tripDistanceKm === 'number' && entry.tripDistanceKm > 0 && (
        <View style={baseStyles.infoRow}>
          <Chip
            icon="route"
            value={`${entry.tripDistanceKm} km`}
            accent={theme.accent}
            bg={theme.accentAlpha(0.08)}
            textColor={colors.textPrimary}
          />
        </View>
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

  if (isFastagRecharge) {
    return (
      <View style={expenseStyles.inner}>
        <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />

        {typeof entry.cost === 'number' && entry.cost > 0 && (
          <View style={expenseStyles.primaryRow}>
            <MetricPill icon="currency-rupee" value={`${entry.cost}`} accent={theme.accent} textColor={colors.textPrimary} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={expenseStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />

      <View style={expenseStyles.titleRow}>
        <Text style={[expenseStyles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.expenseTitle || 'Expense'}
        </Text>
      </View>

      {isPassPurchase ? (
        <>
          {typeof entry.cost === 'number' && entry.cost > 0 && (
            <View style={expenseStyles.primaryRow}>
              <MetricPill icon="currency-rupee" value={`${entry.cost}`} accent={theme.accent} textColor={colors.textPrimary} />
            </View>
          )}
          <View style={baseStyles.infoRow}>
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
          </View>
        </>
      ) : isPassDeduction ? (
        <View style={baseStyles.infoRow}>
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
        </View>
      ) : (
        <View style={expenseStyles.dataRow}>
          {typeof entry.cost === 'number' && entry.cost > 0 && (
            <Chip icon="currency-rupee" value={`${entry.cost}`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {entry.odometer > 0 && (
            <OdometerChip value={entry.odometer} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
        </View>
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
        <View style={[specStyles.diffBox, { backgroundColor: theme.accentAlpha(0.07) }]}>
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
        </View>
      )}
    </View>
  );
}
