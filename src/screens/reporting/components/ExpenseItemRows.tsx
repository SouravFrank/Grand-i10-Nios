import { Text, View } from 'react-native';
import { ReportExpenseItem } from '@/screens/reporting/reportCalculations';
import { styles } from '../../ReportScreen.styles';
import { formatINR } from '../reportUtils';

export function ExpenseItemRows({
  items,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  items: ReportExpenseItem[];
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={styles.expenseList}>
      {items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.expenseRow,
            index < items.length - 1
              ? {
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor,
                }
              : null,
          ]}
        >
          <Text numberOfLines={1} style={[styles.expenseRowLabel, { color: textSecondary }]}>
            {item.title}
          </Text>
          <Text style={[styles.expenseRowValue, { color: textPrimary }]}>{formatINR(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}
