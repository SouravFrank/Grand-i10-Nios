import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { MonthlySummary } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { styles } from '../common/TripTab.styles';

interface FuelMetricsSectionProps {
  monthlySummaries: MonthlySummary[];
  secondarySurfaceColor: string;
  surfaceColor: string;
}

export function FuelMetricsSection({
  monthlySummaries,
  secondarySurfaceColor,
  surfaceColor,
}: FuelMetricsSectionProps) {
  const { colors } = useAppTheme();

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
            <MaterialIcons name="insights" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Telemetry & Efficiency</Text>
        </View>
      </View>

      <View style={styles.fuelMetricsGrid}>
        {monthlySummaries.map((month) => (
          <View
            key={month.monthKey}
            style={[{ gap: 12 }]}
          >
            {/* Minimalist Month Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{month.monthLabel}</Text>
              <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
            </View>

            {/* Split Digital Readouts */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              
              {/* Cost per KM Block */}
              <View style={[styles.innerSummaryCard, { backgroundColor: secondarySurfaceColor, alignItems: 'center' }]}>
                <MaterialIcons name="timeline" size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                <Text style={[styles.primaryAmount, { color: colors.textPrimary }]}>
                  {formatINR(month.costPerKm)}
                </Text>
                <Text style={[styles.tertiaryLabel, { color: colors.textSecondary, marginTop: 2 }]}>Avg Cost / KM</Text>
              </View>

              {/* Cost per Liter Block */}
              <View style={[styles.innerSummaryCard, { backgroundColor: secondarySurfaceColor, alignItems: 'center' }]}>
                 <MaterialIcons name="local-gas-station" size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                <Text style={[styles.primaryAmount, { color: colors.textPrimary }]}>
                  {formatINR(month.avgFuelRate)}
                </Text>
                <Text style={[styles.tertiaryLabel, { color: colors.textSecondary, marginTop: 2 }]}>Avg Fuel Rate / L</Text>
              </View>

            </View>
          </View>
        ))}
      </View>
    </View>
  );
}