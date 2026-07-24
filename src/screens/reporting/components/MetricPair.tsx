import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIconName } from '../reportUtils';
import { CountUpText } from './CountUpText';

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

const styles = StyleSheet.create({
  metricCard: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
    flex: 1,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricHint: {
    fontSize: 10,
    fontWeight: '500',
  },
});
