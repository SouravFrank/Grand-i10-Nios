import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
  return (
    <View style={baseStyles.headerRow}>
      <View style={[baseStyles.iconBadge, { backgroundColor: theme.accentAlpha(0.14) }]}>
        <MaterialIcons name={theme.icon} size={16} color={theme.accent} />
      </View>
      <View style={baseStyles.headerMeta}>
        <Text style={[baseStyles.typeLabel, { color: theme.accent }]}>{theme.label}</Text>
        <Text style={[baseStyles.dot, { color: textSecondary }]}>·</Text>
        <Text style={[baseStyles.dateText, { color: textSecondary }]}>
          {dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}
        </Text>
        <Text style={[baseStyles.dot, { color: textSecondary }]}>·</Text>
        <Text style={[baseStyles.userText, { color: textSecondary }]} numberOfLines={1}>
          {entry.userName}
        </Text>
      </View>
      
      {/* Highlighted Shared Icon at Top Right */}
      {entry.sharedTrip && (
        <View style={[baseStyles.sharedBadge, { backgroundColor: theme.accentAlpha(0.15) }]}>
          <MaterialIcons name="groups" size={16} color={theme.accent} />
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
      <MaterialIcons name={icon} size={14} color={accent} />
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
  const chipBg = theme.accentAlpha(0.1);
  const hasPrimaryMetrics = amount !== null || liters !== null;
  const hasSecondaryMetrics = typeof entry.odometer === 'number' || ppl !== null || entry.fullTank;

  return (
    <View style={fuelStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />
      
      {/* Description removed as requested */}

      {hasPrimaryMetrics && (
        <View style={fuelStyles.primaryRow}>
          {amount !== null && (
            <MetricPill icon="currency-rupee" value={`${amount}`} accent={theme.accent}  textColor={colors.textPrimary} />
          )}
          {liters !== null && (
            <MetricPill icon="water-drop" value={`${liters} L`} accent={theme.accent}  textColor={colors.textPrimary} />
          )}
        </View>
      )}

      {hasSecondaryMetrics && (
        <View style={fuelStyles.dataRow}>
          {typeof entry.odometer === 'number' && (
            <OdometerChip value={entry.odometer} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {ppl !== null && (
            <Chip icon="local-gas-station" value={`₹${ppl}/L`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
          )}
          {entry.fullTank && (
            <View style={[baseStyles.tagPill, { backgroundColor: chipBg }]}>
              <MaterialIcons name="check-circle" size={11} color={theme.accent} />
              <Text style={[baseStyles.tagPillText, { color: theme.accent }]}>Full</Text>
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
  tripTotalFuelLiters,
  mileage,
  costPerKm,
  colors,
}: {
  theme: CardTheme;
  entry: EntryRecord;
  tripStartOdometer: number | null;
  tripEndOdometer: number | null;
  distanceKm: number | null;
  tripTotalCost: number;
  tripTotalFuelLiters: number;
  mileage: number | null;
  costPerKm: number | null;
  colors: Record<string, string>;
}) {
  const fuelUsed =
    mileage && mileage > 0 && distanceKm
      ? distanceKm / mileage
      : tripTotalFuelLiters > 0
      ? tripTotalFuelLiters
      : null;

  const totalCost =
    costPerKm && costPerKm > 0 && distanceKm
      ? distanceKm * costPerKm
      : tripTotalCost > 0
      ? tripTotalCost
      : null;

  const chipBg = colors.backgroundSecondary;

  return (
    <View style={tripStyles.inner}>
      <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />
      
      <View style={[tripStyles.journeyBar, { backgroundColor: theme.accentAlpha(0.08) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary }]}>START</Text>
          <OdometerValue value={tripStartOdometer} color={colors.textPrimary} style={tripStyles.odomVal} />
        </View>
        
        {/* Attractive Car + Dots Route Visual */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginHorizontal: 4 }}>
          <MaterialIcons name="more-horiz" size={14} color={theme.accent} style={{ opacity: 0.4 }} />
          <MaterialIcons name="directions-car" size={18} color={theme.accent} />
          <MaterialIcons name="more-horiz" size={14} color={theme.accent} style={{ opacity: 0.4 }} />
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[tripStyles.odomLabel, { color: colors.textSecondary, textAlign: 'right' }]}>END</Text>
          <OdometerValue value={tripEndOdometer} color={colors.textPrimary} style={tripStyles.odomVal} textAlign="right" />
        </View>
      </View>

      <View style={tripStyles.statsRow}>
        {distanceKm !== null && (
          <Chip icon="route" value={`${distanceKm} km`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
        )}
        {fuelUsed !== null && (
          <Chip icon="water-drop" value={`${fuelUsed.toFixed(1)} L`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
        )}
        {totalCost !== null && (
          <Chip icon="currency-rupee" value={`${Number(totalCost).toFixed(0)}`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
        )}
      </View>
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
      <View style={baseStyles.headerRow}>
        <View style={[baseStyles.iconBadge, { backgroundColor: theme.accentAlpha(0.12) }]}>
          <MaterialIcons name={theme.icon} size={15} color={theme.accent} />
        </View>
        <View style={baseStyles.headerMeta}>
          <Text style={[baseStyles.typeLabel, { color: theme.accent }]}>{theme.label}</Text>
          <Text style={[baseStyles.dot, { color: colors.textSecondary }]}>·</Text>
          <Text style={[baseStyles.dateText, { color: colors.textSecondary }]}>
            {dayjs(entry.createdAt).format(INDIA_DATE_FORMAT)}
          </Text>
          <Text style={[baseStyles.dot, { color: colors.textSecondary }]}>·</Text>
          <Text style={[baseStyles.userText, { color: colors.textSecondary }]} numberOfLines={1}>
            {entry.userName}
          </Text>
        </View>
        
        {entry.sharedTrip && (
          <View style={[baseStyles.sharedBadge, { backgroundColor: theme.accentAlpha(0.15) }]}>
            <MaterialIcons name="groups" size={16} color={theme.accent} />
          </View>
        )}

        <View style={odometerStyles.readingInline}>
          <OdometerValue value={entry.odometer} color={colors.textPrimary} style={odometerStyles.readingVal} />
        </View>

        {(isTripStart || isTripEnd) && (
          <View style={[odometerStyles.stagePill, { backgroundColor: theme.accentAlpha(0.12) }]}>
            <MaterialIcons name={isTripStart ? 'play-arrow' : 'flag'} size={11} color={theme.accent} />
          </View>
        )}
      </View>

      {isTripEnd && typeof entry.tripDistanceKm === 'number' && (
        <View>
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
  const chipBg = theme.accentAlpha(0.09);
  const isFastagRecharge = theme.label === 'FASTAG RECHARGE';

  if (isFastagRecharge) {
    return (
      <View style={expenseStyles.inner}>
        <CardHeader theme={theme} entry={entry} textSecondary={colors.textSecondary} />

        {typeof entry.cost === 'number' && (
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
      
      {/* Hide description for Fastag Recharge as requested */}
      {theme.label !== 'FASTAG RECHARGE' && (
        <View style={expenseStyles.titleRow}>
          <Text style={[expenseStyles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.expenseTitle || 'Expense'}
          </Text>
        </View>
      )}

      <View style={expenseStyles.dataRow}>
        {typeof entry.cost === 'number' && (
          <Chip icon="currency-rupee" value={`${entry.cost}`} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
        )}
        {typeof entry.odometer === 'number' && (
          <OdometerChip value={entry.odometer} accent={theme.accent} bg={chipBg} textColor={colors.textPrimary} />
        )}
      </View>
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
