import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
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
    },
  });

  const onSubmit = handleSubmit(async ({ odometer }) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    const parsedOdometer = Number(odometer);

    if (parsedOdometer < lastOdometer) {
      Alert.alert('Invalid odometer', 'Odometer must be greater than or equal to the previous value.');
      return;
    }

    try {
      await addEntryOfflineFirst({
        type: 'odometer',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer: parsedOdometer,
      });

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert('Could not save entry', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>STARTING THE CAR</Text>
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
                label="Odometer Reading"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                error={errors.odometer?.message}
              />
            )}
          />

          <PrimaryButton label="SAVE ODOMETER" onPress={onSubmit} loading={isSubmitting} />
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
    gap: 12,
  },
  info: {
    fontSize: 13,
  },
});
