import { zodResolver } from '@hookform/resolvers/zod';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
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
        <View style={[styles.headerStrip, { backgroundColor: colors.invertedBackground }]}> 
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.invertedText} />
          </Pressable>
          <Text style={[styles.title, { color: colors.invertedText }]}>ADD FUEL ENTRY</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}> 
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
          </View>

          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}> 
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

          <View style={[styles.switchRow, { borderColor: colors.textPrimary }]}> 
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
    backgroundColor: 'transparent',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
