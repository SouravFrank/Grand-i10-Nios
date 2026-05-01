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
          <MaterialIcons name="receipt-long" size={16} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Items</Text>
        </View>
      </View>

      {others.sections.length === 0 ? (
        <View style={styles.emptyBlock}>
          <MaterialIcons name="receipt-long" size={20} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No other expenses to show</Text>
        </View>
      ) : (
        <View style={styles.expenseSectionStack}>
          {others.sections.map((section) => (
            <View
              key={section.key}
              style={[
                styles.expenseSectionCard,
                {
                  borderColor: colors.border,
                  backgroundColor: secondarySurfaceColor,
                },
              ]}
            >
              <View style={styles.otherSectionHeader}>
                <View style={styles.labelRow}>
                  <MaterialIcons
                    name={getOtherSectionIcon(section.key)}
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.otherSectionTitle, { color: colors.textPrimary }]}>
                    {section.title}
                  </Text>
                </View>
                <CountUpText
                  value={section.totalAmount}
                  formatter={formatINR}
                  style={[styles.otherSectionValue, { color: colors.textPrimary }]}
                />
              </View>

              <ExpenseItemRows
                items={section.items}
                borderColor={colors.border}
                textPrimary={colors.textPrimary}
                textSecondary={colors.textSecondary}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
