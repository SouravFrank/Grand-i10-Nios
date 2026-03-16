import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { OdometerDigitInput } from '@/components/OdometerDigitInput';
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
    .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
});

type FormValues = z.infer<typeof schema>;

export function StartingCarScreen({ navigation, route }: Props) {
  const { colors, isDark } = useAppTheme();
  const lastOdometer = useAppStore((state) => state.lastOdometerValue);
  const activeTrip = useAppStore((state) => state.activeTrip);
  const currentUser = useAppStore((state) => state.currentUser);
  const startTrip = useAppStore((state) => state.startTrip);
  const endTrip = useAppStore((state) => state.endTrip);
  const updateEntryOfflineFirst = useAppStore((state) => state.updateEntryOfflineFirst);
  const deleteEntry = useAppStore((state) => state.deleteEntry);
  const entries = useAppStore((state) => state.entries);
  const [sharedTripEnabled, setSharedTripEnabled] = useState(false);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const tripMode = route.params?.mode ?? 'start';
  const entryId = route.params?.entryId;
  const isEndingTrip = tripMode === 'end';
  const isRestartingTrip = tripMode === 'restart';
  const isEditing = tripMode === 'edit';
  const editingEntry = isEditing && entryId ? entries.find(e => e.id === entryId) : null;
  const title = isEditing ? 'Edit Odometer' : isEndingTrip ? 'End Trip' : isRestartingTrip ? 'Start New Trip' : 'Start Trip';
  const buttonLabel = isEditing ? 'SAVE' : isEndingTrip ? 'END TRIP' : 'START TRIP';
  const description = isEditing
    ? 'Update your existing odometer reading and trip settings.'
    : isEndingTrip
    ? 'Enter the current odometer reading to close the active trip.'
    : isRestartingTrip
      ? 'Start a fresh trip if the previous trip was not ended.'
      : 'Enter the odometer reading before you move.';
  const formattedLastOdometer = String(lastOdometer).padStart(6, '0');
  const formattedTripStartOdometer = String(activeTrip?.startOdometer ?? lastOdometer).padStart(6, '0');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      odometer: isEditing && editingEntry ? String(editingEntry.odometer) : String(lastOdometer),
    },
  });

  useEffect(() => {
    if (isEditing && editingEntry) {
        setSharedTripEnabled(Boolean(editingEntry.sharedTrip));
    }
  }, [isEditing, editingEntry]);

  const onSubmit = handleSubmit(async ({ odometer }) => {
    if (!currentUser) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }

    if (isEndingTrip && !activeTrip) {
      Alert.alert('No active trip', 'Start a trip before trying to end it.');
      navigation.goBack();
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
    if (isEndingTrip && activeTrip && parsedOdometer < activeTrip.startOdometer) {
      Alert.alert('Invalid odometer', 'Trip end odometer cannot be less than the trip start reading.');
      return;
    }

    try {
      if (isEditing && entryId) {
        await updateEntryOfflineFirst(entryId, {
            odometer: parsedOdometer,
            sharedTrip: sharedTripEnabled,
        });
      } else if (isEndingTrip) {
        await endTrip({
          userId: currentUser.id,
          userName: currentUser.name,
          odometer: parsedOdometer,
          sharedTrip: sharedTripEnabled,
        });
      } else {
        await startTrip({
          userId: currentUser.id,
          userName: currentUser.name,
          odometer: parsedOdometer,
          sharedTrip: sharedTripEnabled,
        });
      }

      navigation.goBack();
      void runSyncCycle();
    } catch (error) {
      Alert.alert(
        isEditing ? 'Could not update entry' : isEndingTrip ? 'Could not end trip' : 'Could not start trip',
        error instanceof Error ? error.message : 'Unknown error',
      );
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
    <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)' }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => navigation.goBack()} />

      <View style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: accentTone }]}>
              <MaterialCommunityIcons name="car-sports" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.iconCopy}>
              <Text style={[styles.iconTitle, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.iconText, { color: colors.textSecondary }]}>{description}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <MaterialIcons name="close" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={[styles.metaPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Last odometer</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formattedLastOdometer} km</Text>
          {!isEditing && activeTrip ? (
            <Text style={[styles.metaHint, { color: colors.textSecondary }]}>
              Active trip started at {formattedTripStartOdometer} km
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="odometer"
          render={({ field: { onChange, value } }) => (
            <OdometerDigitInput
              label="Current Odometer"
              value={value}
              onChangeText={onChange}
              error={errors.odometer?.message}
            />
          )}
        />

        <View style={[styles.sharedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setSharedTripEnabled((prev) => !prev)}
            hitSlop={10}
            style={styles.sharedRowInner}>
            <MaterialIcons
              name={sharedTripEnabled ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={sharedTripEnabled ? colors.textPrimary : colors.textSecondary}
            />
            <View style={styles.sharedRowCopy}>
              <Text style={[styles.sharedRowTitle, { color: colors.textPrimary }]}>Shared trip</Text>
              <Text style={[styles.sharedRowSubtitle, { color: colors.textSecondary }]}>
                Show this trip in both users timeline.
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
            </Pressable>
          ) : null}
          <PrimaryButton label={buttonLabel} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
        </View>
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
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconStrip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
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
  metaPanel: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metaHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
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
  sharedRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sharedRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sharedRowCopy: {
    flex: 1,
    gap: 2,
  },
  sharedRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sharedRowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
