import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { ReportUserSummary } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from '../common/OthersTab.styles';

const AYAN_COLOR = '#3B82F6';
const SOURAV_COLOR = '#8B5CF6';

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

  // Calculate the combined total of all other expenses
  const totalOthersAmount = (ayanSummary?.otherPaidAmount ?? 0) + (souravSummary?.otherPaidAmount ?? 0);

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
            transform: [{ rotate: '-5deg' }],
          }}>
            <MaterialIcons name="grid-view" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Overview</Text>
        </View>
      </View>

      {/* Total Expenses Card */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: secondarySurfaceColor,
        padding: 14,
        borderRadius: 14,
        marginTop: 4,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="receipt-long" size={18} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary }}>Total Expenses</Text>
        </View>
        <CountUpText
          value={totalOthersAmount}
          formatter={formatINR}
          style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 }}
        />
      </View>

      <View style={{ gap: 8 }}>
        
        {/* Ayan's Compact Strip */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12, 
          borderRadius: 12,
          backgroundColor: `${AYAN_COLOR}0A`, 
          borderWidth: 1, 
          borderColor: `${AYAN_COLOR}40` 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: 85, gap: 6 }}>
            <MaterialIcons name="person" size={16} color={AYAN_COLOR} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: AYAN_COLOR }}>Ayan</Text>
          </View>

          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                {formatINR(ayanSummary?.otherPaidAmount ?? 0)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paid</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: `${AYAN_COLOR}30` }} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                {formatINR(ayanSummary?.otherShareAmount ?? 0)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Share</Text>
            </View>
          </View>
        </View>

        {/* Sourav's Compact Strip */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12, 
          borderRadius: 12,
          backgroundColor: `${SOURAV_COLOR}0A`, 
          borderWidth: 1, 
          borderColor: `${SOURAV_COLOR}40` 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: 85, gap: 6 }}>
            <MaterialIcons name="person" size={16} color={SOURAV_COLOR} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: SOURAV_COLOR }}>Sourav</Text>
          </View>

          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                {formatINR(souravSummary?.otherPaidAmount ?? 0)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paid</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: `${SOURAV_COLOR}30` }} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                {formatINR(souravSummary?.otherShareAmount ?? 0)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Share</Text>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
}