import { zodResolver } from '@hookform/resolvers/zod';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
});

type FormValues = z.infer<typeof schema>;

export function StartingCarScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

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
      Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      return;
    }
    if (parsedOdometer - lastOdometer > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
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
    <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)' }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => navigation.goBack()} />

      <View style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>TRIP ENTRY</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Log Start Reading</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <MaterialIcons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={[styles.iconStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconBadge, { backgroundColor: accentTone }]}>
            <MaterialCommunityIcons name="car-sports" size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.iconCopy}>
            <Text style={[styles.iconTitle, { color: colors.textPrimary }]}>Start trip</Text>
            <Text style={[styles.iconText, { color: colors.textSecondary }]}>Enter the odometer reading before you move.</Text>
          </View>
        </View>

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

        <PrimaryButton label="START TRIP" onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  popup: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStrip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCopy: {
    flex: 1,
    gap: 2,
  },
  iconTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  iconText: {
    fontSize: 12,
    lineHeight: 18,
  },
  primaryAction: {
    height: 54,
    borderRadius: 16,
  },
});
