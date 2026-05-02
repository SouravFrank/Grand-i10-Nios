import { ReportExpenseItem } from '@/screens/reporting/reportCalculations';
import { Text, View } from 'react-native';
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
            // Enforce the horizontal invoice layout here:
            {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
            },
            index < items.length - 1
              ? {
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor,
                }
              : null,
          ]}
        >
          <Text 
            numberOfLines={1} 
            style={[
              styles.expenseRowLabel, 
              // flex: 1 ensures the text takes up available space but truncates before hitting the price
              { color: textSecondary, flex: 1, marginRight: 16 }
            ]}
          >
            {item.title}
          </Text>
          <Text 
            style={[
              styles.expenseRowValue, 
              // Ensuring the price stands out with a slightly heavier weight
              { color: textPrimary, fontWeight: '700' }
            ]}
          >
            {formatINR(item.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}