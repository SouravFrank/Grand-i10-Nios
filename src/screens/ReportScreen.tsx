import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';

import { AppAlert } from '@/components/AppAlert';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { buildExpenseReport, ReportData } from '@/screens/reporting/reportCalculations';
import { DateTarget, ReportFilterMode, ReportTab } from '@/screens/reporting/reportUtils';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs } from '@/utils/day';

import { styles } from './ReportScreen.styles';
import { CalculationModal, SettlementModal } from './reporting/components/Modals';
import { MotionCard } from './reporting/components/MotionCard';
import { OthersItemsSection, OthersOverviewSection } from './reporting/components/OthersTab';
import { ReportHeader } from './reporting/components/ReportHeader';
import { SummaryDashboard } from './reporting/components/SummaryDashboard';
import { TabNavigator } from './reporting/components/TabNavigator';
import {
    FastagSummarySection,
    FuelMetricsSection,
    FuelSummarySection,
    MileageSection,
    ParkingSection,
    TrafficFineSection,
    TripSummarySection,
} from './reporting/components/TripTab';

type Props = NativeStackScreenProps<AppStackParamList, 'Report'>;

export function ReportScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const entries = useAppStore((state) => state.entries);
  const currentUser = useAppStore((state) => state.currentUser);
  const reportMileageByMonth = useAppStore((state) => state.reportMileageByMonth);
  const settledReportMonths = useAppStore((state) => state.settledReportMonths);
  const setReportMileage = useAppStore((state) => state.setReportMileage);
  const markReportSettled = useAppStore((state) => state.markReportSettled);
  const unmarkReportSettled = useAppStore((state) => state.unmarkReportSettled);

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
  const [isMileageEditorVisible, setIsMileageEditorVisible] = useState(false);
  const [isSettlementModalVisible, setIsSettlementModalVisible] = useState(false);
  const [isCalculationModalVisible, setIsCalculationModalVisible] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [showFuelInfo, setShowFuelInfo] = useState(false);

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

  const report: ReportData | null = useMemo(
    () =>
      buildExpenseReport({
        entries,
        currentUserId: currentUser?.id,
        mileageByMonth: reportMileageByMonth,
        settledMonths: settledReportMonths,
        range: activeRange,
      }),
    [activeRange, currentUser?.id, entries, reportMileageByMonth, settledReportMonths]
  );

  useEffect(() => {
    if (report && report?.mileageEditorValue !== undefined) {
      setMileageDraft(report.mileageEditorValue.toFixed(1));
    }
  }, [report?.mileageEditorValue, report?.mileageEditorMonthKey]);

  useEffect(() => {
    setIsMileageEditorVisible(false);
  }, [filterMode, report?.mileageEditorMonthKey]);

  const tabAnim = useRef(new Animated.Value(1)).current;
  const statusToneAnim = useRef(new Animated.Value(report?.settlement?.toneIndex ?? 0)).current;
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
    if (report?.settlement?.toneIndex !== undefined) {
      Animated.timing(statusToneAnim, {
        toValue: report.settlement.toneIndex,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [report?.settlement?.toneIndex, statusToneAnim]);

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

  const ayanSummary = report?.usersById?.ayan;
  const souravSummary = report?.usersById?.sourav;
  const canConfirmSettlement =
    filterMode === 'month' &&
    Boolean(activeRange.monthKey) &&
    activeRange.isCompleteMonth &&
    !report?.isSettled;

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
    if (!report?.mileageEditorMonthKey) return;

    const parsedValue = Number(mileageDraft);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    setReportMileage(report.mileageEditorMonthKey, parsedValue);
    setIsMileageEditorVisible(false);
    void runSyncCycle();
  };

  const handleConfirmSettlement = () => {
    if (!activeRange.monthKey || !canConfirmSettlement) {
      setIsSettlementModalVisible(false);
      return;
    }

    markReportSettled(activeRange.monthKey);
    setIsSettlementModalVisible(false);
    void runSyncCycle();

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

  const handleUnmarkSettlement = () => {
    if (!activeRange.monthKey || !report?.isSettled) {
      setIsSettlementModalVisible(false);
      return;
    }

    unmarkReportSettled(activeRange.monthKey);
    setIsSettlementModalVisible(false);
    void runSyncCycle();
  };

  const handleExportCsv = async () => {
    if (isExportingCsv) return;

    setIsExportingCsv(true);
    try {
      const targetDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!targetDirectory) {
        AppAlert.alert('CSV export unavailable', 'No writable export directory is available on this device.');
        return;
      }

      const fileUri = `${targetDirectory}${report?.csv?.fileName || 'report.csv'}`;
      await FileSystem.writeAsStringAsync(fileUri, report?.csv?.content || '', {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        AppAlert.alert('CSV ready', fileUri);
      }
    } catch (error) {
      AppAlert.alert('Could not export CSV', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleTabChange = (tab: ReportTab) => {
    if (activeTab !== tab) {
      setTabDirection(tab === 'trip' ? -1 : 1);
      setActiveTab(tab);
    }
  };

  if (!report) {
    return (
      <ScreenContainer>
        <View style={styles.contentContainer}>
          <Text style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 50 }}>
            Loading report...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const currentMonthSummary = report.audit.monthlySummaries.find(
    (month) => month.monthKey === activeRange.monthKey
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Header with Filters */}
        <MotionCard delay={20}>
          <ReportHeader
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
            fromDate={fromDate}
            toDate={toDate}
            onOpenDatePicker={openDatePicker}
            onOpenCalculation={() => setIsCalculationModalVisible(true)}
            onExportCsv={handleExportCsv}
            isExportingCsv={isExportingCsv}
            monthOptions={monthOptions}
            currentMonthKey={currentMonthKey}
            navigation={navigation}
          />
        </MotionCard>

        {/* Summary Dashboard */}
        <MotionCard delay={80}>
          <SummaryDashboard
            report={report}
            ayanSummary={ayanSummary}
            souravSummary={souravSummary}
            canConfirmSettlement={canConfirmSettlement}
            onOpenSettlement={() => setIsSettlementModalVisible(true)}
            statusScaleAnim={statusScaleAnim}
            statusToneAnim={statusToneAnim}
            statusBackgroundColor={statusBackgroundColor}
            statusBorderColor={statusBorderColor}
            statusTextColor={statusTextColor}
            surfaceColor={surfaceColor}
            secondarySurfaceColor={secondarySurfaceColor}
          />
        </MotionCard>

        {/* Tab Navigator */}
        <MotionCard delay={140}>
          <TabNavigator activeTab={activeTab} onTabChange={handleTabChange} surfaceColor={surfaceColor} />
        </MotionCard>

        {/* Tab Content */}
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
              {/* Mileage Section */}
              <MotionCard delay={180} style={styles.gridSpanFull}>
                <MileageSection
                  report={report}
                  mileageDraft={mileageDraft}
                  setMileageDraft={setMileageDraft}
                  isMileageEditorVisible={isMileageEditorVisible}
                  setIsMileageEditorVisible={setIsMileageEditorVisible}
                  showFuelInfo={showFuelInfo}
                  setShowFuelInfo={setShowFuelInfo}
                  onSaveMileage={handleSaveMileage}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Trip Summary */}
              <MotionCard delay={200} style={styles.gridSpanFull}>
                <TripSummarySection
                  monthlySummaries={report.audit.monthlySummaries}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Fuel Metrics */}
              <MotionCard delay={220} style={styles.gridSpanFull}>
                <FuelMetricsSection
                  monthlySummaries={report.audit.monthlySummaries}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Fuel Summary */}
              <MotionCard delay={240} style={styles.gridSpanFull}>
                <FuelSummarySection
                  fuel={report.fuel}
                  ayanSummary={ayanSummary!}
                  souravSummary={souravSummary!}
                  costPerKm={currentMonthSummary?.costPerKm || 0}
                  totalKm={currentMonthSummary?.totalKm || 0}
                  totalFuelUsed={currentMonthSummary?.totalFuelUsed || 0}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Fastag Summary */}
              <MotionCard delay={260} style={styles.gridSpanFull}>
                <FastagSummarySection
                  fastag={report.fastag}
                  ayanSummary={ayanSummary!}
                  souravSummary={souravSummary!}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Traffic Fine */}
              <MotionCard delay={280} style={styles.gridSpanFull}>
                <TrafficFineSection
                  trafficFine={report.trafficFine}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Parking */}
              <MotionCard delay={300} style={styles.gridSpanFull}>
                <ParkingSection
                  parking={report.parking}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>
            </View>
          ) : (
            <View style={styles.dashboardGrid}>
              {/* Others Overview */}
              <MotionCard delay={180} style={styles.gridSpanFull}>
                <OthersOverviewSection
                  ayanSummary={ayanSummary}
                  souravSummary={souravSummary}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>

              {/* Others Items */}
              <MotionCard delay={200} style={styles.gridSpanFull}>
                <OthersItemsSection
                  others={report.others}
                  surfaceColor={surfaceColor}
                  secondarySurfaceColor={secondarySurfaceColor}
                />
              </MotionCard>
            </View>
          )}
        </Animated.View>

        {/* Date Picker */}
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
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <CalculationModal
        isVisible={isCalculationModalVisible}
        onClose={() => setIsCalculationModalVisible(false)}
        onExportCsv={handleExportCsv}
        isExportingCsv={isExportingCsv}
        rangeLabel={report.rangeLabel}
        audit={report.audit}
        surfaceColor={surfaceColor}
        secondarySurfaceColor={secondarySurfaceColor}
      />

      <SettlementModal
        isVisible={isSettlementModalVisible}
        onClose={() => setIsSettlementModalVisible(false)}
        onConfirm={handleConfirmSettlement}
        onUnmark={handleUnmarkSettlement}
        canConfirmSettlement={canConfirmSettlement}
        isSettled={report.isSettled}
        surfaceColor={surfaceColor}
        secondarySurfaceColor={secondarySurfaceColor}
      />
    </ScreenContainer>
  );
}
