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

import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'HistoryEntryModal'>;

const historySchema = z
  .object({
    startOdometer: z
      .string()
      .trim()
      .min(1, 'Start odometer is required.')
      .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
    endOdometer: z
      .string()
      .trim()
      .min(1, 'End odometer is required.')
      .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
    tripDate: z.date(),
    isSharedTrip: z.boolean(),
    tripOwnerId: z
      .string()
      .trim()
      .min(1, 'Select trip owner.')
      .refine((value) => ALLOWED_USERS.some((user) => user.id === value), 'Select a valid user.'),
  })
  .superRefine((data, context) => {
    const startOdo = Number(data.startOdometer);
    const endOdo = Number(data.endOdometer);

    if (startOdo >= endOdo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End odometer must be greater than start odometer.',
        path: ['endOdometer'],
      });
    }

    if (endOdo - startOdo > 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Trip distance seems too high (over 1000 km).',
        path: ['endOdometer'],
      });
    }
  });

type HistoryForm = z.infer<typeof historySchema>;

export function HistoryEntryScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const orbTone = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HistoryForm>({
    resolver: zodResolver(historySchema),
    defaultValues: {
      startOdometer: String(lastOdometer),
      endOdometer: '',
      tripDate: entryDate,
      isSharedTrip: false,
      tripOwnerId: currentUser?.id ?? '',
    },
  });

  const selectedTripOwnerId = watch('tripOwnerId');

  useEffect(() => {
    if (currentUser && !selectedTripOwnerId) {
      setValue('tripOwnerId', currentUser.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [currentUser, selectedTripOwnerId, setValue]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
      setValue('tripDate', selectedDate, { shouldDirty: true, shouldValidate: true });
    }
    setIsDatePickerVisible(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    const startOdo = Number(values.startOdometer);
    const endOdo = Number(values.endOdometer);
    const distance = endOdo - startOdo;
    const selectedOwner = ALLOWED_USERS.find((user) => user.id === values.tripOwnerId);

    if (!selectedOwner) {
      Alert.alert('Invalid owner', 'Select who owns this trip.');
      return;
    }

    try {
      const historyTripId = `history-${Date.now()}`;
      const tripStartTime = values.tripDate.getTime();
      const tripEndTime = tripStartTime + (60 * 60 * 1000); // Assume 1 hour duration for history trips

      // Create start entry
      await addEntryOfflineFirst({
        type: 'odometer',
        userId: selectedOwner.id,
        userName: selectedOwner.name,
        odometer: startOdo,
        tripId: historyTripId,
        tripStage: 'start',
        cost: 0,
        createdAt: tripStartTime,
        sharedTrip: values.isSharedTrip,
        sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
        sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
      });

      // Create end entry
      await addEntryOfflineFirst({
        type: 'odometer',
        userId: selectedOwner.id,
        userName: selectedOwner.name,
        odometer: endOdo,
        tripId: historyTripId,
        tripStage: 'end',
        tripDistanceKm: distance,
        cost: 0,
        createdAt: tripEndTime,
        sharedTrip: values.isSharedTrip,
        sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
        sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
      });

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(
        'Could not save history entry',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  });

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
                <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>HISTORY ENTRY</Text>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Trip History</Text>
              </View>

              <View style={[styles.headerIcon, { backgroundColor: accentTone }]}>
                <MaterialIcons name="history" size={20} color={colors.textPrimary} />
              </View>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Trip Date</Text>
              <Pressable
                onPress={() => setIsDatePickerVisible(true)}
                style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="calendar-today" size={18} color={colors.textPrimary} />
                <View style={styles.dateCopy}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Trip date</Text>
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

            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Odometer Readings</Text>
              
              <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.odoHead}>
                  <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>Start Odometer</Text>
                  <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>
                    Previous {lastOdometer} km
                  </Text>
                </View>
                <Controller
                  control={control}
                  name="startOdometer"
                  render={({ field: { onChange, value } }) => (
                    <OdometerDigitInput
                      label="Start Odometer"
                      value={value}
                      onChangeText={onChange}
                      error={errors.startOdometer?.message}
                    />
                  )}
                />
              </View>

              <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.odoHead}>
                  <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>End Odometer</Text>
                  <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>
                    Trip completion reading
                  </Text>
                </View>
                <Controller
                  control={control}
                  name="endOdometer"
                  render={({ field: { onChange, value } }) => (
                    <OdometerDigitInput
                      label="End Odometer"
                      value={value}
                      onChangeText={onChange}
                      error={errors.endOdometer?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Trip Owner</Text>

              <View style={styles.payerGrid}>
                {ALLOWED_USERS.map((user) => {
                  const active = selectedTripOwnerId === user.id;
                  const isCurrentUser = currentUser?.id === user.id;

                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => setValue('tripOwnerId', user.id, { shouldValidate: true, shouldDirty: true })}
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
                        {isCurrentUser ? 'Logged in user' : 'Choose if they own this trip'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.tripOwnerId ? (
                <Text style={styles.selectionError}>{errors.tripOwnerId.message}</Text>
              ) : null}
            </View>

            <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <View style={styles.switchCopy}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Trip</Text>
                <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                  Mark if this was a shared trip
                </Text>
              </View>
              <Controller
                control={control}
                name="isSharedTrip"
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
              <View style={{ flex: 1 }}>
                <PrimaryButton label="SAVE HISTORY ENTRY" onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
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
  formCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 12,
  },
  fieldsGroup: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
    fontSize: 9,
    lineHeight: 16,
  },
  selectionError: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
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
});
