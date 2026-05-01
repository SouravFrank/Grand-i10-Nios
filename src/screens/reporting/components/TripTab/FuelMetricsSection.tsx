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
          <MaterialIcons name="local-gas-station" size={16} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fuel Metrics</Text>
        </View>
      </View>

      <View style={styles.fuelMetricsGrid}>
        {monthlySummaries.map((month) => (
          <View
            key={month.monthKey}
            style={[styles.fuelMetricCard, { borderColor: colors.border, backgroundColor: secondarySurfaceColor }]}
          >
            <View style={styles.fuelMetricHeader}>
              <MaterialIcons name="speed" size={20} color={colors.textPrimary} />
              <Text style={[styles.fuelMetricTitle, { color: colors.textPrimary }]}>{month.monthLabel}</Text>
            </View>
            <View style={styles.fuelMetricRow}>
              <View style={styles.fuelMetricItem}>
                <Text style={[styles.fuelMetricLabel, { color: colors.textSecondary }]}>Avg Cost per KM</Text>
                <Text style={[styles.fuelMetricValue, { color: colors.textPrimary }]}>
                  {formatINR(month.costPerKm)}
                </Text>
              </View>
              <View style={styles.fuelMetricItem}>
                <Text style={[styles.fuelMetricLabel, { color: colors.textSecondary }]}>Avg Cost per Liter</Text>
                <Text style={[styles.fuelMetricValue, { color: colors.textPrimary }]}>
                  {formatINR(month.avgFuelRate)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
