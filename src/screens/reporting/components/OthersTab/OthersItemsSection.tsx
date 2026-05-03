import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { OthersReportData } from '../../reportCalculations';
import { formatINR, getOtherSectionIcon } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { ExpenseItemRows } from '../ExpenseItemRows';
import { styles } from '../common/OthersTab.styles';

interface OthersItemsSectionProps {
  others: OthersReportData;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function OthersItemsSection({
  others,
  surfaceColor,
  secondarySurfaceColor,
}: OthersItemsSectionProps) {
  const { colors } = useAppTheme();

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
            <MaterialIcons name="receipt-long" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Item Breakdown</Text>
        </View>
      </View>

      {others.sections.length === 0 ? (
        <View style={[
          styles.emptyBlock, 
          { 
            backgroundColor: secondarySurfaceColor, 
            borderWidth: 2, 
            borderColor: colors.border, 
            borderStyle: 'dashed',
            marginTop: 8,
            padding: 24
          }
        ]}>
          <MaterialIcons name="receipt-long" size={28} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No other expenses logged yet</Text>
        </View>
      ) : (
        <View style={{ gap: 16, marginTop: 12 }}>
          {others.sections.map((section) => (
            <View
              key={section.key}
              style={{
                backgroundColor: secondarySurfaceColor,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Category Ribbon with Total Sum in Header */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: `${colors.textPrimary}0A`, 
                paddingHorizontal: 16, 
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.border
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons
                    name={getOtherSectionIcon(section.key)}
                    size={16}
                    color={colors.textPrimary}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: colors.textPrimary }}>
                    {section.title}
                  </Text>
                </View>
                {/* Moved the Total Sum back to the top right! */}
                <CountUpText
                  value={section.totalAmount}
                  formatter={formatINR}
                  style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 }}
                />
              </View>

              {/* Invoice Rows */}
              <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
                <ExpenseItemRows
                  items={section.items}
                  borderColor={colors.border}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}