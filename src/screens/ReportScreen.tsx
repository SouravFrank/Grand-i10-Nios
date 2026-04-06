import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import {
  buildExpenseReport,
} from '@/screens/reporting/reportCalculations';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';

import { styles } from './ReportScreen.styles';
import {
  DateTarget,
  formatINR,
  formatLiters,
  formatMileage,
  getOtherSectionIcon,
  ReportFilterMode,
  ReportTab,
} from './reporting/reportUtils';

import { CountUpText } from './reporting/components/CountUpText';
import { ExpenseItemRows } from './reporting/components/ExpenseItemRows';
import { MetricPair } from './reporting/components/MetricPair';
import { MotionCard } from './reporting/components/MotionCard';
import { ReportHeroIcon } from './reporting/components/ReportHeroIcon';
import { SectionCard } from './reporting/components/SectionCard';
import { UserSplitCard } from './reporting/components/UserSplitCard';

type Props = NativeStackScreenProps<AppStackParamList, 'Report'>;

export function ReportScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const entries = useAppStore((state) => state.entries);
  const currentUser = useAppStore((state) => state.currentUser);
  const reportMileageByMonth = useAppStore((state) => state.reportMileageByMonth);
  const settledReportMonths = useAppStore((state) => state.settledReportMonths);
  const setReportMileage = useAppStore((state) => state.setReportMileage);
  const markReportSettled = useAppStore((state) => state.markReportSettled);

  const currentMonthKey = dayjs().format('YYYY-MM');
  const [filterMode, setFilterMode] = useState<ReportFilterMode>('month');
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').toDate());
  const [toDate, setToDate] = useState(dayjs().toDate());
  const [activeDateTarget, setActiveDateTarget] = useState<DateTarget | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('trip');
  const [tabDirection, setTabDirection] = useState(1);
  const [mileageDraft, setMileageDraft] = useState('');
  const [showFuelInfo, setShowFuelInfo] = useState(false);
  const [isMileageEditorVisible, setIsMileageEditorVisible] = useState(false);
  const [isSettlementModalVisible, setIsSettlementModalVisible] = useState(false);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([currentMonthKey]);
    for (const entry of entries) {
      keys.add(dayjs(entry.createdAt).format('YYYY-MM'));
    }
    return Array.from(keys).sort((left, right) => (left < right ? 1 : -1));
  }, [currentMonthKey, entries]);

  const activeRange = useMemo(() => {
    if (filterMode === 'month') {
      const monthStart = dayjs(`${selectedMonthKey}-01`).startOf('month');
      const monthEnd = monthStart.endOf('month');
      const effectiveEnd = selectedMonthKey === currentMonthKey ? dayjs().endOf('day') : monthEnd.endOf('day');

      return {
        startTs: monthStart.valueOf(),
        endTs: effectiveEnd.valueOf(),
        filterMode,
        monthKey: selectedMonthKey,
        isCompleteMonth: effectiveEnd.isSame(monthEnd, 'day'),
      } as const;
    }

    const nextFrom = dayjs(fromDate).startOf('day');
    const nextTo = dayjs(toDate).endOf('day');
    const safeStart = nextTo.isBefore(nextFrom) ? nextTo.startOf('day') : nextFrom;
    const safeEnd = nextTo.isBefore(nextFrom) ? nextFrom.endOf('day') : nextTo;

    return {
      startTs: safeStart.valueOf(),
      endTs: safeEnd.valueOf(),
      filterMode,
      isCompleteMonth: false,
    } as const;
  }, [currentMonthKey, filterMode, fromDate, selectedMonthKey, toDate]);

  const report = useMemo(
    () =>
      buildExpenseReport({
        entries,
        currentUserId: currentUser?.id,
        mileageByMonth: reportMileageByMonth,
        settledMonths: settledReportMonths,
        range: activeRange,
      }),
    [activeRange, currentUser?.id, entries, reportMileageByMonth, settledReportMonths],
  );

  useEffect(() => {
    setMileageDraft(report.mileageEditorValue.toFixed(1));
  }, [report.mileageEditorValue, report.mileageEditorMonthKey]);

  useEffect(() => {
    setIsMileageEditorVisible(false);
  }, [filterMode, report.mileageEditorMonthKey]);

  const tabAnim = useRef(new Animated.Value(1)).current;
  const statusToneAnim = useRef(new Animated.Value(report.settlement.toneIndex)).current;
  const statusScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    tabAnim.setValue(0);
    Animated.timing(tabAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabAnim]);

  useEffect(() => {
    Animated.timing(statusToneAnim, {
      toValue: report.settlement.toneIndex,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [report.settlement.toneIndex, statusToneAnim]);

  const surfaceColor = isDark ? 'rgba(24,24,24,0.92)' : '#F6F6F6';
  const secondarySurfaceColor = isDark ? 'rgba(38,38,38,0.96)' : 'rgba(0,0,0,0.035)';
  const statusBackgroundColor = statusToneAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(239,68,68,0.12)', 'rgba(245,158,11,0.12)', 'rgba(34,197,94,0.12)'],
  });
  const statusBorderColor = statusToneAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(239,68,68,0.45)', 'rgba(245,158,11,0.45)', 'rgba(34,197,94,0.45)'],
  });
  const statusTextColor = statusToneAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#EF4444', '#F59E0B', '#22C55E'],
  });

  const ayanSummary = report.usersById.ayan;
  const souravSummary = report.usersById.sourav;
  const canConfirmSettlement =
    filterMode === 'month' &&
    Boolean(activeRange.monthKey) &&
    activeRange.isCompleteMonth &&
    !report.isSettled;

  const openDatePicker = (target: DateTarget) => {
    setActiveDateTarget(target);
    setIsDatePickerVisible(true);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setIsDatePickerVisible(false);
      return;
    }

    if (!selectedDate || !activeDateTarget) {
      return;
    }

    if (activeDateTarget === 'from') {
      setFromDate(selectedDate);
      if (dayjs(selectedDate).isAfter(dayjs(toDate), 'day')) {
        setToDate(selectedDate);
      }
    }

    if (activeDateTarget === 'to') {
      setToDate(selectedDate);
      if (dayjs(selectedDate).isBefore(dayjs(fromDate), 'day')) {
        setFromDate(selectedDate);
      }
    }

    setIsDatePickerVisible(false);
  };

  const handleSaveMileage = () => {
    if (!report.mileageEditorMonthKey) return;

    const parsedValue = Number(mileageDraft);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    setReportMileage(report.mileageEditorMonthKey, parsedValue);
  };

  const handleConfirmSettlement = () => {
    if (!activeRange.monthKey || !canConfirmSettlement) {
      setIsSettlementModalVisible(false);
      return;
    }

    markReportSettled(activeRange.monthKey);
    setIsSettlementModalVisible(false);

    Animated.sequence([
      Animated.spring(statusScaleAnim, {
        toValue: 1.04,
        speed: 20,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(statusScaleAnim, {
        toValue: 1,
        speed: 18,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <MotionCard delay={20}>
          <View style={styles.pageHeader}>
            <View style={styles.heroHeader}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={[
                  styles.backButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: secondarySurfaceColor,
                  },
                ]}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.heroTitleBlock}>
                <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>REPORT</Text>
                <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Trip Expenses</Text>
              </View>

              <ReportHeroIcon
                cardColor={secondarySurfaceColor}
                borderColor={colors.border}
                iconColor={colors.textPrimary}
              />
            </View>

            <View style={styles.filterBlock}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineRow}>
                <Pressable
                  onPress={() => setFilterMode('range')}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: filterMode === 'range' ? colors.textPrimary : colors.border,
                      backgroundColor: filterMode === 'range' ? colors.textPrimary : secondarySurfaceColor,
                    },
                  ]}
                >
                  {filterMode === 'range' ? (
                    <MaterialIcons name="check" size={14} color={colors.invertedText} />
                  ) : null}
                  <MaterialIcons
                    name="date-range"
                    size={14}
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
                          borderColor: isActive ? colors.textPrimary : colors.border,
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
                    onPress={() => openDatePicker('from')}
                    style={[
                      styles.rangeCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: secondarySurfaceColor,
                      },
                    ]}
                  >
                    <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>From</Text>
                    <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                      {dayjs(fromDate).format(INDIA_DATE_FORMAT)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openDatePicker('to')}
                    style={[
                      styles.rangeCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: secondarySurfaceColor,
                      },
                    ]}
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
        </MotionCard>

        <MotionCard delay={80}>
          <View style={styles.summaryGrid}>
            <View
              style={[
                styles.summaryCard,
                styles.gridSpanFull,
                {
                  backgroundColor: surfaceColor,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.summaryTopRow}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="account-balance-wallet" size={14} color={colors.textSecondary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expense</Text>
                </View>
                <View
                  style={[
                    styles.inlineStatPill,
                    {
                      borderColor: colors.border,
                      backgroundColor: secondarySurfaceColor,
                    },
                  ]}
                >
                  <MaterialIcons name="timeline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.inlineStatText, { color: colors.textPrimary }]}>
                    {report.summary.totalTrips} {report.summary.totalTrips === 1 ? 'trip' : 'trips'}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryFrame}>
                <CountUpText value={report.summary.totalExpense} formatter={formatINR} style={[styles.summaryValue, { color: colors.textPrimary }]} />
              </View>
            </View>

            <View
              style={[
                styles.summaryCard,
                styles.gridSpanHalf,
                {
                  backgroundColor: surfaceColor,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.labelRow}>
                <MaterialIcons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ayan&apos;s Share</Text>
              </View>
              <View style={styles.summaryFrame}>
                <CountUpText value={report.summary.ayanShare} formatter={formatINR} style={[styles.summaryValue, { color: colors.textPrimary }]} />
              </View>
            </View>

            <View
              style={[
                styles.summaryCard,
                styles.gridSpanHalf,
                {
                  backgroundColor: surfaceColor,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.labelRow}>
                <MaterialIcons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sourav&apos;s Share</Text>
              </View>
              <View style={styles.summaryFrame}>
                <CountUpText value={report.summary.souravShare} formatter={formatINR} style={[styles.summaryValue, { color: colors.textPrimary }]} />
              </View>
            </View>
          </View>
        </MotionCard>

        <MotionCard delay={140}>
          <Animated.View
            style={[
              styles.settlementCard,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
                transform: [{ scale: statusScaleAnim }],
              },
            ]}
          >
            <View style={styles.settlementHeader}>
              <View style={styles.settlementCopy}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="swap-horiz" size={14} color={colors.textSecondary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Settlement</Text>
                </View>
                <Text style={[styles.settlementHeadline, { color: colors.textPrimary }]}>
                  {report.settlement.title}
                </Text>
                <View style={styles.labelRow}>
                  <MaterialIcons
                    name={report.isSettled ? 'task-alt' : 'arrow-forward'}
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.settlementDirection, { color: colors.textSecondary }]}>
                    {report.settlement.directionMessage}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsSettlementModalVisible(true)}
                style={styles.settlementBadgePressable}
              >
                <Animated.View
                  style={[
                    styles.settlementBadge,
                    {
                      backgroundColor: statusBackgroundColor,
                      borderColor: statusBorderColor,
                    },
                  ]}
                >
                  <Animated.Text style={[styles.settlementBadgeText, { color: statusTextColor }]}>
                    {report.isSettled ? 'Closed' : report.settlement.currentUserMessage}
                  </Animated.Text>
                </Animated.View>
              </Pressable>
            </View>

            {!canConfirmSettlement && !report.isSettled ? (
              <View style={styles.inlineInfoRow}>
                <MaterialIcons name="info-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.settlementLockHint, { color: colors.textSecondary }]}>Complete month required</Text>
              </View>
            ) : null}

            {report.isSettled ? (
              <View
                style={[
                  styles.readOnlyBanner,
                  {
                    borderColor: colors.border,
                    backgroundColor: secondarySurfaceColor,
                  },
                ]}
              >
                <MaterialIcons name="lock" size={16} color={colors.textPrimary} />
                <Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>
                  This month is settled. Mileage and editable controls are locked.
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </MotionCard>

        {report.warnings.length > 0 ? (
          <MotionCard delay={200}>
            <View
              style={[
                styles.warningCard,
                {
                  backgroundColor: surfaceColor,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialIcons name="warning-amber" size={18} color={colors.textPrimary} />
              <View style={styles.warningCopy}>
                {report.warnings.map((warning) => (
                  <Text key={warning} style={[styles.warningText, { color: colors.textPrimary }]}>
                    {warning}
                  </Text>
                ))}
              </View>
            </View>
          </MotionCard>
        ) : null}

        <MotionCard delay={240}>
          <View
            style={[
              styles.tabShell,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                if (activeTab !== 'trip') {
                  setTabDirection(-1);
                  setActiveTab('trip');
                }
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: activeTab === 'trip' ? colors.textPrimary : 'transparent',
                },
              ]}
            >
              <View style={styles.tabInner}>
                <MaterialIcons name="directions-car" size={14} color={activeTab === 'trip' ? colors.invertedText : colors.textPrimary} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'trip' ? colors.invertedText : colors.textPrimary },
                  ]}
                >
                  Trip
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (activeTab !== 'others') {
                  setTabDirection(1);
                  setActiveTab('others');
                }
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: activeTab === 'others' ? colors.textPrimary : 'transparent',
                },
              ]}
            >
              <View style={styles.tabInner}>
                <MaterialIcons name="receipt-long" size={14} color={activeTab === 'others' ? colors.invertedText : colors.textPrimary} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'others' ? colors.invertedText : colors.textPrimary },
                  ]}
                >
                  Others
                </Text>
              </View>
            </Pressable>
          </View>
        </MotionCard>

        <Animated.View
          style={{
            opacity: tabAnim,
            transform: [
              {
                translateX: tabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18 * tabDirection, 0],
                }),
              },
            ],
          }}
        >
          {activeTab === 'trip' ? (
            <View style={styles.dashboardGrid}>
              <MotionCard delay={280} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="speed" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mileage</Text>
                    </View>

                    <View style={styles.headerActions}>
                      {report.canEditMileage ? (
                        <Pressable
                          onPress={() => setIsMileageEditorVisible((value) => !value)}
                          style={styles.infoButton}
                        >
                          <MaterialIcons
                            name={isMileageEditorVisible ? 'close' : 'edit'}
                            size={16}
                            color={colors.textPrimary}
                          />
                        </Pressable>
                      ) : null}

                      <Pressable onPress={() => setShowFuelInfo((value) => !value)} style={styles.infoButton}>
                        <MaterialIcons name="info-outline" size={16} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  {showFuelInfo ? (
                    <View
                      style={[
                        styles.infoBubble,
                        {
                          borderColor: colors.border,
                          backgroundColor: secondarySurfaceColor,
                        },
                      ]}
                    >
                      <Text style={[styles.infoBubbleText, { color: colors.textPrimary }]}>
                        Fuel used = distance / mileage
                      </Text>
                    </View>
                  ) : null}

                  {report.monthKeysInRange.length > 1 ? (
                    <View style={styles.mileageBreakdownRow}>
                      {report.monthKeysInRange.map((monthKey) => (
                        <View
                          key={monthKey}
                          style={[
                            styles.mileageMiniCard,
                            styles.gridBlockHalf,
                            {
                              borderColor: colors.border,
                              backgroundColor: secondarySurfaceColor,
                            },
                          ]}
                        >
                          <Text style={[styles.mileageMiniLabel, { color: colors.textSecondary }]}>
                            {dayjs(`${monthKey}-01`).format(INDIA_MONTH_FORMAT)}
                          </Text>
                          <Text style={[styles.mileageMiniValue, { color: colors.textPrimary }]}>
                            {formatMileage(report.mileageByMonth[monthKey])}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.mileageStack}>
                      <View
                        style={[
                          styles.mileageInfoCard,
                          {
                            borderColor: colors.border,
                            backgroundColor: secondarySurfaceColor,
                          },
                        ]}
                      >
                        <View style={styles.labelRow}>
                          <MaterialIcons name="speed" size={13} color={colors.textSecondary} />
                          <Text style={[styles.mileageEditorLabel, { color: colors.textSecondary }]}>Current</Text>
                        </View>
                        <Text style={[styles.mileageValue, { color: colors.textPrimary }]}>
                          {formatMileage(report.mileageEditorValue)}
                        </Text>
                      </View>

                      {isMileageEditorVisible && report.canEditMileage ? (
                        <View style={styles.mileageEditorRow}>
                          <View style={styles.mileageEditorInputWrap}>
                            <TextInput
                              value={mileageDraft}
                              onChangeText={setMileageDraft}
                              editable={report.canEditMileage}
                              keyboardType="decimal-pad"
                              style={[
                                styles.mileageInput,
                                {
                                  color: colors.textPrimary,
                                  borderColor: colors.border,
                                  backgroundColor: colors.background,
                                },
                              ]}
                              placeholder="13.5"
                              placeholderTextColor={colors.textSecondary}
                            />
                          </View>

                          <Pressable
                            onPress={handleSaveMileage}
                            disabled={!report.canEditMileage}
                            style={[
                              styles.mileageSaveButton,
                              {
                                opacity: report.canEditMileage ? 1 : 0.45,
                                backgroundColor: colors.textPrimary,
                              },
                            ]}
                          >
                            <MaterialIcons name="check" size={16} color={colors.invertedText} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {!report.canEditMileage ? (
                    <View style={styles.inlineInfoRow}>
                      <MaterialIcons name={report.isSettled ? 'lock-outline' : 'info-outline'} size={13} color={colors.textSecondary} />
                      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        {report.isSettled
                          ? 'Locked'
                          : filterMode === 'range'
                            ? 'Uses saved monthly values'
                            : 'Complete month required'}
                      </Text>
                    </View>
                  ) : null}
                </SectionCard>
              </MotionCard>

              <MotionCard delay={340} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="local-gas-station" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fuel</Text>
                    </View>
                  </View>

                  <View style={styles.doubleMetricRow}>
                    <MetricPair
                      label="Total fuel cost"
                      value={report.fuel.totalFuelCost}
                      formatter={formatINR}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="payments"
                    />
                    <MetricPair
                      label="Cost per liter"
                      value={report.fuel.costPerLiter}
                      formatter={(value) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/L`}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="opacity"
                    />
                  </View>

                  {report.hasFuelData ? (
                    <View style={styles.userSplitStack}>
                      <UserSplitCard
                        summary={ayanSummary}
                        currentUserId={currentUser?.id}
                        backgroundColor={secondarySurfaceColor}
                        textPrimary={colors.textPrimary}
                        textSecondary={colors.textSecondary}
                        badgeBackgroundColor={colors.textPrimary}
                        badgeTextColor={colors.invertedText}
                      />
                      <UserSplitCard
                        summary={souravSummary}
                        currentUserId={currentUser?.id}
                        backgroundColor={secondarySurfaceColor}
                        textPrimary={colors.textPrimary}
                        textSecondary={colors.textSecondary}
                        badgeBackgroundColor={colors.textPrimary}
                        badgeTextColor={colors.invertedText}
                      />
                    </View>
                  ) : (
                    <View style={styles.emptyBlock}>
                      <MaterialIcons name="local-gas-station" size={20} color={colors.textSecondary} />
                      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No fuel data in this period</Text>
                    </View>
                  )}
                </SectionCard>
              </MotionCard>

              <MotionCard delay={400} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="water-drop" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fuel Flow</Text>
                    </View>
                  </View>

                  <View style={styles.flowGrid}>
                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Opening Fuel</Text>
                      <CountUpText value={report.fuel.openingLiters} formatter={formatLiters} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Fuel Filled</Text>
                      <CountUpText value={report.fuel.filledLiters} formatter={formatLiters} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Fuel Used</Text>
                      <CountUpText value={report.fuel.usedLiters} formatter={formatLiters} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Closing Fuel</Text>
                      <CountUpText value={report.fuel.closingLiters} formatter={formatLiters} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>
                  </View>
                </SectionCard>
              </MotionCard>

              <MotionCard delay={460} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="toll" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>FASTag</Text>
                    </View>
                  </View>

                  <View style={styles.flowGrid}>
                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Opening Balance</Text>
                      <CountUpText value={report.fastag.openingBalance} formatter={formatINR} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Recharge</Text>
                      <CountUpText value={report.fastag.rechargeAmount} formatter={formatINR} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Toll Used</Text>
                      <CountUpText value={report.fastag.usedAmount} formatter={formatINR} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>

                    <View style={[styles.flowCard, styles.gridBlockHalf, { backgroundColor: secondarySurfaceColor, borderColor: colors.border }]}>
                      <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Closing Balance</Text>
                      <CountUpText value={report.fastag.closingBalance} formatter={formatINR} style={[styles.flowValue, { color: colors.textPrimary }]} />
                    </View>
                  </View>

                  <View style={styles.fastagUsersRow}>
                    {[ayanSummary, souravSummary].map((summary) => (
                      <View
                        key={summary.id}
                        style={[
                          styles.fastagUserCard,
                          {
                            borderColor: colors.border,
                            backgroundColor: secondarySurfaceColor,
                          },
                        ]}
                      >
                        <Text style={[styles.fastagUserName, { color: colors.textPrimary }]}>{summary.name}</Text>
                        <View style={styles.labelRow}>
                          <MaterialIcons name="account-balance-wallet" size={13} color={colors.textSecondary} />
                          <Text style={[styles.fastagLine, { color: colors.textSecondary }]}>
                            {formatINR(summary.fastagRechargeAmount)}
                          </Text>
                        </View>
                        <View style={styles.labelRow}>
                          <MaterialIcons name="toll" size={13} color={colors.textSecondary} />
                          <Text style={[styles.fastagLine, { color: colors.textSecondary }]}>
                            {formatINR(summary.fastagUsedAmount)}
                          </Text>
                        </View>
                        <Text style={[styles.fastagBalanceText, { color: colors.textPrimary }]}>
                          Net: {formatINR(summary.fastagNetBalance)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </SectionCard>
              </MotionCard>

              {report.trafficFine.totalAmount > 0 ? (
                <MotionCard delay={520} style={styles.gridSpanFull}>
                  <SectionCard
                    style={[
                      styles.glassCard,
                      {
                        backgroundColor: surfaceColor,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sectionHeader}>
                      <View style={styles.titleRow}>
                        <MaterialIcons name="gavel" size={16} color={colors.textPrimary} />
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Traffic Fine</Text>
                      </View>

                      <View
                        style={[
                          styles.inlineStatPill,
                          {
                            borderColor: colors.border,
                            backgroundColor: secondarySurfaceColor,
                          },
                        ]}
                      >
                        <MaterialIcons name="receipt-long" size={12} color={colors.textSecondary} />
                        <Text style={[styles.inlineStatText, { color: colors.textPrimary }]}>
                          {report.trafficFine.totalCount} {report.trafficFine.totalCount === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.doubleMetricRow}>
                      <MetricPair
                        label="Ayan"
                        value={report.trafficFine.byUser.ayan ?? 0}
                        formatter={formatINR}
                        backgroundColor={secondarySurfaceColor}
                        textPrimary={colors.textPrimary}
                        textSecondary={colors.textSecondary}
                        icon="person-outline"
                      />
                      <MetricPair
                        label="Sourav"
                        value={report.trafficFine.byUser.sourav ?? 0}
                        formatter={formatINR}
                        backgroundColor={secondarySurfaceColor}
                        textPrimary={colors.textPrimary}
                        textSecondary={colors.textSecondary}
                        icon="person-outline"
                      />
                    </View>

                    <View
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
                          <MaterialIcons name="warning-amber" size={14} color={colors.textSecondary} />
                          <Text style={[styles.otherSectionTitle, { color: colors.textPrimary }]}>Entries</Text>
                        </View>
                        <CountUpText
                          value={report.trafficFine.totalAmount}
                          formatter={formatINR}
                          style={[styles.otherSectionValue, { color: colors.textPrimary }]}
                        />
                      </View>

                      <ExpenseItemRows
                        items={report.trafficFine.items}
                        borderColor={colors.border}
                        textPrimary={colors.textPrimary}
                        textSecondary={colors.textSecondary}
                      />
                    </View>
                  </SectionCard>
                </MotionCard>
              ) : null}
            </View>
          ) : (
            <View style={styles.dashboardGrid}>
              <MotionCard delay={280} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="grid-view" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
                    </View>
                  </View>

                  <View style={styles.doubleMetricRow}>
                    <MetricPair
                      label="Ayan Paid"
                      value={ayanSummary.totalPaidAmount}
                      formatter={formatINR}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="payments"
                    />
                    <MetricPair
                      label="Sourav Paid"
                      value={souravSummary.totalPaidAmount}
                      formatter={formatINR}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="payments"
                    />
                    <MetricPair
                      label="Ayan Net"
                      value={ayanSummary.netBalance}
                      formatter={formatINR}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="compare-arrows"
                    />
                    <MetricPair
                      label="Sourav Net"
                      value={souravSummary.netBalance}
                      formatter={formatINR}
                      backgroundColor={secondarySurfaceColor}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      icon="compare-arrows"
                    />
                  </View>
                </SectionCard>
              </MotionCard>

              <MotionCard delay={340} style={styles.gridSpanFull}>
                <SectionCard
                  style={[
                    styles.glassCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons name="receipt-long" size={16} color={colors.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Items</Text>
                    </View>
                  </View>

                  {report.others.sections.length === 0 ? (
                    <View style={styles.emptyBlock}>
                      <MaterialIcons name="receipt-long" size={20} color={colors.textSecondary} />
                      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No other expenses to show</Text>
                    </View>
                  ) : (
                    <View style={styles.expenseSectionStack}>
                      {report.others.sections.map((section) => (
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
                </SectionCard>
              </MotionCard>
            </View>
          )}
        </Animated.View>

        {isDatePickerVisible && activeDateTarget ? (
          <View
            style={[
              styles.datePickerCard,
              {
                borderColor: colors.border,
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>
              Select {activeDateTarget === 'from' ? 'start date' : 'end date'}
            </Text>
            <DateTimePicker
              mode="date"
              value={activeDateTarget === 'from' ? fromDate : toDate}
              display="spinner"
              accentColor={colors.textPrimary}
              onChange={handleDatePickerChange}
            />
            <Pressable onPress={() => setIsDatePickerVisible(false)} style={[styles.datePickerDone, { borderColor: colors.border }]}>
              <Text style={[styles.datePickerDoneText, { color: colors.textPrimary }]}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="fade" transparent visible={isSettlementModalVisible} onRequestClose={() => setIsSettlementModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                borderColor: colors.border,
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Settlement confirmation</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              {canConfirmSettlement
                ? 'Have you settled the amount between yourselves?'
                : report.isSettled
                  ? 'This month is already marked as settled and locked.'
                  : 'Select a completed month first if you want to confirm settlement and lock editing.'}
            </Text>

            <View style={styles.modalActions}>
              {canConfirmSettlement ? (
                <Pressable onPress={handleConfirmSettlement} style={[styles.modalPrimaryButton, { backgroundColor: colors.textPrimary }]}>
                  <Text style={[styles.modalPrimaryText, { color: colors.invertedText }]}>Confirm</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => setIsSettlementModalVisible(false)}
                style={[
                  styles.modalSecondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: secondarySurfaceColor,
                  },
                ]}
              >
                <Text style={[styles.modalSecondaryText, { color: colors.textPrimary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
