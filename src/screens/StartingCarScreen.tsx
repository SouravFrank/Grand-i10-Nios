import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, withSpring, withTiming } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { AnimatedCarSvg } from '@/components/AnimatedCarSvg';
import { AnimatedSwitch } from '@/components/AnimatedSwitch';
import { AppAlert } from '@/components/AppAlert';
import { GradientActionButton } from '@/components/GradientActionButton';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { TripSuccessOverlay } from '@/components/TripSuccessOverlay';
import { useTripAnimations } from '@/hooks/useTripAnimations';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { StartingCarFormValues, startingCarSchema } from '@/types/startingCarSchema';
import { dayjs, INDIA_DATE_FORMAT, mergeDateWithExistingTime } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'StartingCarModal'>;

const MODE_ACCENTS = {
  start: { base: '#10B981', deep: '#059669' },
  restart: { base: '#F59E0B', deep: '#D97706' },
  end: { base: '#F43F5E', deep: '#E11D48' },
  edit: { base: '#6366F1', deep: '#4F46E5' },
} as const;

export function StartingCarScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();

  // Store selections
  const {
    lastOdometerValue: lastOdometer, activeTrip, currentUser, entries,
    startTrip, endTrip, updateEntryOfflineFirst, deleteEntry
  } = useAppStore();

  const [sharedTripEnabled, setSharedTripEnabled] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Logic derivations
  const tripMode = route.params?.mode ?? 'start';
  const entryId = route.params?.entryId;
  const isEndingTrip = tripMode === 'end';
  const isRestartingTrip = tripMode === 'restart';
  const isEditing = tripMode === 'edit';
  const editingEntry = isEditing && entryId ? entries.find(e => e.id === entryId) : null;

  // UI Derivations
  const accent = MODE_ACCENTS[tripMode];
  const modeAccent = accent.base;
  const title = isEditing ? 'Edit Odometer' : isEndingTrip ? 'End Trip' : isRestartingTrip ? 'Start New Trip' : 'Start Trip';
  const buttonLabel = isEditing ? 'SAVE' : isEndingTrip ? 'END TRIP' : 'START TRIP';
  const description = isEditing ? 'Update your existing odometer reading and trip settings.' : isEndingTrip ? 'Enter the current odometer reading to close the active trip.' : isRestartingTrip ? 'Start a fresh trip if the previous trip was not ended.' : 'Enter the odometer reading before you move.';

  // Last-odometer strip is hidden for now — restore together with the
  // commented stat-card JSX in the render body.
  // const formattedLastOdometer = String(lastOdometer).padStart(6, '0');
  // const formattedTripStartOdometer = String(activeTrip?.startOdometer ?? lastOdometer).padStart(6, '0');
  // const hasActiveTripStat = !isEditing && Boolean(activeTrip);

  // Animations Hook
  const { showSuccess, playSuccessAnimation, sceneOpacity } = useTripAnimations(() => navigation.goBack());

  // Form Setup
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<StartingCarFormValues>({
    resolver: zodResolver(startingCarSchema),
    defaultValues: {
      odometer: isEditing && editingEntry ? String(editingEntry.odometer) : String(lastOdometer),
    },
  });

  useEffect(() => {
    if (isEditing && editingEntry) setSharedTripEnabled(Boolean(editingEntry.sharedTrip));
  }, [isEditing, editingEntry]);

  useEffect(() => {
    if (isEditing && editingEntry) {
      setEntryDate(new Date(editingEntry.createdAt));
    }
  }, [isEditing, editingEntry]);

  const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
    setIsDatePickerVisible(false);
  };

  // Handlers
  const onSubmit = handleSubmit(async ({ odometer }) => {
    if (!currentUser) return AppAlert.alert('Session expired', 'Please login again.');
    if (isEndingTrip && !activeTrip) return AppAlert.alert('No active trip', 'Start a trip before trying to end it.'), navigation.goBack();

    const parsedOdometer = Number(odometer);

    // Validation only applies when creating new entries, not when editing
    if (!isEditing) {
      if (parsedOdometer < lastOdometer) return AppAlert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      if (parsedOdometer - lastOdometer > 500) return AppAlert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      if (isEndingTrip && activeTrip && parsedOdometer < activeTrip.startOdometer) return AppAlert.alert('Invalid odometer', 'Trip end odometer cannot be less than the trip start reading.');
    }

    try {
      const payload = { odometer: parsedOdometer, sharedTrip: sharedTripEnabled };
      if (isEditing && entryId) {
        await updateEntryOfflineFirst(entryId, {
          ...payload,
          createdAt: editingEntry ? mergeDateWithExistingTime(entryDate, editingEntry.createdAt) : undefined,
        });
      } else {
        const tripData = { userId: currentUser.id, userName: currentUser.name, ...payload };
        await (isEndingTrip ? endTrip(tripData) : startTrip(tripData));
      }

      void runSyncCycle();
      playSuccessAnimation();
    } catch (error) {
      AppAlert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDelete = () => {
    if (!entryId) return;
    AppAlert.alert('Delete Entry', 'Are you sure you want to delete this odometer reading?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEntry(entryId).then(() => {
            navigation.goBack();
            void runSyncCycle();
          });
        },
      },
    ]);
  };

  return (
    <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlay} keyboardShouldPersistTaps="handled" enableOnAndroid bounces={false}>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(220)}
        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.74)' : 'rgba(15,23,42,0.45)', opacity: sceneOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      </Animated.View>

      {/* Popup shell: spring-scales in from below */}
      <Animated.View
        entering={() => {
          'worklet';
          return {
            initialValues: { opacity: 0, transform: [{ translateY: 42 }, { scale: 0.92 }] },
            animations: {
              opacity: withTiming(1, { duration: 220 }),
              transform: [
                { translateY: withSpring(0, { damping: 16, stiffness: 160 }) },
                { scale: withSpring(1, { damping: 15, stiffness: 170 }) },
              ],
            },
          };
        }}
        style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.border, opacity: sceneOpacity }]}
      >

        {/* Hero: accent wash bleeding to the modal's top/left/right edges.
            Negative margins cancel the popup padding; inner padding keeps
            the content aligned with the rest of the modal. */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[`${modeAccent}${isDark ? '2E' : '26'}`, `${colors.background}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <Animated.View entering={FadeIn.delay(120).duration(260)}>
              <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </Animated.View>
          </View>

          {/* Car drives in from the left */}
          <Animated.View
            entering={() => {
              'worklet';
              return {
                initialValues: { opacity: 0, transform: [{ translateX: -64 }] },
                animations: {
                  opacity: withTiming(1, { duration: 320 }),
                  transform: [{ translateX: withSpring(0, { damping: 12, stiffness: 150 }) }],
                },
              };
            }}
            style={styles.carWrap}
          >
            <AnimatedCarSvg
              width={264}
              height={109}
              driving={!showSuccess}
              emphasis={isEndingTrip ? 'taillight' : 'headlight'}
            />
          </Animated.View>
        </View>

        {/* Title block */}
        <Animated.View entering={FadeInDown.delay(160).springify().damping(16).stiffness(160)} style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </Animated.View>

        {/* Last-odometer strip (hidden for now — uncomment to restore)
        <Animated.View entering={FadeInDown.delay(220).springify().damping(16).stiffness(160)}>
          <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last Odometer</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formattedLastOdometer}</Text>
                <Text style={[styles.statUnit, { color: colors.textSecondary }]}>KM</Text>
              </View>
            </View>
            {hasActiveTripStat && (
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            )}
            {hasActiveTripStat && (
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trip Started At</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formattedTripStartOdometer}</Text>
                  <Text style={[styles.statUnit, { color: colors.textSecondary }]}>KM</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
        */}

        {isEditing ? (
          <Animated.View entering={FadeInDown.delay(220).springify().damping(16).stiffness(160)}>
            <View style={[styles.datePanel, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Pressable onPress={() => setIsDatePickerVisible(true)} style={styles.dateButton}>
                <View style={[styles.dateBadge, { backgroundColor: `${modeAccent}1F` }]}>
                  <MaterialIcons name="calendar-today" size={16} color={modeAccent} />
                </View>
                <View style={styles.dateCopy}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entry Date</Text>
                  <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dayjs(entryDate).format(INDIA_DATE_FORMAT)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>
              {isDatePickerVisible ? (
                <DateTimePicker
                  value={entryDate}
                  mode="date"
                  accentColor={Platform.OS === 'ios' ? colors.textPrimary : (isDark ? '#60A5FA' : '#2563EB')}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={handleDatePickerChange}
                  positiveButton={Platform.OS === 'android' ? { label: 'OK', textColor: isDark ? '#60A5FA' : '#2563EB' } : undefined}
                  negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: isDark ? '#94A3B8' : '#64748B' } : undefined}
                  textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {/* Form Body */}
        <Animated.View entering={FadeInDown.delay(280).springify().damping(16).stiffness(160)}>
          <Controller
            control={control}
            name="odometer"
            render={({ field: { onChange, value } }) => (
              <OdometerDigitInput label="Current Odometer" value={value} onChangeText={onChange} error={errors.odometer?.message} />
            )}
          />

          <Pressable onPress={() => setSharedTripEnabled(!sharedTripEnabled)} style={[styles.sharedRow, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 14 }]}>
            <View style={styles.sharedRowCopy}>
              <Text style={[styles.sharedRowTitle, { color: colors.textPrimary }]}>Shared trip</Text>
              <Text style={[styles.sharedRowSubtitle, { color: colors.textSecondary }]}>Show this trip in both users timeline.</Text>
            </View>
            <AnimatedSwitch value={sharedTripEnabled} onChange={setSharedTripEnabled} accent={modeAccent} accessibilityLabel="Shared trip" />
          </Pressable>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(340).springify().damping(16).stiffness(160)} style={styles.actionRow}>
          {isEditing && (
            <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', opacity: pressed ? 0.75 : 1 }]}>
              <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
            </Pressable>
          )}
          <GradientActionButton label={buttonLabel} onPress={onSubmit} loading={isSubmitting} accent={accent.base} accentDeep={accent.deep} />
        </Animated.View>

        {/* Success Overlay */}
        {showSuccess && (
          <TripSuccessOverlay
            isEditing={isEditing} isEndingTrip={isEndingTrip} modeAccent={modeAccent}
          />
        )}
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 40 },
  popup: { borderWidth: 1, borderRadius: 32, padding: 16, gap: 14, overflow: 'hidden' },

  // Hero — matches styles.popup padding (16) for the full-bleed cancel-out
  hero: { marginTop: -16, marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  closeBtn: { width: 32, height: 32, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  carWrap: { alignItems: 'center', marginTop: 2, marginBottom: -4 },

  // Title
  titleBlock: { gap: 4, paddingHorizontal: 4 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  description: { fontSize: 13, lineHeight: 18.5 },

  // Stats
  statCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  statCell: { flex: 1, gap: 4, justifyContent: 'center' },
  statDivider: { width: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  statValue: { fontSize: 19, fontWeight: '800', letterSpacing: 0.6 },
  statUnit: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },

  // Date
  datePanel: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginTop: 12 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBadge: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dateCopy: { flex: 1, gap: 2 },
  dateValue: { fontSize: 15, fontWeight: '700' },

  // Shared trip row
  sharedRow: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sharedRowCopy: { flex: 1, gap: 2 },
  sharedRowTitle: { fontSize: 14, fontWeight: '700' },
  sharedRowSubtitle: { fontSize: 12, lineHeight: 16 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  deleteBtn: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
