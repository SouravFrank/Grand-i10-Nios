import { ReportUserSummary } from '@/screens/reporting/reportCalculations';
import { StyleSheet, Text, View } from 'react-native';
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
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Inventory share</Text>
          <CountUpText value={summary.fuelInventoryShareAmount} formatter={formatINR} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>

        <View style={styles.userMetric}>
          <Text style={[styles.userMetricLabel, { color: textSecondary }]}>Fuel balance</Text>
          <CountUpText value={summary.fuelNetBalance} formatter={formatINR} style={[styles.userMetricValue, { color: textPrimary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userSplitCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  userSplitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSplitName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userSplitBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  userSplitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  userMetric: {
    width: '47%',
    gap: 2,
  },
  userMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  userMetricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
