import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
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
  other: { label: 'Other', icon: 'apps' },
};

const keywordCategoryRules: Array<{ keywords: string[]; category: ExpenseCategory }> = [
  { keywords: ['traffic', 'violation', 'fine', 'challan'], category: 'traffic_violation_fine' },
  { keywords: ['fastag toll', 'fast tag toll', 'fasttag toll', 'toll paid'], category: 'fasttag_toll_paid' },
  { keywords: ['purchase', 'downpayment', 'down payment', 'booking', 'cars24', 'inspection', 'delivery', 'wages'], category: 'purchase' },
  { keywords: ['car maintenance', 'maintenance', 'service', 'engine oil', 'oil', 'coolant', 'coolent', 'pucc renewal', 'insurance renewal', 'insurence renewal', 'filter', 'alignment', 'balancing', 'repair'], category: 'maintenance_lab' },
  { keywords: ['insurance', 'pucc', 'cover', 'rat', 'protector', 'safety', 'helmet'], category: 'shield_safety' },
  { keywords: ['fastag', 'fast tag', 'fasttag', 'tax', 'fitness', 'recharge', 'tag'], category: 'utility_addon' },
  { keywords: ['parking', 'parking fee', 'parking fees'], category: 'other' },
  { keywords: ['seat', 'clean', 'wash', 'mat', 'perfume', 'comfort', 'vacuum'], category: 'care_comfort' },
];

function inferExpenseCategory(title: string): ExpenseCategory {
  const normalized = title.trim().toLowerCase();
  if (!normalized) {
    return 'other';
  }

  const matchedRule = keywordCategoryRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );
  return matchedRule?.category ?? 'other';
}

const expenseSchema = z.object({
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  expenseTitle: z.string().trim().min(2, 'Expense title is required.').max(48, 'Keep title under 48 characters.'),
  cost: z
    .string()
    .trim()
    .min(1, 'Cost is required.')
    .refine((value) => Number(value) > 0, 'Cost must be positive.'),
  paidByUserId: z
    .string()
    .trim()
    .optional(),
}).superRefine((data, context) => {
  const category = inferExpenseCategory(data.expenseTitle);
  if (category !== 'fasttag_toll_paid') {
    if (!data.paidByUserId || data.paidByUserId.trim() === '') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select who paid.',
        path: ['paidByUserId'],
      });
    } else if (!ALLOWED_USERS.some((user) => user.id === data.paidByUserId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a valid user.',
        path: ['paidByUserId'],
      });
    }
  }
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const SHAREABLE_CATEGORIES: ExpenseCategory[] = ['traffic_violation_fine', 'fasttag_toll_paid'];

