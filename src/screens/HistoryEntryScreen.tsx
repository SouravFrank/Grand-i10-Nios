import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { z } from 'zod';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import { FastagFormSection } from '@/screens/HistoryEntry/components/FastagFormSection';
import { FuelFormSection } from '@/screens/HistoryEntry/components/FuelFormSection';
import { ParkingFormSection } from '@/screens/HistoryEntry/components/ParkingFormSection';
import { TripFormSection } from '@/screens/HistoryEntry/components/TripFormSection';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ExpenseCategory } from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'HistoryEntryModal'>;

type EntryCategory = 'trip' | 'fuel' | 'parking' | 'fasttag';

const GRAND_I10_NIOS_TANK_CAPACITY_LITERS = 37;

const baseSchema = z.object({
  entryDate: z.date(),
  ownerId: z
    .string()
    .trim()
    .min(1, 'Select owner.')
    .refine((value) => ALLOWED_USERS.some((user) => user.id === value), 'Select a valid user.'),
});

const tripSchema = baseSchema.extend({
  category: z.literal('trip'),
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
  isSharedTrip: z.boolean(),
}).superRefine((data, context) => {
  const startOdo = Number(data.startOdometer);
  const endOdo = Number(data.endOdometer);

  if (startOdo >= endOdo) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End odometer must be greater than start.',
      path: ['endOdometer'],
    });
  }
  if (endOdo - startOdo > 1000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Distance seems too high (over 1000 km).',
      path: ['endOdometer'],
    });
  }
});

const fuelSchema = baseSchema.extend({
  category: z.literal('fuel'),
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  fuelAmount: z
    .string()
    .trim()
    .min(1, 'Fuel amount is required.')
    .refine((value) => Number(value) > 0, 'Amount must be positive.'),
  fuelLiters: z
    .string()
    .trim()
    .min(1, 'Fuel liters is required.')
    .refine((value) => Number(value) > 0, 'Liters must be positive.'),
  fullTank: z.boolean(),
}).superRefine((data, context) => {
  const liters = Number(data.fuelLiters);
  if (Number.isFinite(liters) && liters > GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Cannot exceed ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`,
      path: ['fuelLiters'],
    });
  }
  if (data.fullTank && Number.isFinite(liters) && liters !== GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Full tank is ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`,
      path: ['fuelLiters'],
    });
  }
});

const parkingSchema = baseSchema.extend({
  category: z.literal('parking'),
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  parkingAmount: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .refine((value) => Number(value) > 0, 'Amount must be positive.'),
  parkingLocation: z.string().trim().min(1, 'Location is required.'),
  isSharedTrip: z.boolean(),
});

const fasttagSchema = baseSchema.extend({
  category: z.literal('fasttag'),
  odometer: z
    .string()
    .trim()
    .min(1, 'Odometer is required.')
    .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  tollAmount: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .refine((value) => Number(value) > 0, 'Amount must be positive.'),
  tollLocation: z.string().trim().min(1, 'Toll location is required.'),
  isSharedTrip: z.boolean(),
});

const historyFormSchema = z.discriminatedUnion('category', [
  tripSchema,
  fuelSchema,
  parkingSchema,
  fasttagSchema,
]);

type HistoryForm = z.infer<typeof historyFormSchema>;

const CATEGORY_CONFIG: Record<EntryCategory, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  trip: { label: 'trip', icon: 'route', color: '#0EA5E9' },
  fuel: { label: 'fuel', icon: 'local-gas-station', color: '#F59E0B' },
  parking: { label: 'parking', icon: 'local-parking', color: '#22C55E' },
  fasttag: { label: 'toll paid', icon: 'toll', color: '#EF4444' },
};

