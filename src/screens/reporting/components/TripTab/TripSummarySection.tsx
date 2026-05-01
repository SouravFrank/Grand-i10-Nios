import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { MonthlySummary } from '../../reportCalculations';
import { formatINR, formatKm } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from '../common/TripTab.styles';

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

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="route" size={16} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Trip Summary</Text>
        </View>
      </View>

      <View style={styles.monthSummaryStack}>
        {monthlySummaries.map((month) => (
          <View
            key={month.monthKey}
            style={[styles.monthSummaryCard, { borderColor: colors.border, backgroundColor: secondarySurfaceColor }]}
          >
            <View style={styles.otherSectionHeader}>
              <Text style={[styles.otherSectionTitle, { color: colors.textPrimary }]}>{month.monthLabel}</Text>
            </View>

            <View style={styles.flowGrid}>
              <View style={[styles.flowCard, styles.gridBlockHalf, { borderColor: colors.border }]}>
                <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Total Trip</Text>
                <View style={styles.tripInfoContainer}>
                  <CountUpText value={month.totalKm} formatter={formatKm} style={[styles.tripKm, { color: colors.textPrimary }]} />
                  <Text style={[styles.tripFuel, { color: colors.textSecondary }]}>({month.totalFuelUsed} L)</Text>
                  <CountUpText value={month.totalKm * month.costPerKm} formatter={formatINR} style={[styles.tripCost, { color: colors.textPrimary }]} />
                </View>
              </View>

              <View style={[styles.flowCard, styles.gridBlockHalf, { borderColor: colors.border }]}>
                <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Shared Trip</Text>
                <View style={styles.tripInfoContainer}>
                  <CountUpText value={month.sharedKm} formatter={formatKm} style={[styles.tripKm, { color: colors.textPrimary }]} />
                  <Text style={[styles.tripFuel, { color: colors.textSecondary }]}>({month.sharedFuelUsed} L)</Text>
                  <CountUpText value={month.sharedKm * month.costPerKm} formatter={formatINR} style={[styles.tripCost, { color: colors.textPrimary }]} />
                </View>
              </View>

              <View style={[styles.flowCard, styles.gridBlockHalf, { borderColor: colors.border }]}>
                <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Ayan Trip</Text>
                <View style={styles.tripInfoContainer}>
                  <CountUpText value={month.ayanKm} formatter={formatKm} style={[styles.tripKm, { color: colors.textPrimary }]} />
                  <Text style={[styles.tripFuel, { color: colors.textSecondary }]}>({month.ayanFuelUsed} L)</Text>
                  <CountUpText value={month.ayanKm * month.costPerKm} formatter={formatINR} style={[styles.tripCost, { color: colors.textPrimary }]} />
                </View>
              </View>

              <View style={[styles.flowCard, styles.gridBlockHalf, { borderColor: colors.border }]}>
                <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Sourav Trip</Text>
                <View style={styles.tripInfoContainer}>
                  <CountUpText value={month.souravKm} formatter={formatKm} style={[styles.tripKm, { color: colors.textPrimary }]} />
                  <Text style={[styles.tripFuel, { color: colors.textSecondary }]}>({month.souravFuelUsed} L)</Text>
                  <CountUpText value={month.souravKm * month.costPerKm} formatter={formatINR} style={[styles.tripCost, { color: colors.textPrimary }]} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
