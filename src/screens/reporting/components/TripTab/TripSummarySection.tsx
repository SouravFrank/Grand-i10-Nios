import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { MonthlySummary } from '../../reportCalculations';
import { formatINR, formatKm } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from '../common/TripTab.styles';

const AYAN_COLOR = '#3B82F6';
const SOURAV_COLOR = '#8B5CF6';

interface TripSummarySectionProps {
  monthlySummaries: MonthlySummary[];
  secondarySurfaceColor: string;
  surfaceColor: string;
}

export function TripSummarySection({
  monthlySummaries,
  secondarySurfaceColor,
  surfaceColor,
}: TripSummarySectionProps) {
  const { colors } = useAppTheme();

  // Helper to ensure 'km' is always rendered as uppercase 'KM'
  const formatKMCaps = (value: number) => {
    return formatKm(value).replace(/km/i, 'KM');
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={{
            backgroundColor: colors.textPrimary,
            padding: 6,
            borderRadius: 8,
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            <MaterialIcons name="route" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Trip Summary</Text>
        </View>
      </View>

      <View style={styles.monthSummaryStack}>
        {monthlySummaries.map((month) => {
          const total = month.totalKm > 0 ? month.totalKm : 1;
          const sharedPct = (month.sharedKm / total) * 100;
          const ayanPct = (month.ayanKm / total) * 100;
          const souravPct = (month.souravKm / total) * 100;

          return (
            <View
              key={month.monthKey}
              style={[styles.innerSummaryCard, { backgroundColor: secondarySurfaceColor, gap: 16 }]}
            >
              {/* Header: Month & Total Trip Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{month.monthLabel}</Text>
                  <Text style={[styles.primaryAmount, { color: colors.textPrimary, marginTop: 4 }]}>
                    {formatKMCaps(month.totalKm)}
                  </Text>
                  {/* Total Fuel Used with Icon */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MaterialIcons name="local-gas-station" size={14} color={colors.primary} />
                    <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>
                      {month.totalFuelUsed} Liters
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Total Cost</Text>
                  <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>
                    {formatINR(month.totalKm * month.costPerKm)}
                  </Text>
                </View>
              </View>

              {/* Visual Distribution Bar */}
              <View style={{ height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: colors.border }}>
                <View style={{ width: `${sharedPct}%`, backgroundColor: colors.primary }} />
                <View style={{ width: `${ayanPct}%`, backgroundColor: AYAN_COLOR }} />
                <View style={{ width: `${souravPct}%`, backgroundColor: SOURAV_COLOR }} />
              </View>

              {/* Legend / Breakdown Matrix */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                
                {/* Shared Legend */}
                <View style={{ flex: 1, minWidth: '30%', borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 8 }}>
                  <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Shared</Text>
                  <CountUpText value={month.sharedKm} formatter={formatKMCaps} style={[styles.secondaryAmount, { color: colors.textPrimary }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                    <MaterialIcons name="local-gas-station" size={10} color={colors.textSecondary} />
                    <Text style={[styles.tertiaryLabel, { color: colors.textSecondary, fontSize: 10 }]}>{month.sharedFuelUsed}L • {formatINR(month.sharedKm * month.costPerKm)}</Text>
                  </View>
                </View>

                {/* Ayan Legend */}
                {month.ayanKm > 0 && (
                  <View style={{ flex: 1, minWidth: '30%', borderLeftWidth: 3, borderLeftColor: AYAN_COLOR, paddingLeft: 8 }}>
                    <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Ayan</Text>
                    <CountUpText value={month.ayanKm} formatter={formatKMCaps} style={[styles.secondaryAmount, { color: colors.textPrimary }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                      <MaterialIcons name="local-gas-station" size={10} color={colors.textSecondary} />
                      <Text style={[styles.tertiaryLabel, { color: colors.textSecondary, fontSize: 10 }]}>{month.ayanFuelUsed}L • {formatINR(month.ayanKm * month.costPerKm)}</Text>
                    </View>
                  </View>
                )}

                {/* Sourav Legend */}
                {month.souravKm > 0 && (
                  <View style={{ flex: 1, minWidth: '30%', borderLeftWidth: 3, borderLeftColor: SOURAV_COLOR, paddingLeft: 8 }}>
                    <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Sourav</Text>
                    <CountUpText value={month.souravKm} formatter={formatKMCaps} style={[styles.secondaryAmount, { color: colors.textPrimary }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                      <MaterialIcons name="local-gas-station" size={10} color={colors.textSecondary} />
                      <Text style={[styles.tertiaryLabel, { color: colors.textSecondary, fontSize: 10 }]}>{month.souravFuelUsed}L • {formatINR(month.souravKm * month.costPerKm)}</Text>
                    </View>
                  </View>
                )}

              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}