export function ExpenseEntryScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const updateEntryOfflineFirst = useAppStore((state) => state.updateEntryOfflineFirst);
  const deleteEntry = useAppStore((state) => state.deleteEntry);
  const entries = useAppStore((state) => state.entries);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const orbTone = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
  const editingEntry = route.params?.entryId
    ? entries.find((entry) => entry.id === route.params?.entryId && entry.type === 'expense')
    : undefined;
  const isEditing = Boolean(editingEntry);

  const [sharedExpense, setSharedExpense] = useState(editingEntry?.sharedTrip ?? false);
  const [entryDate, setEntryDate] = useState(() => new Date(editingEntry?.createdAt ?? Date.now()));
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [showMaintenanceOptions, setShowMaintenanceOptions] = useState(() => {
    const title = editingEntry?.expenseTitle?.trim().toLowerCase() ?? '';
    return title === 'car maintenance' || maintenanceExpenseTitles.some((item) => item.title.toLowerCase() === title);
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
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
  const selectedMaintenanceSubcategory = maintenanceExpenseTitles.some(
    (item) => item.title.toLowerCase() === normalizedSelectedExpenseTitle,
  );
  const showMaintenanceSubcategories =
    showMaintenanceOptions ||
    normalizedSelectedExpenseTitle === 'car maintenance' ||
    selectedMaintenanceSubcategory;

  const handleQuickCategoryPress = (title: (typeof quickExpenseCategories)[number]['title']) => {
    const isMaintenance = title === 'Car Maintenance';
    setShowMaintenanceOptions(isMaintenance);
    setValue('expenseTitle', title, { shouldValidate: true, shouldDirty: true });
  };

  const handleMaintenanceSubcategoryPress = (title: (typeof maintenanceExpenseTitles)[number]['title']) => {
    setShowMaintenanceOptions(true);
    setValue('expenseTitle', title, { shouldValidate: true, shouldDirty: true });
  };

  useEffect(() => {
    if (!isEditing && currentUser && !selectedPaidByUserId && showPaidBySection) {
      setValue('paidByUserId', currentUser.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [currentUser, isEditing, selectedPaidByUserId, setValue, showPaidBySection]);

  useEffect(() => {
    if (editingEntry) {
      setEntryDate(new Date(editingEntry.createdAt));
    }
  }, [editingEntry]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
    setIsDatePickerVisible(false);
  };

  const onSubmit = handleSubmit(async ({ odometer, expenseTitle, cost, paidByUserId }) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    if (isEditing && !editingEntry) {
      Alert.alert('Entry not found', 'This expense entry is no longer available.');
      navigation.goBack();
      return;
    }
    if (editingEntry && getEntryOwnerId(editingEntry) !== currentUser.id) {
      Alert.alert('Edit not allowed', 'You can only edit your own expense entries.');
      return;
    }

    const parsedOdometer = Number(odometer);
    const parsedCost = Number(cost);

    const category = inferExpenseCategory(expenseTitle);
    const isShareable = SHAREABLE_CATEGORIES.includes(category);
    const shouldShare = isShareable && sharedExpense;
    
    // For FASTag toll, use currentUser as the entry user (no paid by selection)
    // For other expenses (including FASTag recharge), use selected payer
    let entryUser = currentUser;
    let selectedPayer = null;
    
    if (category !== 'fasttag_toll_paid') {
      selectedPayer = ALLOWED_USERS.find((user) => user.id === paidByUserId);
      if (!selectedPayer) {
        Alert.alert('Invalid payer', 'Select who paid for this expense.');
        return;
      }
      entryUser = selectedPayer;
    }

    try {
      if (editingEntry) {
        const expenseOwnerId = getEntryOwnerId(editingEntry);
        const expenseOwnerName = getEntryOwnerName(editingEntry);
        await updateEntryOfflineFirst(editingEntry.id, {
          userId: entryUser.id,
          userName: entryUser.name,
          odometer: parsedOdometer,
          createdAt: mergeDateWithExistingTime(entryDate, editingEntry.createdAt),
          expenseCategory: category,
          expenseTitle: expenseTitle.trim(),
          cost: parsedCost,
          sharedTrip: shouldShare,
          sharedTripMarkedById: expenseOwnerId,
          sharedTripMarkedByName: expenseOwnerName,
        });
      } else {
        await addEntryOfflineFirst({
          type: 'expense',
          userId: entryUser.id,
          userName: entryUser.name,
          odometer: parsedOdometer,
          expenseCategory: category,
          expenseTitle: expenseTitle.trim(),
          cost: parsedCost,
          sharedTrip: shouldShare,
          sharedTripMarkedById: currentUser.id,
          sharedTripMarkedByName: currentUser.name,
        });
      }

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(
        isEditing ? 'Could not update expense' : 'Could not save expense',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  });

  const handleDelete = () => {
    if (!editingEntry) return;
    if (!currentUser || getEntryOwnerId(editingEntry) !== currentUser.id) {
      Alert.alert('Delete not allowed', 'You can only delete your own expense entries.');
      return;
    }

    Alert.alert('Delete Entry', 'Are you sure you want to delete this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEntry(editingEntry.id).then(() => {
            navigation.goBack();
            void runSyncCycle();
          });
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <KeyboardAwareScrollView
        style={styles.keyboardContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
      >
        <View style={[styles.scrollContent, styles.container]}>
          <View pointerEvents="none" style={[styles.orbTop, { backgroundColor: orbTone }]} />

          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>EXPENSE ENTRY</Text>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
              </View>

              <View style={[styles.headerIcon, { backgroundColor: accentTone }]}>
                <MaterialCommunityIcons name="receipt-text-outline" size={20} color={colors.textPrimary} />
              </View>
            </View>
          </View>

          <View style={styles.quickWrap}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Categories</Text>
            <View style={styles.quickGrid}>
              {quickExpenseCategories.map((item) => {
                const active =
                  item.title === 'Car Maintenance'
                    ? showMaintenanceSubcategories || inferredCategory === 'maintenance_lab'
                    : normalizedSelectedExpenseTitle === item.title.toLowerCase();
                return (
                  <Pressable
                    key={item.title}
                    onPress={() => handleQuickCategoryPress(item.title)}
                    style={[
                      styles.quickChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    <MaterialIcons
                      name={active ? 'check' : item.icon}
                      size={14}
                      color={active ? colors.invertedText : colors.textSecondary}
                    />
                    <Text style={[styles.quickChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {showMaintenanceSubcategories ? (
              <View
                style={[
                  styles.maintenancePanel,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
              >
                <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Maintenance Items</Text>
                <View style={styles.quickGrid}>
                  {maintenanceExpenseTitles.map((item) => {
                    const active = normalizedSelectedExpenseTitle === item.title.toLowerCase();
                    return (
                      <Pressable
                        key={item.title}
                        onPress={() => handleMaintenanceSubcategoryPress(item.title)}
                        style={[
                          styles.subCategoryChip,
                          {
                            borderColor: active ? colors.textPrimary : colors.border,
                            backgroundColor: active ? colors.textPrimary : colors.card,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={active ? 'check' : item.icon}
                          size={14}
                          color={active ? colors.invertedText : colors.textSecondary}
                        />
                        <Text style={[styles.quickChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                          {item.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {showPaidBySection ? (
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paid By</Text>

                <View style={styles.payerGrid}>
                  {ALLOWED_USERS.map((user) => {
                    const active = selectedPaidByUserId === user.id;
                    const isCurrentUser = currentUser?.id === user.id;

                    return (
                      <Pressable
                        key={user.id}
                        onPress={() => setValue('paidByUserId', user.id, { shouldValidate: true, shouldDirty: true })}
                        style={[
                          styles.payerOption,
                          {
                            borderColor: active ? colors.textPrimary : colors.border,
                            backgroundColor: active ? colors.backgroundSecondary : colors.card,
                          },
                        ]}>
                        <View style={styles.payerOptionHead}>
                          <Text style={[styles.payerName, { color: colors.textPrimary }]}>{user.name}</Text>
                          <MaterialIcons
                            name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={20}
                            color={active ? colors.textPrimary : colors.textSecondary}
                          />
                        </View>
                        <Text style={[styles.payerMeta, { color: colors.textSecondary }]}>
                          {isCurrentUser ? 'Logged in user' : 'Choose if they paid'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.paidByUserId ? (
                  <Text style={styles.selectionError}>{errors.paidByUserId.message}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Entry Details</Text>
                <Text style={[styles.payerHint, { color: colors.textSecondary }]}>
                  FASTag toll amount will be deducted from your FASTag wallet balance.
                </Text>
              </View>
            )}

            {isEditing ? (
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Entry Date</Text>
                <Pressable
                  onPress={() => setIsDatePickerVisible(true)}
                  style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <MaterialIcons name="calendar-today" size={18} color={colors.textPrimary} />
                  <View style={styles.dateCopy}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Recorded on</Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                      {dayjs(entryDate).format(INDIA_DATE_FORMAT)}
                    </Text>
                  </View>
                </Pressable>
                {isDatePickerVisible ? (
                  <DateTimePicker
                    value={entryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDatePickerChange}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Expense Details</Text>
              <Controller
                control={control}
                name="expenseTitle"
                render={({ field: { onChange, value } }) => (
                  <AppTextField
                    label="Expense title"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Type your own expense title"
                    autoCapitalize="sentences"
                    error={errors.expenseTitle?.message}
                    inputStyle={styles.roundedInput}
                  />
                )}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                Detected category: <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{inferredCategoryMeta.label}</Text>
              </Text>
              <Controller
                control={control}
                name="cost"
                render={({ field: { onChange, value } }) => (
                  <AppTextField
                    label="Amount (Rs)"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 950"
                    error={errors.cost?.message}
                    inputStyle={styles.roundedInput}
                  />
                )}
              />
            </View>

            <View style={[styles.odoPanel, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.odoHead}>
                <Text style={[styles.odoLabel, { color: colors.textSecondary }]}>Odometer Snapshot</Text>
                <Text style={[styles.odoHint, { color: colors.textSecondary }]}>{isEditing ? `Latest ${lastOdometer} km` : `Previous ${lastOdometer} km`}</Text>
              </View>
              <Controller
                control={control}
                name="odometer"
                render={({ field: { onChange, value } }) => (
                  <OdometerDigitInput
                    label="Current Odometer"
                    value={value}
                    onChangeText={onChange}
                    error={errors.odometer?.message}
                  />
                )}
              />
            </View>

            {showSharedToggle ? (
              <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Expense</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    {inferredCategory === 'fasttag_toll_paid' ? 'Toll was paid on a shared trip' : 'Violation expense was shared'}
                  </Text>
                </View>
                <Switch
                  value={sharedExpense}
                  onValueChange={setSharedExpense}
                  trackColor={{ false: colors.border, true: colors.textSecondary }}
                  thumbColor={isDark ? colors.textPrimary : colors.background}
                />
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {isEditing ? (
                <Pressable
                  onPress={handleDelete}
                  style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                  <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <PrimaryButton label={isEditing ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    gap: 14,
    paddingBottom: 28,
    position: 'relative',
  },
  orbTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -30,
    right: -50,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    borderWidth: 1,
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  inferredBadge: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inferredCopy: {
    gap: 2,
  },
  inferredLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inferredValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  payerHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  payerGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  payerOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  payerOptionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  payerMeta: {
    fontSize: 9,
    lineHeight: 5,
  },
  selectionError: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateCopy: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  quickWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  maintenancePanel: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 10,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subCategoryChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 16,
  },
  formSection: {
    gap: 12,
  },
  roundedInput: {
    height: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  odoPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    gap: 10,
  },
  odoHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  odoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  odoHint: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 16,
  },
  deleteBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 11,
    lineHeight: 16,
  },
});