export function HistoryEntryScreen({ navigation }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const currentUser = useAppStore((state) => state.currentUser);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const orbTone = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const defaultValues = useMemo(() => ({
    category: 'trip' as const,
    entryDate,
    ownerId: currentUser?.id ?? '',
    startOdometer: String(lastOdometer),
    endOdometer: '',
    isSharedTrip: false,
    odometer: String(lastOdometer),
    fuelAmount: '',
    fuelLiters: '',
    fullTank: false,
    parkingAmount: '',
    parkingLocation: '',
    tollAmount: '',
    tollLocation: '',
  }), [currentUser?.id, lastOdometer, entryDate]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HistoryForm>({
    resolver: zodResolver(historyFormSchema),
    defaultValues,
  });

  const category = watch('category');
  const selectedOwnerId = watch('ownerId');
  const fullTankSelected = watch('fullTank');

  useEffect(() => {
    if (currentUser && !selectedOwnerId) {
      setValue('ownerId', currentUser.id, { shouldDirty: false, shouldValidate: true });
    }
  }, [currentUser, selectedOwnerId, setValue]);

  useEffect(() => {
    if (category === 'fuel' && fullTankSelected) {
      setValue('fuelLiters', String(GRAND_I10_NIOS_TANK_CAPACITY_LITERS), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [fullTankSelected, category, setValue]);

  const handleCategoryChange = (newCategory: EntryCategory) => {
    reset({ ...defaultValues, category: newCategory, ownerId: selectedOwnerId || currentUser?.id || '' });
  };

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
      setValue('entryDate', selectedDate, { shouldDirty: true, shouldValidate: true });
    }
    setIsDatePickerVisible(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    const selectedOwner = ALLOWED_USERS.find((user) => user.id === values.ownerId);
    if (!selectedOwner) {
      Alert.alert('Invalid owner', 'Select who owns this entry.');
      return;
    }

    const entryTime = values.entryDate.getTime();

    try {
      if (values.category === 'trip') {
        const startOdo = Number(values.startOdometer);
        const endOdo = Number(values.endOdometer);
        const distance = endOdo - startOdo;
        const tripId = `history-${Date.now()}`;
        const tripEndTime = entryTime + (60 * 60 * 1000);

        await addEntryOfflineFirst({
          type: 'odometer',
          userId: selectedOwner.id,
          userName: selectedOwner.name,
          odometer: startOdo,
          tripId,
          tripStage: 'start',
          cost: 0,
          createdAt: entryTime,
          sharedTrip: values.isSharedTrip,
          sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
          sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
        });

        await addEntryOfflineFirst({
          type: 'odometer',
          userId: selectedOwner.id,
          userName: selectedOwner.name,
          odometer: endOdo,
          tripId,
          tripStage: 'end',
          tripDistanceKm: distance,
          cost: 0,
          createdAt: tripEndTime,
          sharedTrip: values.isSharedTrip,
          sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
          sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
        });
      } else if (values.category === 'fuel') {
        const amount = Number(values.fuelAmount);
        await addEntryOfflineFirst({
          type: 'fuel',
          userId: selectedOwner.id,
          userName: selectedOwner.name,
          odometer: Number(values.odometer),
          fuelAmount: amount,
          fuelLiters: Number(values.fuelLiters),
          cost: amount,
          fullTank: values.fullTank,
          createdAt: entryTime,
        });
      } else if (values.category === 'parking') {
        const amount = Number(values.parkingAmount);
        await addEntryOfflineFirst({
          type: 'expense',
          userId: selectedOwner.id,
          userName: selectedOwner.name,
          odometer: Number(values.odometer),
          expenseCategory: 'parking' as ExpenseCategory,
          expenseTitle: values.parkingLocation,
          cost: amount,
          createdAt: entryTime,
          sharedTrip: values.isSharedTrip,
          sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
          sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
        });
      } else if (values.category === 'fasttag') {
        const amount = Number(values.tollAmount);
        await addEntryOfflineFirst({
          type: 'expense',
          userId: selectedOwner.id,
          userName: selectedOwner.name,
          odometer: Number(values.odometer),
          expenseCategory: 'fasttag_toll_paid' as ExpenseCategory,
          expenseTitle: values.tollLocation,
          cost: amount,
          createdAt: entryTime,
          sharedTrip: values.isSharedTrip,
          sharedTripMarkedById: values.isSharedTrip ? currentUser.id : undefined,
          sharedTripMarkedByName: values.isSharedTrip ? currentUser.name : undefined,
        });
      }

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(
        'Could not save entry',
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
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Entry Category</Text>
              <View style={styles.categoryGrid}>
                {(Object.keys(CATEGORY_CONFIG) as EntryCategory[]).map((cat) => {
                  const config = CATEGORY_CONFIG[cat];
                  const active = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => handleCategoryChange(cat)}
                      style={[
                        styles.categoryOption,
                        {
                          borderColor: active ? config.color : colors.border,
                          backgroundColor: active ? `${config.color}15` : colors.card,
                        },
                      ]}>
                      <MaterialIcons name={config.icon} size={24} color={active ? config.color : colors.textSecondary} />
                      <Text style={[styles.categoryLabel, { color: active ? config.color : colors.textPrimary }]}>
                        {config.label}
                      </Text>
                      {active && <MaterialIcons name="check-circle" size={16} color={config.color} style={styles.categoryCheck} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>

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

            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Owner</Text>
              <View style={styles.payerGrid}>
                {ALLOWED_USERS.map((user) => {
                  const active = selectedOwnerId === user.id;
                  const isCurrentUser = currentUser?.id === user.id;
                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => setValue('ownerId', user.id, { shouldValidate: true, shouldDirty: true })}
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
                        {isCurrentUser ? 'Logged in user' : 'Select owner'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.ownerId && <Text style={styles.selectionError}>{errors.ownerId.message}</Text>}
            </View>

            {category === 'trip' && (
              <TripFormSection
                control={control as never}
                errors={errors}
                lastOdometer={lastOdometer}
                isDark={isDark}
                colors={colors}
              />
            )}

            {category === 'fuel' && (
              <FuelFormSection
                control={control as never}
                errors={errors}
                lastOdometer={lastOdometer}
                fullTankSelected={fullTankSelected}
                isDark={isDark}
                colors={colors}
              />
            )}

            {category === 'parking' && (
              <ParkingFormSection
                control={control as never}
                errors={errors}
                lastOdometer={lastOdometer}
                isDark={isDark}
                colors={colors}
              />
            )}

            {category === 'fasttag' && (
              <FastagFormSection
                control={control as never}
                errors={errors}
                lastOdometer={lastOdometer}
                isDark={isDark}
                colors={colors}
              />
            )}

            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={`SAVE ${CATEGORY_CONFIG[category].label.toUpperCase()} ENTRY`} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

