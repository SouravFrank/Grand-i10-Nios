import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ExpenseCategory } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, mergeDateWithExistingTime } from '@/utils/day';
import { getEntryOwnerId, getEntryOwnerName } from '@/utils/entryOwnership';

type Props = NativeStackScreenProps<AppStackParamList, 'ExpenseEntryModal'>;

const quickExpenseCategories = [
  { title: 'FASTag Recharge', icon: 'account-balance-wallet' },
  { title: 'FASTag Toll Paid', icon: 'toll' },
  { title: 'Traffic Violation', icon: 'gavel' },
  { title: 'Parking Fees', icon: 'local-parking' },
  { title: 'Car Maintenance', icon: 'build' },
] as const;

const maintenanceExpenseTitles = [
  { title: 'Engine Oil Change', icon: 'opacity' },
  { title: 'Coolant Refill', icon: 'water-drop' },
  { title: 'PUCC Renewal', icon: 'verified-user' },
  { title: 'Insurance Renewal', icon: 'policy' },
] as const;

const categoryMeta: Record<ExpenseCategory, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  shield_safety: { label: 'Shield & Safety', icon: 'verified-user' },
  care_comfort: { label: 'Care & Comfort', icon: 'weekend' },
  maintenance_lab: { label: 'Maintenance Lab', icon: 'build-circle' },
  utility_addon: { label: 'Utility Add-ons', icon: 'bolt' },
  purchase: { label: 'Purchase', icon: 'shopping-cart' },
  traffic_violation_fine: { label: 'Traffic Violation Fine', icon: 'gavel' },
  fasttag_toll_paid: { label: 'FASTag Toll Paid', icon: 'toll' },
  parking: { label: 'Parking', icon: 'local-parking' },
  other: { label: 'Other', icon: 'apps' },
};

const keywordCategoryRules: Array<{ keywords: string[]; category: ExpenseCategory }> = [
  { keywords: ['traffic', 'violation', 'fine', 'challan'], category: 'traffic_violation_fine' },
  { keywords: ['fastag toll', 'fast tag toll', 'fasttag toll', 'toll paid'], category: 'fasttag_toll_paid' },
  { keywords: ['parking', 'park', 'car park', 'carpark'], category: 'parking' },
  { keywords: ['purchase', 'downpayment', 'down payment', 'booking', 'cars24', 'inspection', 'delivery', 'wages'], category: 'purchase' },
  { keywords: ['car maintenance', 'maintenance', 'service', 'engine oil', 'oil', 'coolant', 'coolent', 'pucc renewal', 'insurance renewal', 'insurence renewal', 'filter', 'alignment', 'balancing', 'repair'], category: 'maintenance_lab' },
  { keywords: ['insurance', 'pucc', 'cover', 'rat', 'protector', 'safety', 'helmet'], category: 'shield_safety' },
  { keywords: ['fastag', 'fast tag', 'fasttag', 'tax', 'fitness', 'recharge', 'tag'], category: 'utility_addon' },
  { keywords: ['wash', 'cleaning', 'clean', 'detailing', 'polish', 'wax', 'vacuum', 'shampoo'], category: 'care_comfort' },
  { keywords: ['other'], category: 'other' },
];

function inferExpenseCategory(title: string): ExpenseCategory {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return 'other';
  const matchedRule = keywordCategoryRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return matchedRule?.category ?? 'other';
}

