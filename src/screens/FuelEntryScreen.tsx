import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';

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
  .refine(
    (data) => Boolean(data.fullTank || data.fuelAmount || data.fuelLiters),
    {
      message: 'Enter Fuel Amount, Fuel Liters, or enable Full Tank.',
      path: ['fuelAmount'],
    },
  );

type FuelForm = z.infer<typeof fuelSchema>;

export function FuelEntryScreen({ navigation }: Props) {
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);

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
      Alert.alert('Invalid odometer', 'Odometer must be greater than or equal to the previous value.');
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
      <View style={styles.container}>
        <Text style={styles.info}>Previous odometer: {lastOdometer} km</Text>

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
              label="Fuel Amount (₹)"
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Full Tank</Text>
          <Controller
            control={control}
            name="fullTank"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
            )}
          />
        </View>

        <PrimaryButton label="Save Fuel Entry" onPress={onSubmit} loading={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  info: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    height: 46,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
});
