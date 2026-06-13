import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAlertProvider } from '@/components/AppAlert';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT, INDIA_MONTH_FORMAT } from '@/utils/day';

export type CategoryFilter = 'all' | 'odometer' | 'fuel' | 'expense_fasttag' | 'expense_car_maintenance' | 'expense_parking' | 'expense_traffic_violation' | 'expense_others' | 'spec_update';
export type DatePreset = 'all' | 'last7' | 'last30' | 'thisMonth' | 'custom';
export type DateTarget = 'from' | 'to';
type ViewContextOption = { id: string; name: string };
type MonthOption = string;

interface SmartFilterSheetProps {
  isOpen: boolean; isRendered: boolean; onClose: () => void;
  category: CategoryFilter; onCategoryChange: (category: CategoryFilter) => void;
  selectedUser: string; onUserChange: (userId: string) => void;
  selectedMonth: string; onMonthChange: (month: string) => void;
  datePreset: DatePreset; onDatePresetChange: (preset: DatePreset) => void;
  fromDate: Date | null; toDate: Date | null; onDateChange: (target: DateTarget, date: Date | null) => void;
  viewContextOptions: ViewContextOption[]; monthOptions: MonthOption[]; matchedCount: number; activeFilterPills: string[];
  isDatePickerVisible: boolean; onDatePickerVisibilityChange: (visible: boolean) => void;
  activeDateTarget: DateTarget | null; onActiveDateTargetChange: (target: DateTarget | null) => void;
  onReset: () => void; minDate?: Date; maxDate?: Date;
}

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All Categories', odometer: 'Odometer', fuel: 'Fuel', expense_fasttag: 'Fastag', expense_car_maintenance: 'Maintenance', expense_parking: 'Parking', expense_traffic_violation: 'Traffic Fine', expense_others: 'Others', spec_update: 'Specs Update',
};

const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All time' }, { id: 'last7', label: 'Last 7 days' }, { id: 'last30', label: 'Last 30 days' }, { id: 'thisMonth', label: 'This month' },
];