const expenseSchema = z.object({
  odometer: z.string().trim().min(1, 'Odometer is required.').refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  expenseTitle: z.string().trim().min(2, 'Expense title is required.').max(48, 'Keep title under 48 characters.'),
  cost: z.string().trim().min(1, 'Cost is required.').refine((value) => Number(value) > 0, 'Cost must be positive.'),
  paidByUserId: z.string().trim().optional(),
}).superRefine((data, context) => {
  const category = inferExpenseCategory(data.expenseTitle);
  if (category !== 'fasttag_toll_paid') {
    if (!data.paidByUserId || data.paidByUserId.trim() === '') {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Select who paid.', path: ['paidByUserId'] });
    } else if (!ALLOWED_USERS.some((user) => user.id === data.paidByUserId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a valid user.', path: ['paidByUserId'] });
    }
  }
});

type ExpenseForm = z.infer<typeof expenseSchema>;
const SHAREABLE_CATEGORIES: ExpenseCategory[] = ['traffic_violation_fine', 'fasttag_toll_paid', 'parking'];

export function ExpenseEntryScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const updateEntryOfflineFirst = useAppStore((state) => state.updateEntryOfflineFirst);
  const deleteEntry = useAppStore((state) => state.deleteEntry);
  const entries = useAppStore((state) => state.entries);
  
  // Theme Colors & Liquid Orbs
  const expenseColor = '#10B981'; // Modern Emerald Green for Expenses
  const liquidColor1 = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.25)';
  const liquidColor2 = isDark ? `${colors.primary}25` : `${colors.primary}35`;

  const editingEntry = route.params?.entryId ? entries.find((entry) => entry.id === route.params?.entryId && entry.type === 'expense') : undefined;
  const isEditing = Boolean(editingEntry);

  const [sharedExpense, setSharedExpense] = useState(editingEntry?.sharedTrip ?? false);
  const [entryDate, setEntryDate] = useState(() => new Date(editingEntry?.createdAt ?? Date.now()));
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [previousCategory, setPreviousCategory] = useState<string | undefined>(editingEntry?.expenseCategory);
  const [showMaintenanceOptions, setShowMaintenanceOptions] = useState(() => {
    const title = editingEntry?.expenseTitle?.trim().toLowerCase() ?? '';
    return title === 'car maintenance' || maintenanceExpenseTitles.some((item) => item.title.toLowerCase() === title);
  });

  // Animations
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const formSlide = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const orb1Scale = useRef(new Animated.Value(1)).current;
  const orb1TranslateY = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(1)).current;
  const orb2TranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerSlide, { toValue: 0, tension: 40, friction: 6, useNativeDriver: true }),
      Animated.spring(formSlide, { toValue: 0, tension: 30, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Scale, { toValue: 1.25, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb1Scale, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orb1TranslateY, { toValue: 40, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb1TranslateY, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb2Scale, { toValue: 1.35, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb2Scale, { toValue: 1, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orb2TranslateX, { toValue: -50, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb2TranslateX, { toValue: 0, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();
  }, [headerSlide, formSlide, opacity, orb1Scale, orb1TranslateY, orb2Scale, orb2TranslateX]);

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      odometer: String(editingEntry?.odometer ?? lastOdometer),
      expenseTitle: editingEntry?.expenseTitle ?? '',
      cost: editingEntry?.cost ? String(editingEntry.cost) : '',
      paidByUserId: editingEntry?.userId ?? currentUser?.id ?? '',
    },
  });

  const selectedExpenseTitle = watch('expenseTitle');
  const selectedPaidByUserId = watch('paidByUserId');
  const inferredCategory = inferExpenseCategory(selectedExpenseTitle);
  const inferredCategoryMeta = categoryMeta[inferredCategory];
  const showSharedToggle = SHAREABLE_CATEGORIES.includes(inferredCategory);
  const showPaidBySection = inferredCategory !== 'fasttag_toll_paid';
  const normalizedSelectedExpenseTitle = selectedExpenseTitle.trim().toLowerCase();
  const selectedMaintenanceSubcategory = maintenanceExpenseTitles.some((item) => item.title.toLowerCase() === normalizedSelectedExpenseTitle);
  const showMaintenanceSubcategories = showMaintenanceOptions || normalizedSelectedExpenseTitle === 'car maintenance' || selectedMaintenanceSubcategory;

  useEffect(() => {
    if (isEditing && editingEntry && previousCategory !== inferredCategory) {
      const isCurrentCategoryShareable = SHAREABLE_CATEGORIES.includes(inferredCategory);
      const originalCategory = editingEntry.expenseCategory;
      const wasOriginallyShareable = originalCategory ? SHAREABLE_CATEGORIES.includes(originalCategory) : false;
      
      if (!isCurrentCategoryShareable) setSharedExpense(false);
      else if (wasOriginallyShareable) setSharedExpense(editingEntry.sharedTrip ?? false);
      
      setPreviousCategory(inferredCategory);
    }
  }, [inferredCategory, isEditing, editingEntry, previousCategory]);

  const handleQuickCategoryPress = (title: (typeof quickExpenseCategories)[number]['title']) => {
    setShowMaintenanceOptions(title === 'Car Maintenance');
    setValue('expenseTitle', title, { shouldValidate: true, shouldDirty: true });
  };

  const handleMaintenanceSubcategoryPress = (title: (typeof maintenanceExpenseTitles)[number]['title']) => {
    setShowMaintenanceOptions(true);
    setValue('expenseTitle', title, { shouldValidate: true, shouldDirty: true });
  };

  useEffect(() => {
    if (!isEditing && currentUser && !selectedPaidByUserId && showPaidBySection) {
      setValue('paidByUserId', currentUser.id, { shouldDirty: false, shouldValidate: true });
    }
  }, [currentUser, isEditing, selectedPaidByUserId, setValue, showPaidBySection]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setEntryDate(selectedDate);
    setIsDatePickerVisible(false);
  };

  const onSubmit = handleSubmit(async ({ odometer, expenseTitle, cost, paidByUserId }) => {
    if (!currentUser) return Alert.alert('Session expired', 'Please login again.');
    if (isEditing && !editingEntry) return Alert.alert('Entry not found', 'This expense entry is no longer available.');
    if (editingEntry && getEntryOwnerId(editingEntry) !== currentUser.id) return Alert.alert('Edit not allowed', 'You can only edit your own expense entries.');

    const category = inferExpenseCategory(expenseTitle);
    const shouldShare = SHAREABLE_CATEGORIES.includes(category) && sharedExpense;
    let entryUser = currentUser;
    
    if (category !== 'fasttag_toll_paid') {
      const selectedPayer = ALLOWED_USERS.find((user) => user.id === paidByUserId);
      if (!selectedPayer) return Alert.alert('Invalid payer', 'Select who paid for this expense.');
      entryUser = selectedPayer;
    }

    try {
      if (editingEntry) {
        await updateEntryOfflineFirst(editingEntry.id, {
          userId: entryUser.id, userName: entryUser.name, odometer: Number(odometer),
          createdAt: mergeDateWithExistingTime(entryDate, editingEntry.createdAt),
          expenseCategory: category, expenseTitle: expenseTitle.trim(), cost: Number(cost),
          sharedTrip: shouldShare, sharedTripMarkedById: getEntryOwnerId(editingEntry), sharedTripMarkedByName: getEntryOwnerName(editingEntry),
        });
      } else {
        await addEntryOfflineFirst({
          type: 'expense', userId: entryUser.id, userName: entryUser.name, odometer: Number(odometer),
          expenseCategory: category, expenseTitle: expenseTitle.trim(), cost: Number(cost),
          sharedTrip: shouldShare, sharedTripMarkedById: currentUser.id, sharedTripMarkedByName: currentUser.name,
        });
      }
      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(isEditing ? 'Could not update expense' : 'Could not save expense', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDelete = () => {
    if (!editingEntry) return;
    if (!currentUser || getEntryOwnerId(editingEntry) !== currentUser.id) return Alert.alert('Delete not allowed', 'You can only delete your own expense entries.');
    Alert.alert('Delete Entry', 'Are you sure you want to delete this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEntry(editingEntry.id).then(() => { navigation.goBack(); void runSyncCycle(); }); } },
    ]);
  };

  return (
    <ScreenContainer>
      <KeyboardAwareScrollView style={styles.keyboardContainer} contentContainerStyle={styles.scrollContent} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} enableOnAndroid={true} enableAutomaticScroll={true} extraScrollHeight={120}>
        <View style={[styles.scrollContent, styles.container]}>
          
          {/* Dual Liquid Orbs */}
          <Animated.View pointerEvents="none" style={[styles.orb1, { backgroundColor: liquidColor1, transform: [{ scale: orb1Scale }, { translateY: orb1TranslateY }] }]} />
          <Animated.View pointerEvents="none" style={[styles.orb2, { backgroundColor: liquidColor2, transform: [{ scale: orb2Scale }, { translateX: orb2TranslateX }] }]} />

          <Animated.View style={[styles.headerCard, { backgroundColor: colors.card, opacity, transform: [{ translateY: headerSlide }] }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>EXPENSE ENTRY</Text>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
              </View>
              <View style={[styles.headerIcon, { backgroundColor: expenseColor }]}>
                <MaterialCommunityIcons name="receipt-text-outline" size={20} color="#fff" />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.formCard, { backgroundColor: colors.card, opacity, transform: [{ translateY: formSlide }] }]}>
            
            <View style={styles.quickWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Categories</Text>
              <View style={styles.quickGrid}>
                {quickExpenseCategories.map((item) => {
                  const active = item.title === 'Car Maintenance' ? showMaintenanceSubcategories || inferredCategory === 'maintenance_lab' : normalizedSelectedExpenseTitle === item.title.toLowerCase();
                  return (
                    <Pressable
                      key={item.title}
                      onPress={() => handleQuickCategoryPress(item.title)}
                      style={[styles.quickChip, { backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary }]}>
                      <MaterialIcons name={active ? 'check' : item.icon} size={14} color={active ? colors.invertedText : colors.textSecondary} />
                      <Text style={[styles.quickChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{item.title}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {showMaintenanceSubcategories && (
                <View style={[styles.maintenancePanel, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Maintenance Items</Text>
                  <View style={styles.quickGrid}>
                    {maintenanceExpenseTitles.map((item) => {
                      const active = normalizedSelectedExpenseTitle === item.title.toLowerCase();
                      return (
                        <Pressable
                          key={item.title}
                          onPress={() => handleMaintenanceSubcategoryPress(item.title)}
                          style={[styles.quickChip, { backgroundColor: active ? colors.textPrimary : colors.card }]}>
                          <MaterialIcons name={active ? 'check' : item.icon} size={14} color={active ? colors.invertedText : colors.textSecondary} />
                          <Text style={[styles.quickChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{item.title}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {showPaidBySection && (
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paid By</Text>
                <View style={styles.payerGrid}>
                  {ALLOWED_USERS.map((user) => {
                    const active = selectedPaidByUserId === user.id;
                    const isCurrentUser = currentUser?.id === user.id;
                    const userColor = user.name.toLowerCase() === 'ayan' ? '#3B82F6' : (user.name.toLowerCase() === 'sourav' ? '#8B5CF6' : colors.primary);

                    return (
                      <Pressable
                        key={user.id}
                        onPress={() => setValue('paidByUserId', user.id, { shouldValidate: true, shouldDirty: true })}
                        style={[styles.payerOption, { backgroundColor: active ? `${userColor}15` : colors.backgroundSecondary }]}>
                        <View style={styles.payerOptionHead}>
                          <Text style={[styles.payerName, { color: active ? userColor : colors.textPrimary }]}>{user.name}</Text>
                          <MaterialIcons name={active ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={active ? userColor : colors.textSecondary} />
                        </View>
                        <Text style={[styles.payerMeta, { color: active ? userColor : colors.textSecondary }]}>{isCurrentUser ? 'Logged in user' : 'Choose if they paid'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.paidByUserId && <Text style={styles.selectionError}>{errors.paidByUserId.message}</Text>}
              </View>
            )}

            {isEditing && (
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Entry Date</Text>
                <Pressable onPress={() => setIsDatePickerVisible(true)} style={[styles.dateButton, { backgroundColor: colors.backgroundSecondary }]}>
                  <MaterialIcons name="event" size={20} color={expenseColor} />
                  <View style={styles.dateCopy}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Recorded on</Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dayjs(entryDate).format(INDIA_DATE_FORMAT)}</Text>
                  </View>
                </Pressable>
                {isDatePickerVisible && <DateTimePicker value={entryDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={handleDatePickerChange} />}
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Expense Details</Text>
              <Controller control={control} name="expenseTitle" render={({ field: { onChange, value } }) => (
                <AppTextField label="Expense title" value={value} onChangeText={onChange} placeholder="Type your own expense title" autoCapitalize="sentences" error={errors.expenseTitle?.message} />
              )} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                <MaterialIcons name={inferredCategoryMeta.icon} size={14} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Detected Category: <Text style={{ color: colors.textPrimary }}>{inferredCategoryMeta.label}</Text>
                </Text>
              </View>

              <Controller control={control} name="cost" render={({ field: { onChange, value } }) => (
                <AppTextField label="Amount (₹)" value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 950" error={errors.cost?.message} />
              )} />
            </View>

            <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.odoHead}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Odometer Snapshot</Text>
                <Text style={[styles.odoHint, { color: colors.textSecondary }]}>{isEditing ? `Latest ${lastOdometer}` : `Previous ${lastOdometer}`}</Text>
              </View>
              <Controller control={control} name="odometer" render={({ field: { onChange, value } }) => (
                <OdometerDigitInput label="Current Odometer" value={value} onChangeText={onChange} error={errors.odometer?.message} />
              )} />
            </View>

            {showSharedToggle && (
              <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Expense</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    {inferredCategory === 'fasttag_toll_paid' ? 'Toll was paid on a shared trip' : inferredCategory === 'parking' ? 'Parking expense was shared' : 'Violation expense was shared'}
                  </Text>
                </View>
                <Switch value={sharedExpense} onValueChange={setSharedExpense} trackColor={{ false: colors.border, true: expenseColor }} thumbColor={sharedExpense ? '#fff' : colors.textSecondary} />
              </View>
            )}

            <View style={styles.actionRow}>
              {isEditing && (
                <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                  <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <PrimaryButton label={isEditing ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { gap: 16, padding: 16, paddingBottom: 32, position: 'relative' },
  
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -40, right: -60, zIndex: 0 },
  orb2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: 180, left: -40, zIndex: 0 },
  
  headerCard: { borderRadius: 24, padding: 16, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  headerEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  
  formCard: { borderRadius: 24, padding: 20, gap: 24, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  formSection: { gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  
  quickWrap: { gap: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickChip: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  
  maintenancePanel: { borderRadius: 20, padding: 16, gap: 12 },
  
  payerGrid: { flexDirection: 'row', gap: 12 },
  payerOption: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  payerOptionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  payerName: { fontSize: 16, fontWeight: '900' },
  payerMeta: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  selectionError: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  
  dateButton: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateCopy: { gap: 2 },
  dateLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  dateValue: { fontSize: 16, fontWeight: '800' },
  
  odoPanel: { borderRadius: 18, padding: 16, gap: 12 },
  odoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  odoHint: { fontSize: 12, fontWeight: '600' },
  
  switchRow: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchCopy: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 14, fontWeight: '800' },
  switchHint: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryAction: { flex: 1, height: 56, borderRadius: 16 },
  deleteBtn: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});