import { Text, View } from 'react-native';
import { ReportUserSummary } from '@/screens/reporting/reportCalculations';
import { styles } from '../../ReportScreen.styles';
import { formatINR, formatKm, formatLiters } from '../reportUtils';
import { CountUpText } from './CountUpText';

export function UserSplitCard({
  summary,
  currentUserId,
  backgroundColor,
  textPrimary,
  textSecondary,
  badgeBackgroundColor,
  badgeTextColor,
}: {
  summary: ReportUserSummary;
  currentUserId?: string | null;
  backgroundColor: string;
  textPrimary: string;
  textSecondary: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
}) {
  return (
    <View style={[styles.userSplitCard, { backgroundColor }]}>
      <View style={styles.userSplitHeader}>
        <Text style={[styles.userSplitName, { color: textPrimary }]}>{summary.name}</Text>
        {currentUserId === summary.id ? (
          <Text
            style={[
              styles.userSplitBadge,
              {
                backgroundColor: badgeBackgroundColor,
                color: badgeTextColor,
              },
            ]}
          >
            YOU
          </Text>
        ) : null}
      </View>

      <View style={styles.userSplitGrid}>
        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Distance</Text>
          <CountUpText value={summary.distanceKm} formatter={formatKm} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Fuel filled</Text>
          <CountUpText value={summary.fuelFilledLiters} formatter={formatLiters} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Fuel paid</Text>
          <CountUpText value={summary.fuelPaidAmount} formatter={formatINR} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Fuel used</Text>
          <CountUpText value={summary.fuelUsedLiters} formatter={formatLiters} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Consumption cost</Text>
          <CountUpText value={summary.fuelConsumptionCost} formatter={formatINR} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Fuel balance</Text>
          <CountUpText value={summary.fuelNetBalance} formatter={formatINR} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>
      </View>
    </View>
  );
}
