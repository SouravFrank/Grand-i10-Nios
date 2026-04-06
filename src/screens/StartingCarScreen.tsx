import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { AnimatedCarSvg } from '@/components/AnimatedCarSvg';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TripSuccessOverlay } from '@/components/TripSuccessOverlay';
import { useTripAnimations } from '@/hooks/useTripAnimations';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import { StartingCarFormValues, startingCarSchema } from '@/types/startingCarSchema';

type Props = NativeStackScreenProps<AppStackParamList, 'StartingCarModal'>;

export function StartingCarScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();

  // Store selections
  const {
    lastOdometerValue: lastOdometer, activeTrip, currentUser, entries,
    startTrip, endTrip, updateEntryOfflineFirst, deleteEntry
  } = useAppStore();

  const [sharedTripEnabled, setSharedTripEnabled] = useState(false);

  // Logic derivations
  const tripMode = route.params?.mode ?? 'start';
  const entryId = route.params?.entryId;
  const isEndingTrip = tripMode === 'end';
  const isRestartingTrip = tripMode === 'restart';
  const isEditing = tripMode === 'edit';
  const editingEntry = isEditing && entryId ? entries.find(e => e.id === entryId) : null;

  // UI Derivations
  const modeAccent = isEndingTrip ? '#EF4444' : isRestartingTrip ? '#F59E0B' : '#06126bff';
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const title = isEditing ? 'Edit Odometer' : isEndingTrip ? 'End Trip' : isRestartingTrip ? 'Start New Trip' : 'Start Trip';
  const buttonLabel = isEditing ? 'SAVE' : isEndingTrip ? 'END TRIP' : 'START TRIP';
  const description = isEditing ? 'Update your existing odometer reading and trip settings.' : isEndingTrip ? 'Enter the current odometer reading to close the active trip.' : isRestartingTrip ? 'Start a fresh trip if the previous trip was not ended.' : 'Enter the odometer reading before you move.';

  const formattedLastOdometer = String(lastOdometer).padStart(6, '0');
  const formattedTripStartOdometer = String(activeTrip?.startOdometer ?? lastOdometer).padStart(6, '0');

  // Animations Hook
  const { anims, showSuccess, playSuccessAnimation } = useTripAnimations(() => navigation.goBack());

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

  // Handlers
  const onSubmit = handleSubmit(async ({ odometer }) => {
    if (!currentUser) return Alert.alert('Session expired', 'Please login again.');
    if (isEndingTrip && !activeTrip) return Alert.alert('No active trip', 'Start a trip before trying to end it.'), navigation.goBack();

    const parsedOdometer = Number(odometer);

    if (parsedOdometer < lastOdometer) return Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
    if (parsedOdometer - lastOdometer > 500) return Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
    if (isEndingTrip && activeTrip && parsedOdometer < activeTrip.startOdometer) return Alert.alert('Invalid odometer', 'Trip end odometer cannot be less than the trip start reading.');

    try {
      const payload = { odometer: parsedOdometer, sharedTrip: sharedTripEnabled };
      if (isEditing && entryId) {
        await updateEntryOfflineFirst(entryId, payload);
      } else {
        const tripData = { userId: currentUser.id, userName: currentUser.name, ...payload };
        await (isEndingTrip ? endTrip(tripData) : startTrip(tripData));
      }

      void runSyncCycle();
      playSuccessAnimation();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDelete = () => {
    if (!entryId) return;
    Alert.alert('Delete Entry', 'Are you sure you want to delete this odometer reading?', [
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
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)', opacity: anims.overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      </Animated.View>

      <Animated.View style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.border, transform: [{ scale: anims.popupScale }], opacity: anims.popupOpacity }]}>

        {/* Animated Car */}
        <Animated.View style={[styles.carSvgWrap, { transform: [{ translateX: anims.carSlideX }], opacity: anims.carOpacity }]}>
          <AnimatedCarSvg width={220} height={70} animate={!showSuccess} accentColor={modeAccent} />
        </Animated.View>

        {/* Header */}
        <Animated.View style={{ transform: [{ translateY: anims.headerSlideY }], opacity: anims.headerOpacity }}>
          <View style={styles.headerRow}>
            <View style={[styles.iconStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: accentTone }]}>
                <MaterialCommunityIcons name="car-sports" size={20} color={modeAccent} />
              </View>
              <View style={styles.iconCopy}>
                <Text style={[styles.iconTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.iconText, { color: colors.textSecondary }]}>{description}</Text>
              </View>
            </View>
            <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <MaterialIcons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Form Body */}
        <Animated.View style={{ transform: [{ translateY: anims.formSlideY }], opacity: anims.formOpacity }}>
          <View style={[styles.metaPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Last odometer</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formattedLastOdometer} KM</Text>
            {!isEditing && activeTrip && (
              <Text style={[styles.metaHint, { color: colors.textSecondary }]}>Active trip started at {formattedTripStartOdometer} km</Text>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            <Controller
              control={control}
              name="odometer"
              render={({ field: { onChange, value } }) => (
                <OdometerDigitInput label="Current Odometer" value={value} onChangeText={onChange} error={errors.odometer?.message} />
              )}
            />
          </View>

          <View style={[styles.sharedRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Pressable onPress={() => setSharedTripEnabled(!sharedTripEnabled)} hitSlop={10} style={styles.sharedRowInner}>
              <MaterialIcons name={sharedTripEnabled ? 'check-box' : 'check-box-outline-blank'} size={20} color={sharedTripEnabled ? modeAccent : colors.textSecondary} />
              <View style={styles.sharedRowCopy}>
                <Text style={[styles.sharedRowTitle, { color: colors.textPrimary }]}>Shared trip</Text>
                <Text style={[styles.sharedRowSubtitle, { color: colors.textSecondary }]}>Show this trip in both users timeline.</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.actionRow, { transform: [{ translateY: anims.buttonSlideY }], opacity: anims.buttonOpacity }]}>
          {isEditing && (
            <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <PrimaryButton label={buttonLabel} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
          </View>
        </Animated.View>

        {/* Success Overlay */}
        {showSuccess && (
          <TripSuccessOverlay
            isEditing={isEditing} isEndingTrip={isEndingTrip} modeAccent={modeAccent}
            opacity={anims.successOpacity} scale={anims.successScale} checkScale={anims.checkScale}
          />
        )}
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}

// Keep the remaining styles here (only removing the ones that moved to TripSuccessOverlay)
const styles = StyleSheet.create({
  overlay: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 40 },
  popup: { borderWidth: 1, borderRadius: 28, padding: 24, gap: 16, minHeight: 400, justifyContent: 'center', overflow: 'hidden' },
  carSvgWrap: { alignSelf: 'center', marginBottom: -4, marginTop: -8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconStrip: { flex: 1, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconCopy: { flex: 1, gap: 2 },
  iconTitle: { fontSize: 15, fontWeight: '700' },
  iconText: { fontSize: 12, lineHeight: 18 },
  metaPanel: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  metaValue: { fontSize: 20, fontWeight: '800' },
  metaHint: { fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  primaryAction: { flex: 1, height: 56, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  deleteBtn: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sharedRow: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12 },
  sharedRowInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sharedRowCopy: { flex: 1, gap: 2 },
  sharedRowTitle: { fontSize: 14, fontWeight: '700' },
  sharedRowSubtitle: { fontSize: 12, lineHeight: 16 },
});