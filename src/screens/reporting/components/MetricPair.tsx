import { View, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { styles } from '../../ReportScreen.styles';
import { CountUpText } from './CountUpText';
import { MaterialIconName } from '../reportUtils';

export function MetricPair({
  label,
  value,
  formatter,
  backgroundColor,
  textPrimary,
  textSecondary,
  icon,
  hint,
}: {
  label: string;
  value: number;
  formatter: (value: number) => string;
  backgroundColor: string;
  textPrimary: string;
  textSecondary: string;
  icon?: MaterialIconName;
  hint?: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor }]}>
      <View style={styles.metricLabelRow}>
        {icon ? <MaterialIcons name={icon} size={13} color={textSecondary} /> : null}
        <Text style={[styles.metricLabel, { color: textSecondary }]}>{label}</Text>
      </View>
      <CountUpText value={value} formatter={formatter} style={[styles.metricValue, { color: textPrimary }]} />
      {hint ? <Text style={[styles.metricHint, { color: textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}
