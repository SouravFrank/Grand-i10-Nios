import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { ReportUserSummary } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { MetricPair } from '../MetricPair';
import { styles } from '../common/OthersTab.styles';

interface OthersOverviewSectionProps {
  ayanSummary: ReportUserSummary | undefined;
  souravSummary: ReportUserSummary | undefined;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function OthersOverviewSection({
  ayanSummary,
  souravSummary,
  surfaceColor,
  secondarySurfaceColor,
}: OthersOverviewSectionProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="grid-view" size={16} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
        </View>
      </View>

      <View style={styles.doubleMetricRow}>
        <MetricPair
          label="Ayan Paid"
          value={ayanSummary?.otherPaidAmount ?? 0}
          formatter={formatINR}
          backgroundColor={secondarySurfaceColor}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
          icon="payments"
        />
        <MetricPair
          label="Sourav Paid"
          value={souravSummary?.otherPaidAmount ?? 0}
          formatter={formatINR}
          backgroundColor={secondarySurfaceColor}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
          icon="payments"
        />
        <MetricPair
          label="Ayan's Share"
          value={ayanSummary?.otherShareAmount ?? 0}
          formatter={formatINR}
          backgroundColor={secondarySurfaceColor}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
          icon="person"
        />
        <MetricPair
          label="Sourav's Share"
          value={souravSummary?.otherShareAmount ?? 0}
          formatter={formatINR}
          backgroundColor={secondarySurfaceColor}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
          icon="person"
        />
      </View>
    </View>
  );
}
