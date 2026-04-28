import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT, mergeDateWithExistingTime } from '@/utils/day';
import { getEntryOwnerId, getEntryOwnerName } from '@/utils/entryOwnership';

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
    paidByUserId: z
      .string()
      .trim()
      .min(1, 'Select who paid.')
      .refine((value) => ALLOWED_USERS.some((user) => user.id === value), 'Select a valid user.'),
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
  const [entryDate, setEntryDate] = useState(() => new Date(editingEntry?.createdAt ?? Date.now()));
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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
      paidByUserId: editingEntry?.userId ?? currentUser?.id ?? '',
    },
  });
  const fullTankSelected = watch('fullTank');
  const selectedPaidByUserId = watch('paidByUserId');

  useEffect(() => {
    if (fullTankSelected) {
      setValue('fuelLiters', String(GRAND_I10_NIOS_TANK_CAPACITY_LITERS), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [fullTankSelected, setValue]);

  useEffect(() => {
    if (!isEditing && currentUser && !selectedPaidByUserId) {
      setValue('paidByUserId', currentUser.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [currentUser, isEditing, selectedPaidByUserId, setValue]);

  useEffect(() => {
    if (editingEntry) {
      setEntryDate(new Date(editingEntry.createdAt));
    }
  }, [editingEntry]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
    setIsDatePickerVisible(false);
  };

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
    if (editingEntry && getEntryOwnerId(editingEntry) !== currentUser.id) {
      Alert.alert('Edit not allowed', 'You can only edit your own fuel entries.');
      return;
    }

    const parsedOdometer = Number(values.odometer);

    const amount = Number(values.fuelAmount);
    const liters = Number(values.fuelLiters);
    const selectedPayer = ALLOWED_USERS.find((user) => user.id === values.paidByUserId);

    if (!selectedPayer) {
      Alert.alert('Invalid payer', 'Select who paid for this fuel entry.');
      return;
    }

    try {
      if (editingEntry) {
        const entryOwnerId = getEntryOwnerId(editingEntry);
        const entryOwnerName = getEntryOwnerName(editingEntry);
        await updateEntryOfflineFirst(editingEntry.id, {
          userId: selectedPayer.id,
          userName: selectedPayer.name,
          odometer: parsedOdometer,
          createdAt: mergeDateWithExistingTime(entryDate, editingEntry.createdAt),
          fuelAmount: amount,
          fuelLiters: liters,
          cost: amount,
          fullTank: values.fullTank,
          sharedTripMarkedById: entryOwnerId,
          sharedTripMarkedByName: entryOwnerName,
        });
      } else {
        await addEntryOfflineFirst({
          type: 'fuel',
          userId: selectedPayer.id,
          userName: selectedPayer.name,
          odometer: parsedOdometer,
          fuelAmount: amount,
          fuelLiters: liters,
          cost: amount,
          fullTank: values.fullTank,
          sharedTripMarkedById: currentUser.id,
          sharedTripMarkedByName: currentUser.name,
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
    if (!currentUser || getEntryOwnerId(editingEntry) !== currentUser.id) {
      Alert.alert('Delete not allowed', 'You can only delete your own fuel entries.');
      return;
    }

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
      <KeyboardAwareScrollView
        style={styles.keyboardContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
      >
        <View style={[styles.scrollContent, styles.container]}>
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
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paid By</Text>

              <View style={styles.payerGrid}>
                {ALLOWED_USERS.map((user) => {
                  const active = selectedPaidByUserId === user.id;
                  const isCurrentUser = currentUser?.id === user.id;

                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => setValue('paidByUserId', user.id, { shouldValidate: true, shouldDirty: true })}
                      style={[
                        styles.payerOption,
                        {
                          borderColor: active ? colors.textPrimary : colors.border,
                          backgroundColor: active ? colors.backgroundSecondary : colors.card,
                        },
                      ]}>
                      <View style={styles.payerOptionHead}>
                        <Text style={[styles.payerName, { color: colors.textPrimary }]}>{user.name}</Text>
                        <MaterialIcons
                          name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={active ? colors.textPrimary : colors.textSecondary}
                        />
                      </View>
                      <Text style={[styles.payerMeta, { color: colors.textSecondary }]}>
                        {isCurrentUser ? 'Logged in user' : 'Choose if they paid'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.paidByUserId ? (
                <Text style={styles.selectionError}>{errors.paidByUserId.message}</Text>
              ) : null}
            </View>

            {isEditing ? (
              <View style={styles.fieldsGroup}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Entry Date</Text>
                <Pressable
                  onPress={() => setIsDatePickerVisible(true)}
                  style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <MaterialIcons name="calendar-today" size={18} color={colors.textPrimary} />
                  <View style={styles.dateCopy}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Recorded on</Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                      {dayjs(entryDate).format(INDIA_DATE_FORMAT)}
                    </Text>
                  </View>
                </Pressable>
                {isDatePickerVisible ? (
                  <DateTimePicker
                    value={entryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDatePickerChange}
                  />
                ) : null}
              </View>
            ) : null}

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

              <View style={styles.metricsRow}>
                <View style={styles.metricField}>
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
                </View>

                <View style={styles.metricField}>
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
                        editable={!fullTankSelected}
                      />
                    )}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <View style={styles.switchCopy}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Full Tank</Text>
                <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                  Full tank fills {GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L for Grand i10 Nios 2023 petrol.
                </Text>
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
              <View style={{ flex: 1 }}>
                <PrimaryButton label={isEditing ? 'UPDATE FUEL ENTRY' : 'SAVE FUEL ENTRY'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metricField: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  payerHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  payerGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  payerOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  payerOptionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  payerMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectionError: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateCopy: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
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
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 11,
    lineHeight: 16,
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
