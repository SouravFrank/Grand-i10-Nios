import { zodResolver } from '@hookform/resolvers/zod';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ExpenseCategory } from '@/types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'ExpenseEntryModal'>;

const categoryValues = ['shield_safety', 'care_comfort', 'maintenance_lab', 'utility_addon', 'other'] as const;

const categoryOptions: { value: ExpenseCategory; label: string }[] = [
  { value: 'shield_safety', label: 'Shield & Safety' },
  { value: 'care_comfort', label: 'Care & Comfort' },
  { value: 'maintenance_lab', label: 'Maintenance Lab' },
  { value: 'utility_addon', label: 'Utility Add-ons' },
  { value: 'other', label: 'Other' },
];

const expenseSchema = z.object({
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,7}$/.test(value), 'Use up to 7 digits.'),
  expenseTitle: z.string().trim().min(2, 'Expense title is required.').max(48, 'Keep title under 48 characters.'),
  cost: z
    .string()
    .trim()
    .min(1, 'Cost is required.')
    .refine((value) => Number(value) > 0, 'Cost must be positive.'),
  category: z.enum(categoryValues),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export function ExpenseEntryScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      odometer: String(lastOdometer),
      expenseTitle: '',
      cost: '',
      category: 'shield_safety',
    },
  });

  const selectedCategory = watch('category');

  const onSubmit = handleSubmit(async ({ odometer, expenseTitle, cost, category }) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    const parsedOdometer = Number(odometer);
    if (parsedOdometer < lastOdometer) {
      Alert.alert('Invalid odometer', 'Odometer must be greater than or equal to the previous value.');
      return;
    }
    if (parsedOdometer - lastOdometer > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      return;
    }

    const parsedCost = Number(cost);

    try {
      await addEntryOfflineFirst({
        type: 'expense',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer: parsedOdometer,
        expenseCategory: category,
        expenseTitle: expenseTitle.trim(),
        cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
      });

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert('Could not save expense', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.headerStrip, { backgroundColor: colors.invertedBackground }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.invertedText} />
          </Pressable>
          <Text style={[styles.title, { color: colors.invertedText }]}>ADD EXPENSE</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.info, { color: colors.textSecondary }]}>Current odometer: {lastOdometer} km</Text>
            <Controller
              control={control}
              name="odometer"
              render={({ field: { onChange, value } }) => (
                <AppTextField
                  label="Odometer"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  error={errors.odometer?.message}
                />
              )}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FANCY CATEGORY</Text>
          <View style={styles.categoryWrap}>
            {categoryOptions.map((category) => {
              const active = selectedCategory === category.value;
              return (
                <Pressable
                  key={category.value}
                  onPress={() => setValue('category', category.value, { shouldValidate: true })}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: active ? colors.textPrimary : colors.border,
                      backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                    },
                  ]}>
                  {active ? <MaterialIcons name="check" size={14} color={colors.invertedText} /> : null}
                  <Text style={[styles.categoryChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Controller
            control={control}
            name="expenseTitle"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="Expense title"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Car Cover"
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
                label="Cost (Rs)"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="e.g. 950"
                error={errors.cost?.message}
              />
            )}
          />

          <PrimaryButton label="SAVE EXPENSE" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  headerStrip: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  form: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 12,
    gap: 10,
  },
  section: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    gap: 8,
  },
  info: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
