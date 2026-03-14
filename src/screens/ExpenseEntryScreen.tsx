import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ExpenseCategory } from '@/types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'ExpenseEntryModal'>;

const quickExpenseTitles = [
  'Last Maintenance',
  'Engine Oil Change',
  'Coolant Refill',
  'PUCC Renewal',
  'Insurance Renewal',
  'Fitness Renewal',
  'Tax Renewal',
  'FASTag Recharge',
] as const;

const categoryMeta: Record<ExpenseCategory, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  shield_safety: { label: 'Shield & Safety', icon: 'verified-user' },
  care_comfort: { label: 'Care & Comfort', icon: 'weekend' },
  maintenance_lab: { label: 'Maintenance Lab', icon: 'build-circle' },
  utility_addon: { label: 'Utility Add-ons', icon: 'bolt' },
  other: { label: 'Other', icon: 'apps' },
};

const keywordCategoryRules: Array<{ keywords: string[]; category: ExpenseCategory }> = [
  { keywords: ['maintenance', 'service', 'engine oil', 'oil', 'coolant', 'filter', 'alignment', 'balancing', 'repair'], category: 'maintenance_lab' },
  { keywords: ['insurance', 'pucc', 'cover', 'rat', 'protector', 'safety', 'helmet'], category: 'shield_safety' },
  { keywords: ['fastag', 'fast tag', 'tax', 'fitness', 'recharge', 'challan', 'tag'], category: 'utility_addon' },
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
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export function ExpenseEntryScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const updateEntryOfflineFirst = useAppStore((state) => state.updateEntryOfflineFirst);
  const entries = useAppStore((state) => state.entries);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const orbTone = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
  const editingEntry = route.params?.entryId
    ? entries.find((entry) => entry.id === route.params?.entryId && entry.type === 'expense')
    : undefined;
  const isEditing = Boolean(editingEntry);

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
    },
  });

  const selectedExpenseTitle = watch('expenseTitle');
  const inferredCategory = inferExpenseCategory(selectedExpenseTitle);
  const inferredCategoryMeta = categoryMeta[inferredCategory];

  const onSubmit = handleSubmit(async ({ odometer, expenseTitle, cost }) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    if (isEditing && !editingEntry) {
      Alert.alert('Entry not found', 'This expense entry is no longer available.');
      navigation.goBack();
      return;
    }
    if (editingEntry && editingEntry.userId !== currentUser.id) {
      Alert.alert('Edit not allowed', 'You can only edit your own expense entries.');
      return;
    }

    const parsedOdometer = Number(odometer);
    const parsedCost = Number(cost);
    const odometerFloor = isEditing ? null : lastOdometer;

    if (odometerFloor !== null && parsedOdometer < odometerFloor) {
      Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      return;
    }
    if (odometerFloor !== null && parsedOdometer - odometerFloor > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      return;
    }

    try {
      if (editingEntry) {
        await updateEntryOfflineFirst(editingEntry.id, {
          odometer: parsedOdometer,
          expenseCategory: inferExpenseCategory(expenseTitle),
          expenseTitle: expenseTitle.trim(),
          cost: parsedCost,
        });
      } else {
        await addEntryOfflineFirst({
          type: 'expense',
          userId: currentUser.id,
          userName: currentUser.name,
          odometer: parsedOdometer,
          expenseCategory: inferExpenseCategory(expenseTitle),
          expenseTitle: expenseTitle.trim(),
          cost: parsedCost,
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

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, styles.container]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

          <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <MaterialIcons name="receipt-long" size={22} color={colors.textPrimary} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{isEditing ? 'Update expense' : 'Log an expense'}</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  The app auto-detects the category from the title you enter.
                </Text>
              </View>
            </View>

            <View style={[styles.inferredBadge, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <MaterialIcons name={inferredCategoryMeta.icon} size={18} color={colors.textPrimary} />
              <View style={styles.inferredCopy}>
                <Text style={[styles.inferredLabel, { color: colors.textSecondary }]}>Detected category</Text>
                <Text style={[styles.inferredValue, { color: colors.textPrimary }]}>{inferredCategoryMeta.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickWrap}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Titles</Text>
            <View style={styles.quickGrid}>
              {quickExpenseTitles.map((title) => {
                const active = selectedExpenseTitle.trim().toLowerCase() === title.toLowerCase();
                return (
                  <Pressable
                    key={title}
                    onPress={() => setValue('expenseTitle', title, { shouldValidate: true, shouldDirty: true })}
                    style={[
                      styles.quickChip,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                    <Text style={[styles.quickChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
                    placeholder="e.g. Insurance Renewal"
                    autoCapitalize="sentences"
                    error={errors.expenseTitle?.message}
                  />
                )}
              />

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

            <PrimaryButton label={isEditing ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 16,
  },
  formSection: {
    gap: 12,
  },
  odoPanel: {
    borderWidth: 1,
    borderRadius: 18,
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
  primaryAction: {
    height: 54,
    borderRadius: 16,
  },
});
