import { zodResolver } from '@hookform/resolvers/zod';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = NativeStackScreenProps<AppStackParamList, 'StartingCarModal'>;

const schema = z.object({
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,7}$/.test(value), 'Use up to 7 digits.'),
  cost: z
    .string()
    .trim()
    .optional()
    .refine((value) => value === undefined || value === '' || Number(value) > 0, 'Cost must be positive.'),
});

type FormValues = z.infer<typeof schema>;

export function StartingCarScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      odometer: String(lastOdometer),
      cost: '',
    },
  });

  const onSubmit = handleSubmit(async ({ odometer, cost }) => {
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

    try {
      const parsedCost = cost ? Number(cost) : undefined;
      await addEntryOfflineFirst({
        type: 'odometer',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer: parsedOdometer,
        cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
      });

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert('Could not save entry', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => navigation.goBack()} />

      <View style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.headerStrip, { backgroundColor: colors.invertedBackground }]}> 
          <Text style={[styles.title, { color: colors.invertedText }]}>STARTING THE CAR</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="close" size={22} color={colors.invertedText} />
          </Pressable>
        </View>

        <View style={[styles.content, { backgroundColor: colors.backgroundSecondary }]}> 
          <Text style={[styles.info, { color: colors.textSecondary }]}>Previous odometer: {lastOdometer} km</Text>

          <Controller
            control={control}
            name="odometer"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="Odometer Reading"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                error={errors.odometer?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="cost"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="Cost (Rs) - Optional"
                value={value ?? ''}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                error={errors.cost?.message}
              />
            )}
          />

          <PrimaryButton label="SAVE ODOMETER" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  popup: {
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  headerStrip: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
    gap: 12,
  },
  info: {
    fontSize: 13,
  },
});
