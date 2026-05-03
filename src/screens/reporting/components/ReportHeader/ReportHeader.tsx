import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { AppStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';

import { DateTarget, ReportFilterMode } from '../../reportUtils';
import { styles } from './ReportHeader.styles';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

interface ReportHeaderProps {
  filterMode: ReportFilterMode;
  setFilterMode: (mode: ReportFilterMode) => void;
  selectedMonthKey: string;
  setSelectedMonthKey: (month: string) => void;
  fromDate: Date;
  setFromDate: (date: Date) => void;
  toDate: Date;
  setToDate: (date: Date) => void;
  monthOptions: string[];
  currentMonthKey: string;
  onOpenDatePicker: (target: DateTarget) => void;
  onOpenCalculation: () => void;
  onExportCsv: () => void;
  isExportingCsv: boolean;
  navigation: NavigationProp;
}

export function ReportHeader({
  filterMode,
  setFilterMode,
  selectedMonthKey,
  setSelectedMonthKey,
  fromDate,
  toDate,
  onOpenDatePicker,
  onOpenCalculation,
  onExportCsv,
  isExportingCsv,
  monthOptions,
  navigation,
}: ReportHeaderProps) {
  const { colors, isDark } = useAppTheme();
  // Using a slightly stronger surface color since we removed borders
  const secondarySurfaceColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.pageHeader}>
      <View style={styles.heroHeader}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.backButton, { backgroundColor: secondarySurfaceColor }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.heroTitleBlock}>
          <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>REPORT</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Trip Expenses</Text>
        </View>

        <View style={styles.heroActionRow}>
          <Pressable
            onPress={onOpenCalculation}
            hitSlop={10}
            style={[styles.headerIconButton, { backgroundColor: secondarySurfaceColor }]}
          >
            <MaterialIcons name="calculate" size={20} color={colors.textPrimary} />
          </Pressable>

          <Pressable
            onPress={onExportCsv}
            disabled={isExportingCsv}
            hitSlop={10}
            style={[
              styles.headerIconButton,
              {
                opacity: isExportingCsv ? 0.5 : 1,
                backgroundColor: secondarySurfaceColor,
              },
            ]}
          >
            <MaterialIcons name={isExportingCsv ? 'hourglass-empty' : 'file-download'} size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterBlock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineRow}>
          <Pressable
            onPress={() => setFilterMode('range')}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterMode === 'range' ? colors.textPrimary : secondarySurfaceColor,
              },
            ]}
          >
            {filterMode === 'range' ? (
              <MaterialIcons name="check" size={16} color={colors.invertedText} />
            ) : null}
            <MaterialIcons
              name="date-range"
              size={16}
              color={filterMode === 'range' ? colors.invertedText : colors.textPrimary}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: filterMode === 'range' ? colors.invertedText : colors.textPrimary },
              ]}
            >
              Custom Range
            </Text>
          </Pressable>

          {monthOptions.map((monthKey) => {
            const isActive = filterMode === 'month' && monthKey === selectedMonthKey;
            return (
              <Pressable
                key={monthKey}
                onPress={() => {
                  setFilterMode('month');
                  setSelectedMonthKey(monthKey);
                }}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: isActive ? colors.textPrimary : secondarySurfaceColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: isActive ? colors.invertedText : colors.textPrimary },
                  ]}
                >
                  {dayjs(`${monthKey}-01`).format(INDIA_MONTH_FORMAT)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filterMode === 'range' ? (
          <View style={styles.rangeRow}>
            <Pressable
              onPress={() => onOpenDatePicker('from')}
              style={[styles.rangeCard, { backgroundColor: secondarySurfaceColor }]}
            >
              <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>From</Text>
              <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                {dayjs(fromDate).format(INDIA_DATE_FORMAT)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onOpenDatePicker('to')}
              style={[styles.rangeCard, { backgroundColor: secondarySurfaceColor }]}
            >
              <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>To</Text>
              <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                {dayjs(toDate).format(INDIA_DATE_FORMAT)}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}