export function SmartFilterSheet({
  isOpen, isRendered, onClose, category, onCategoryChange, selectedUser, onUserChange,
  selectedMonth, onMonthChange, datePreset, onDatePresetChange, fromDate, toDate,
  onDateChange, viewContextOptions, monthOptions, matchedCount, activeFilterPills,
  isDatePickerVisible, onDatePickerVisibilityChange, activeDateTarget, onActiveDateTargetChange, onReset, minDate, maxDate,
}: SmartFilterSheetProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) translateY.setValue(gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.5) handleClose();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    })
  ).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen, translateY, overlayOpacity]);

  const openDatePicker = (target: DateTarget) => {
    onActiveDateTargetChange(target); onDatePickerVisibilityChange(true); onDatePresetChange('custom');
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      if (Platform.OS === 'android') onDatePickerVisibilityChange(false);
      return;
    }
    if (!selectedDate || !activeDateTarget) return;
    onDateChange(activeDateTarget, selectedDate);
    onDatePresetChange('custom');
    if (Platform.OS === 'android') onDatePickerVisibilityChange(false);
  };

  const pickerDate = (() => {
    if (activeDateTarget === 'from') return fromDate ?? minDate ?? new Date();
    if (activeDateTarget === 'to') return toDate ?? fromDate ?? new Date();
    return new Date();
  })();

  const categoryOptions: CategoryFilter[] = ['all', 'odometer', 'fuel', 'expense_fasttag', 'expense_car_maintenance', 'expense_parking', 'expense_traffic_violation', 'expense_others', 'spec_update'];

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible={isRendered} onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      
      <View style={styles.sheetAnchor}>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
          
          {/* Header with drag handle */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.filterHeadRow}>
              <View>
                <Text style={[styles.filterHeadTitle, { color: colors.textPrimary }]}>Smart Filters</Text>
                <Text style={[styles.filterHeadMeta, { color: colors.primary }]}>{matchedCount} Entries Matched</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={onReset} hitSlop={12} style={[styles.clearBtn, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>Clear All</Text>
                </Pressable>
                <Pressable onPress={handleClose} hitSlop={12} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Active filter pills */}
          {activeFilterPills.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePillsRow}>
              {activeFilterPills.map((pill) => (
                <View key={pill} style={[styles.activePill, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.activePillText, { color: colors.primary }]}>{pill}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.noFilterText, { color: colors.textSecondary }]}>No active filters applied</Text>
          )}

          {/* Filter sections */}
          <ScrollView contentContainerStyle={styles.filterInner} showsVerticalScrollIndicator={false}>
            
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Entry Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {categoryOptions.map((filter) => {
                const active = filter === category;
                return (
                  <Pressable key={filter} onPress={() => onCategoryChange(filter)} style={[styles.filterChip, { backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary }]}>
                    {active && <MaterialIcons name="check" size={14} color={colors.background} />}
                    <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textPrimary }]}>{CATEGORY_LABELS[filter]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Visibility Context</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {viewContextOptions.map((ctx) => {
                const active = selectedUser === ctx.id;
                return (
                  <Pressable key={ctx.id} onPress={() => onUserChange(ctx.id)} style={[styles.filterChip, { backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary }]}>
                    {active && <MaterialIcons name="check" size={14} color={colors.background} />}
                    <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textPrimary }]}>{ctx.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {monthOptions.map((month) => {
                const active = month === selectedMonth;
                const label = month === 'all' ? 'All months' : dayjs(`${month}-01`).format(INDIA_MONTH_FORMAT);
                return (
                  <Pressable key={month} onPress={() => onMonthChange(month)} style={[styles.filterChip, { backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary }]}>
                    {active && <MaterialIcons name="check" size={14} color={colors.background} />}
                    <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date Range</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {DATE_PRESET_OPTIONS.map((option) => {
                const active = datePreset === option.id;
                return (
                  <Pressable key={option.id} onPress={() => onDatePresetChange(option.id)} style={[styles.filterChip, { backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary }]}>
                    {active && <MaterialIcons name="check" size={14} color={colors.background} />}
                    <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textPrimary }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Custom Date Pickers */}
            <View style={styles.datePickerRow}>
              {(['from', 'to'] as DateTarget[]).map((target) => {
                const selected = target === 'from' ? fromDate : toDate;
                return (
                  <Pressable key={target} onPress={() => openDatePicker(target)} style={[styles.datePickCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.datePickLabel, { color: colors.textSecondary }]}>{target === 'from' ? 'FROM' : 'TO'}</Text>
                    <View style={styles.datePickValueRow}>
                      <MaterialIcons name="event" size={16} color={colors.primary} />
                      <Text style={[styles.datePickValue, { color: colors.textPrimary }]}>{selected ? dayjs(selected).format(INDIA_DATE_FORMAT) : 'Select date'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Native Date Picker Dropdown */}
            {isDatePickerVisible && activeDateTarget ? (
              <View style={[styles.nativePickerWrap, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.nativePickerTop}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Choose {activeDateTarget === 'from' ? 'From Date' : 'To Date'}</Text>
                  {Platform.OS === 'ios' && (
                    <Pressable onPress={() => onDatePickerVisibilityChange(false)}>
                      <Text style={[styles.filterChipText, { color: colors.primary }]}>Done</Text>
                    </Pressable>
                  )}
                </View>
                <DateTimePicker
                  mode="date" value={pickerDate} accentColor={Platform.OS === 'ios' ? colors.textPrimary : undefined} display={Platform.OS === 'ios' ? 'spinner' : undefined}
                  minimumDate={activeDateTarget === 'from' ? minDate : fromDate ?? minDate}
                  maximumDate={activeDateTarget === 'from' ? (toDate && dayjs(toDate).isBefore(dayjs(), 'day') ? toDate : new Date()) : maxDate}
                  onChange={handleDatePickerChange}
                  positiveButton={Platform.OS === 'android' ? { label: 'Apply', textColor: colors.textPrimary } : undefined}
                  negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: colors.textSecondary } : undefined}
                  textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined} themeVariant={Platform.OS === 'ios' ? 'dark' : undefined}
                />
              </View>
            ) : null}
            
          </ScrollView>
        </Animated.View>
      </View>
      {isRendered ? <AppAlertProvider priority={100} /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetAnchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
    maxHeight: '90%',
  },
  handleWrap: { alignItems: 'center', marginBottom: 12 },
  handle: { width: 48, height: 5, borderRadius: 3, opacity: 0.5 },
  filterHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filterHeadTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  filterHeadMeta: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' },
  clearBtn: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  clearBtnText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  activePillsRow: { gap: 8, paddingRight: 10, marginVertical: 12 },
  activePill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  activePillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  noFilterText: { fontSize: 12, fontWeight: '600', fontStyle: 'italic', marginVertical: 12 },
  filterInner: { gap: 16, paddingTop: 8, paddingBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -4 },
  filterRow: { gap: 8, paddingRight: 10 },
  filterChip: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterChipText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  datePickerRow: { flexDirection: 'row', gap: 12 },
  datePickCard: { flex: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  datePickLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  datePickValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePickValue: { fontSize: 14, fontWeight: '800' },
  nativePickerWrap: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  nativePickerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
});
