import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = NativeStackScreenProps<AppStackParamList, 'FuelEntryModal'>;

const GRAND_I10_NIOS_TANK_CAPACITY_LITERS = 37;

const fuelSchema = z
  .object({
    odometer: z
      .string()
      .trim()
      .min(1, 'Odometer is required.')
      .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
    fuelAmount: z
      .string()
      .trim()
      .min(1, 'Fuel amount is required.')
      .refine((value) => Number(value) > 0, 'Fuel amount must be positive.'),
    fuelLiters: z
      .string()
      .trim()
      .min(1, 'Fuel liters is required.')
      .refine((value) => Number(value) > 0, 'Fuel liters must be positive.'),
    fullTank: z.boolean(),
  })
  .superRefine((data, context) => {
    const liters = Number(data.fuelLiters);

    if (Number.isFinite(liters) && liters > GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fuel liters cannot exceed ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`,
        path: ['fuelLiters'],
      });
    }

    if (data.fullTank && Number.isFinite(liters) && liters !== GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Full tank is fixed at ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`,
        path: ['fuelLiters'],
      });
    }
  });

type FuelForm = z.infer<typeof fuelSchema>;

export function FuelEntryScreen({ navigation, route }: Props) {
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
    ? entries.find((entry) => entry.id === route.params?.entryId && entry.type === 'fuel')
    : undefined;
  const isEditing = Boolean(editingEntry);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FuelForm>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      odometer: String(editingEntry?.odometer ?? lastOdometer),
      fuelAmount: editingEntry?.fuelAmount ? String(editingEntry.fuelAmount) : '',
      fuelLiters: editingEntry?.fuelLiters ? String(editingEntry.fuelLiters) : '',
      fullTank: editingEntry?.fullTank ?? false,
    },
  });
  const fullTankSelected = watch('fullTank');

  useEffect(() => {
    if (fullTankSelected) {
      setValue('fuelLiters', String(GRAND_I10_NIOS_TANK_CAPACITY_LITERS), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [fullTankSelected, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    if (isEditing && !editingEntry) {
      Alert.alert('Entry not found', 'This fuel entry is no longer available.');
      navigation.goBack();
      return;
    }
    if (editingEntry && editingEntry.userId !== currentUser.id) {
      Alert.alert('Edit not allowed', 'You can only edit your own fuel entries.');
      return;
    }

    const parsedOdometer = Number(values.odometer);
    const odometerFloor = isEditing ? null : lastOdometer;

    if (odometerFloor !== null && parsedOdometer < odometerFloor) {
      Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      return;
    }
    if (odometerFloor !== null && parsedOdometer - odometerFloor > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      return;
    }

    const amount = Number(values.fuelAmount);
    const liters = Number(values.fuelLiters);

    try {
      if (editingEntry) {
        await updateEntryOfflineFirst(editingEntry.id, {
          odometer: parsedOdometer,
          fuelAmount: amount,
          fuelLiters: liters,
          cost: amount,
          fullTank: values.fullTank,
        });
      } else {
        await addEntryOfflineFirst({
          type: 'fuel',
          userId: currentUser.id,
          userName: currentUser.name,
          odometer: parsedOdometer,
          fuelAmount: amount,
          fuelLiters: liters,
          cost: amount,
          fullTank: values.fullTank,
        });
      }

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(
        isEditing ? 'Could not update fuel entry' : 'Could not save fuel entry',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  });

  const handleDelete = () => {
    if (!editingEntry) return;
    Alert.alert('Delete Entry', 'Are you sure you want to delete this fuel entry?', [
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
                <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>FUEL ENTRY</Text>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'Edit Fuel Entry' : 'Refill Fuel'}</Text>
              </View>

              <View style={[styles.headerIcon, { backgroundColor: accentTone }]}>
                <MaterialCommunityIcons name="fuel" size={20} color={colors.textPrimary} />
              </View>
            </View>

            <View style={[styles.odoBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Text style={[styles.odoBadgeLabel, { color: colors.textSecondary }]}>{isEditing ? 'Latest odometer' : 'Last odometer'}</Text>
              <Text style={[styles.odoBadgeValue, { color: colors.textPrimary }]}>{lastOdometer} km</Text>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.fieldsGroup}>
              <Controller
                control={control}
                name="odometer"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={styles.odoHead}>
                      <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>Odometer Snapshot</Text>
                      <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>
                        {isEditing ? `Latest ${lastOdometer} km` : `Previous ${lastOdometer} km`}
                      </Text>
                    </View>
                    <OdometerDigitInput
                      label="Current Odometer"
                      value={value}
                      onChangeText={onChange}
                      error={errors.odometer?.message}
                    />
                  </View>
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
                  <View style={styles.fieldWrap}>
                    <AppTextField
                      label="Fuel Liters"
                      value={value ?? ''}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 24.6"
                      error={errors.fuelLiters?.message}
                      editable={!fullTankSelected}
                    />
                    <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                      Full tank fills {GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L for Grand i10 Nios 2023 petrol.
                    </Text>
                  </View>
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

            <View style={styles.actionRow}>
              {isEditing ? (
                <Pressable
                  onPress={handleDelete}
                  style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                  <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
                </Pressable>
              ) : null}
              <PrimaryButton label={isEditing ? 'UPDATE FUEL ENTRY' : 'SAVE FUEL ENTRY'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
            </View>
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
  odoPanelLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  odoPanelHint: {
    fontSize: 12,
  },
  fieldWrap: {
    gap: 4,
  },
  fieldHint: {
    fontSize: 12,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
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
});
