import { useAppTheme } from '@/theme/useAppTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { FuelData, ReportUserSummary } from '../../reportCalculations';
import { formatINR, formatLiters } from '../../reportUtils';
import { styles } from '../common/TripTab.styles';

const AYAN_COLOR = '#3B82F6';
const SOURAV_COLOR = '#8B5CF6';

interface FuelSummarySectionProps {
  fuel: FuelData;
  ayanSummary: ReportUserSummary;
  souravSummary: ReportUserSummary;
  costPerKm: number;
  totalKm: number;
  totalFuelUsed: number;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function FuelSummarySection({
  fuel, ayanSummary, souravSummary, costPerKm, totalKm, totalFuelUsed, surfaceColor, secondarySurfaceColor,
}: FuelSummarySectionProps) {
  const { colors } = useAppTheme();

  // FIX: Range is Liters * Mileage. 
  // We calculate current active mileage, falling back to 15 if no fuel has been spent yet.
  const currentMileage = totalFuelUsed > 0 ? (totalKm / totalFuelUsed) : 15;
  const estimatedRange = Math.max(0, Math.round(fuel.closingLiters * currentMileage));

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          {/* Creative Icon Badge */}
          <View style={{
            backgroundColor: colors.textPrimary,
            padding: 6,
            borderRadius: 8,
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            transform: [{ rotate: '-5deg' }],
          }}>
            <MaterialIcons name="local-gas-station" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Fuel Summary</Text>
        </View>
      </View>

      {/* 3-Column Layout for Fuel Movement */}
      <View style={styles.threeColumnRow}>
        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Previous</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]}>
            {formatLiters(fuel.openingLiters)}
          </Text>
          <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>{formatINR(fuel.openingValue)}</Text>
        </View>

        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Filled</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]}>
            {formatLiters(fuel.filledLiters)}
          </Text>
          <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>{formatINR(fuel.filledAmount)}</Text>
        </View>

        <View style={[styles.compactCard, { backgroundColor: secondarySurfaceColor }]}>
          <Text style={[styles.compactTitle, { color: colors.textSecondary }]}>Spent</Text>
          <Text style={[styles.compactAmount, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={1}>
            {formatLiters(totalFuelUsed)}
          </Text>
          <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatINR(totalKm * costPerKm)}
          </Text>
        </View>
      </View>

      {/* Closing Balance Highlight - Enhanced UI */}
      <View style={[
        styles.highlightedCard, 
        { backgroundColor: `${colors.primary}10`, borderWidth: 2, borderColor: `${colors.primary}40`, borderStyle: 'dashed' }
      ]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="invert-colors" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Fuel Remaining</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.primaryAmount, { color: colors.primary }]}>{formatLiters(fuel.closingLiters)}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.secondaryAmount, { color: colors.primary }]}>{formatINR(fuel.closingValue)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="multiple-stop" size={14} color={colors.primary} />
              <Text style={[styles.tertiaryLabel, { color: colors.primary }]}>Range: ~{estimatedRange} KM</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.userSplitSection}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, marginBottom: 4 }]}>Fuel Paid By</Text>
        <View style={styles.userCardsRow}>

          {/* Ayan's Card */}
          <View style={[
            styles.userCard,
            { backgroundColor: `${AYAN_COLOR}0A`, borderWidth: 1, borderColor: `${AYAN_COLOR}40` }
          ]}>
            <View style={styles.userHeader}>
              <MaterialIcons name="person" size={16} color={AYAN_COLOR} />
              <Text style={[styles.userName, { color: AYAN_COLOR }]}>Ayan</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(ayanSummary.fuelPaidAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>{formatLiters(ayanSummary.fuelFilledLiters)} Filled</Text>
            </View>
          </View>

          {/* Sourav's Card */}
          <View style={[
            styles.userCard,
            { backgroundColor: `${SOURAV_COLOR}0A`, borderWidth: 1, borderColor: `${SOURAV_COLOR}40` }
          ]}>
            <View style={styles.userHeader}>
              <MaterialIcons name="person" size={16} color={SOURAV_COLOR} />
              <Text style={[styles.userName, { color: SOURAV_COLOR }]}>Sourav</Text>
            </View>
            <View style={styles.userStatBlock}>
              <Text style={[styles.secondaryAmount, { color: colors.textPrimary }]}>{formatINR(souravSummary.fuelPaidAmount)}</Text>
              <Text style={[styles.tertiaryLabel, { color: colors.textSecondary }]}>{formatLiters(souravSummary.fuelFilledLiters)} Filled</Text>
            </View>
          </View>
        </View>
      </View>

    </View>
  );
}