import { useAppTheme } from '@/theme/useAppTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { FastagData, ReportUserSummary } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { styles } from '../common/TripTab.styles';

// Define the signature colors
const AYAN_COLOR = '#3B82F6'; // Modern Blue
const SOURAV_COLOR = '#8B5CF6'; // Modern Purple

interface FastagSummarySectionProps {
  fastag: FastagData;
  ayanSummary: ReportUserSummary;
  souravSummary: ReportUserSummary;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function FastagSummarySection({
  fastag, ayanSummary, souravSummary, surfaceColor, secondarySurfaceColor,
}: FastagSummarySectionProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="credit-card" size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fastag Summary</Text>
        </View>
      </View>

      {/* 3-Column Layout for Balances */}
      <View style={styles.threeColumnRow}>
        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Previous</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]}>
            {formatINR(fastag.openingBalance)}
          </Text>
        </View>

        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Recharged</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={1}>
            {formatINR(fastag.rechargeAmount)}
          </Text>
        </View>

        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Used</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={1}>
            {formatINR(fastag.usedAmount)}
          </Text>
        </View>
      </View>

      {/* Closing Balance Highlight */}
      <View style={[styles.highlightedCard, { backgroundColor: `${colors.primary}15` }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="account-balance-wallet" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Closing Balance</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.primaryAmount, { color: colors.primary }]}>{formatINR(fastag.closingBalance)}</Text>
        </View>
      </View>

      <View style={styles.userSplitSection}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, marginBottom: 4 }]}>User-wise Usage</Text>
        <View style={styles.userCardsRow}>
          
          {/* Ayan's Card - Blue Highlight */}
          <View style={[
            styles.userCard, 
            { backgroundColor: `${AYAN_COLOR}0A`, borderWidth: 1, borderColor: `${AYAN_COLOR}40` }
          ]}>
            <View style={styles.userHeader}>
              <MaterialIcons name="person" size={16} color={AYAN_COLOR} />
              <Text style={[styles.userName, { color: AYAN_COLOR }]}>Ayan</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(ayanSummary.fastagUsedAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Used</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(ayanSummary.fastagRechargeAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Recharged</Text>
            </View>
          </View>

          {/* Sourav's Card - Purple Highlight */}
          <View style={[
            styles.userCard, 
            { backgroundColor: `${SOURAV_COLOR}0A`, borderWidth: 1, borderColor: `${SOURAV_COLOR}40` }
          ]}>
            <View style={styles.userHeader}>
              <MaterialIcons name="person" size={16} color={SOURAV_COLOR} />
              <Text style={[styles.userName, { color: SOURAV_COLOR }]}>Sourav</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(souravSummary.fastagUsedAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Used</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(souravSummary.fastagRechargeAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>Recharged</Text>
            </View>
          </View>

        </View>
      </View>
    </View>
  );
}