import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = NativeStackScreenProps<AppStackParamList, 'FuelEntryModal'>;

const fuelSchema = z
  .object({
    odometer: z
      .string()
      .trim()
      .min(1, 'Odometer is required.')
      .refine((value) => /^\d{1,7}$/.test(value), 'Use up to 7 digits.'),
    fuelAmount: z
      .string()
      .trim()
      .optional()
      .refine((value) => value === undefined || value === '' || Number(value) > 0, 'Fuel amount must be positive.'),
    fuelLiters: z
      .string()
      .trim()
      .optional()
      .refine((value) => value === undefined || value === '' || Number(value) > 0, 'Fuel liters must be positive.'),
    fullTank: z.boolean(),
  })
  .refine((data) => Boolean(data.fullTank || data.fuelAmount || data.fuelLiters), {
    message: 'Enter Fuel Amount, Fuel Liters, or enable Full Tank.',
    path: ['fuelAmount'],
  });

type FuelForm = z.infer<typeof fuelSchema>;

export function FuelEntryScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const orbTone = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FuelForm>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      odometer: String(lastOdometer),
      fuelAmount: '',
      fuelLiters: '',
      fullTank: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    const parsedOdometer = Number(values.odometer);
    if (parsedOdometer < lastOdometer) {
      Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      return;
    }
    if (parsedOdometer - lastOdometer > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      return;
    }

    const amount = values.fuelAmount ? Number(values.fuelAmount) : undefined;
    const liters = values.fuelLiters ? Number(values.fuelLiters) : undefined;

    try {
      await addEntryOfflineFirst({
        type: 'fuel',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer: parsedOdometer,
        fuelAmount: Number.isFinite(amount) ? amount : undefined,
        fuelLiters: Number.isFinite(liters) ? liters : undefined,
        cost: Number.isFinite(amount) ? amount : undefined,
        fullTank: values.fullTank,
      });

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert('Could not save fuel entry', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View pointerEvents="none" style={[styles.orbTop, { backgroundColor: orbTone }]} />

        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerCopy}>
              <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>FUEL ENTRY</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Refill Fuel</Text>
            </View>

            <View style={[styles.headerIcon, { backgroundColor: accentTone }]}>
              <MaterialCommunityIcons name="fuel" size={20} color={colors.textPrimary} />
            </View>
          </View>

          <View style={[styles.odoBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Text style={[styles.odoBadgeLabel, { color: colors.textSecondary }]}>Last odometer</Text>
            <Text style={[styles.odoBadgeValue, { color: colors.textPrimary }]}>{lastOdometer} km</Text>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldsGroup}>
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

            <Controller
              control={control}
              name="fuelAmount"
              render={({ field: { onChange, value } }) => (
                <AppTextField
                  label="Fuel Amount (Rs)"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2000"
                  error={errors.fuelAmount?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="fuelLiters"
              render={({ field: { onChange, value } }) => (
                <AppTextField
                  label="Fuel Liters"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 24.6"
                  error={errors.fuelLiters?.message}
                />
              )}
            />
          </View>

          <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.switchCopy}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Full Tank</Text>
            </View>
            <Controller
              control={control}
              name="fullTank"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: colors.border, true: colors.textSecondary }}
                  thumbColor={isDark ? colors.textPrimary : colors.background}
                />
              )}
            />
          </View>

          <PrimaryButton label="SAVE FUEL ENTRY" onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    gap: 16,
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
  odoBadge: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  odoBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  odoBadgeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 12,
  },
  fieldsGroup: {
    gap: 6,
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
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    height: 54,
    borderRadius: 16,
    marginTop: 2,
  },
});
