import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>ADD FUEL ENTRY</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.info, { color: colors.textSecondary }]}>Previous odometer: {lastOdometer} km</Text>

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

          <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}> 
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Full Tank</Text>
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

          <PrimaryButton label="SAVE FUEL ENTRY" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 14,
    gap: 10,
  },
  info: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    height: 46,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
