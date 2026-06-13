import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, Easing, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { z } from 'zod';

import { AppAlert } from '@/components/AppAlert';
import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { getEntryOwnerId } from '@/utils/entryOwnership';

type Props = NativeStackScreenProps<AppStackParamList, 'FuelEntryModal'>;

const GRAND_I10_NIOS_TANK_CAPACITY_LITERS = 37;

// --- Zod Schema ---
const fuelSchema = z.object({
  odometer: z.string().trim().min(1, 'Odometer is required.').refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
  fuelAmount: z.string().trim().min(1, 'Fuel amount is required.').refine((value) => Number(value) > 0, 'Fuel amount must be positive.'),
  fuelLiters: z.string().trim().min(1, 'Fuel liters is required.').refine((value) => Number(value) > 0, 'Fuel liters must be positive.'),
  fullTank: z.boolean(),
  paidByUserId: z.string().trim().min(1, 'Select who paid.').refine((value) => ALLOWED_USERS.some((user) => user.id === value), 'Select a valid user.'),
}).superRefine((data, context) => {
  const liters = Number(data.fuelLiters);
  if (Number.isFinite(liters) && liters > GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: `Fuel liters cannot exceed ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`, path: ['fuelLiters'] });
  }
  if (data.fullTank && Number.isFinite(liters) && liters !== GRAND_I10_NIOS_TANK_CAPACITY_LITERS) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: `Full tank is fixed at ${GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L.`, path: ['fuelLiters'] });
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
  
  // Theme Colors - Boosted for liquid visibility
  const fuelColor = '#F59E0B'; // Signature Fuel Orange
  const liquidOrange = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.25)';
  const liquidPrimary = isDark ? `${colors.primary}25` : `${colors.primary}35`;
  
  const editingEntry = route.params?.entryId ? entries.find((entry) => entry.id === route.params?.entryId && entry.type === 'fuel') : undefined;
  const isEditing = Boolean(editingEntry);
  
  const [entryDate, setEntryDate] = useState(() => new Date(editingEntry?.createdAt ?? Date.now()));
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // --- Liquid & Entrance Animations ---
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const formSlide = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const orb1Scale = useRef(new Animated.Value(1)).current;
  const orb1TranslateY = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(1)).current;
  const orb2TranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(headerSlide, { toValue: 0, tension: 40, friction: 6, useNativeDriver: true }),
      Animated.spring(formSlide, { toValue: 0, tension: 30, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();

    // Infinite breathing/liquid pulse for ORB 1 (Orange)
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Scale, { toValue: 1.2, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb1Scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orb1TranslateY, { toValue: 30, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb1TranslateY, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();

    // Infinite breathing/liquid pulse for ORB 2 (Primary Brand Color)
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb2Scale, { toValue: 1.3, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb2Scale, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orb2TranslateX, { toValue: -40, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(orb2TranslateX, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();
  }, [headerSlide, formSlide, opacity, orb1Scale, orb1TranslateY, orb2Scale, orb2TranslateX]);

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FuelForm>({
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
    if (fullTankSelected) setValue('fuelLiters', String(GRAND_I10_NIOS_TANK_CAPACITY_LITERS), { shouldDirty: true, shouldValidate: true });
  }, [fullTankSelected, setValue]);

  useEffect(() => {
    if (!isEditing && currentUser && !selectedPaidByUserId) setValue('paidByUserId', currentUser.id, { shouldDirty: false, shouldValidate: true });
  }, [currentUser, isEditing, selectedPaidByUserId, setValue]);

  useEffect(() => {
    if (editingEntry) setEntryDate(new Date(editingEntry.createdAt));
  }, [editingEntry]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setEntryDate(selectedDate);
    setIsDatePickerVisible(false);
  };

  const onSubmit = handleSubmit(async ({ odometer, fuelAmount, fuelLiters, fullTank, paidByUserId }) => {
    if (!currentUser) return AppAlert.alert('Session expired', 'Please login again.');
    if (isEditing && !editingEntry) return AppAlert.alert('Entry not found', 'This fuel entry is no longer available.');
    if (editingEntry && getEntryOwnerId(editingEntry) !== currentUser.id) return AppAlert.alert('Edit not allowed', 'You can only edit your own fuel entries.');

    const selectedPayer = ALLOWED_USERS.find((user) => user.id === paidByUserId);
    if (!selectedPayer) return AppAlert.alert('Invalid payer', 'Select who paid for this fuel.');

    try {
      if (editingEntry) {
        await updateEntryOfflineFirst(editingEntry.id, {
          userId: selectedPayer.id,
          userName: selectedPayer.name,
          odometer: Number(odometer),
          fuelAmount: Number(fuelAmount),
          fuelLiters: Number(fuelLiters),
          fullTank,
        });
      } else {
        await addEntryOfflineFirst({
          type: 'fuel',
          userId: selectedPayer.id,
          userName: selectedPayer.name,
          odometer: Number(odometer),
          fuelAmount: Number(fuelAmount),
          fuelLiters: Number(fuelLiters),
          fullTank,
        });
      }
      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      AppAlert.alert(isEditing ? 'Could not update fuel entry' : 'Could not save fuel entry', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDelete = () => {
    if (!editingEntry) return;
    if (!currentUser || getEntryOwnerId(editingEntry) !== currentUser.id) return AppAlert.alert('Delete not allowed', 'You can only delete your own fuel entries.');
    AppAlert.alert('Delete Entry', 'Are you sure you want to delete this fuel entry?', [
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
      <KeyboardAwareScrollView style={styles.keyboardContainer} contentContainerStyle={styles.scrollContent} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} enableOnAndroid={true} enableAutomaticScroll={true} extraScrollHeight={120}>
        <View style={[styles.scrollContent, styles.container]}>
          
          {/* Dual Liquid Orbs */}
          <Animated.View pointerEvents="none" style={[styles.orb1, { backgroundColor: liquidOrange, transform: [{ scale: orb1Scale }, { translateY: orb1TranslateY }] }]} />
          <Animated.View pointerEvents="none" style={[styles.orb2, { backgroundColor: liquidPrimary, transform: [{ scale: orb2Scale }, { translateX: orb2TranslateX }] }]} />

          {/* Animated Header */}
          <Animated.View style={[styles.headerCard, { backgroundColor: colors.card, opacity, transform: [{ translateY: headerSlide }] }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>FUEL ENTRY</Text>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'Edit Log' : 'Refill Fuel'}</Text>
              </View>
              <View style={[styles.headerIcon, { backgroundColor: fuelColor }]}>
                <MaterialCommunityIcons name="gas-station" size={20} color="#fff" />
              </View>
            </View>
          </Animated.View>

          {/* Animated Form Body */}
          <Animated.View style={[styles.formCard, { backgroundColor: colors.card, opacity, transform: [{ translateY: formSlide }] }]}>
            
            {/* Payer Grid */}
            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paid By</Text>
              <View style={styles.payerGrid}>
                {ALLOWED_USERS.map((user) => {
                  const active = selectedPaidByUserId === user.id;
                  const isCurrentUser = currentUser?.id === user.id;
                  const userColor = user.name.toLowerCase() === 'ayan' ? '#3B82F6' : (user.name.toLowerCase() === 'sourav' ? '#8B5CF6' : colors.primary);

                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => setValue('paidByUserId', user.id, { shouldValidate: true, shouldDirty: true })}
                      style={[
                        styles.payerOption,
                        { backgroundColor: active ? `${userColor}15` : colors.backgroundSecondary },
                      ]}>
                      <View style={styles.payerOptionHead}>
                        <Text style={[styles.payerName, { color: active ? userColor : colors.textPrimary }]}>{user.name}</Text>
                        <MaterialIcons name={active ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={active ? userColor : colors.textSecondary} />
                      </View>
                      <Text style={[styles.payerMeta, { color: active ? userColor : colors.textSecondary }]}>
                        {isCurrentUser ? 'Logged in user' : 'Select payer'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.paidByUserId && <Text style={styles.selectionError}>{errors.paidByUserId.message}</Text>}
            </View>

            {/* Odometer & Metrics */}
            <View style={styles.fieldsGroup}>
              <Controller control={control} name="odometer" render={({ field: { onChange, value } }) => (
                <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.odoHead}>
                    <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>Odometer Snapshot</Text>
                    <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>{isEditing ? `Latest ${lastOdometer}` : `Previous ${lastOdometer}`}</Text>
                  </View>
                  <OdometerDigitInput label="Current Odometer" value={value} onChangeText={onChange} error={errors.odometer?.message} />
                </View>
              )} />

              <View style={styles.metricsRow}>
                <View style={styles.metricField}>
                  <Controller control={control} name="fuelAmount" render={({ field: { onChange, value } }) => (
                    <AppTextField label="Amount (₹)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 2000" error={errors.fuelAmount?.message} />
                  )} />
                </View>
                <View style={styles.metricField}>
                  <Controller control={control} name="fuelLiters" render={({ field: { onChange, value } }) => (
                    <AppTextField label="Liters (L)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 24.6" error={errors.fuelLiters?.message} editable={!fullTankSelected} />
                  )} />
                </View>
              </View>
            </View>

            {/* Full Tank Switch */}
            <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.switchCopy}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Full Tank</Text>
                <Text style={[styles.switchHint, { color: colors.textSecondary }]}>Fills {GRAND_I10_NIOS_TANK_CAPACITY_LITERS}L for Grand i10 Nios</Text>
              </View>
              <Controller control={control} name="fullTank" render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: fuelColor }} thumbColor={value ? '#fff' : colors.textSecondary} />
              )} />
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              {isEditing && (
                <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                  <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <PrimaryButton label={isEditing ? 'UPDATE ENTRY' : 'SAVE ENTRY'} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
              </View>
            </View>
          </Animated.View>

        </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { gap: 16, padding: 16, paddingBottom: 32, position: 'relative' },
  
  /* Liquid Orbs */
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -40, right: -60, zIndex: 0 },
  orb2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: 120, left: -40, zIndex: 0 },
  
  headerCard: { borderRadius: 24, padding: 16, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  headerEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  
  formCard: { borderRadius: 24, padding: 20, gap: 24, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  fieldsGroup: { gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  payerGrid: { flexDirection: 'row', gap: 12 },
  payerOption: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  payerOptionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  payerName: { fontSize: 16, fontWeight: '900' },
  payerMeta: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  selectionError: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  dateButton: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateCopy: { gap: 2 },
  dateLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  dateValue: { fontSize: 16, fontWeight: '800' },
  odoPanel: { borderRadius: 16, padding: 16, gap: 12 },
  odoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  odoPanelLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  odoPanelHint: { fontSize: 12, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  metricField: { flex: 1, minWidth: 0 },
  switchRow: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchCopy: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 14, fontWeight: '800' },
  switchHint: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryAction: { flex: 1, height: 56, borderRadius: 16 },
  deleteBtn: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
