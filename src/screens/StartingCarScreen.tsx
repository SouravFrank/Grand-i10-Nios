import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { z } from 'zod';

import { AnimatedCarSvg } from '@/components/AnimatedCarSvg';
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

  // ── Entrance Animations ──────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.88)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const carSlideX = useRef(new Animated.Value(-80)).current;
  const carOpacity = useRef(new Animated.Value(0)).current;
  const headerSlideY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formSlideY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlideY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      // Overlay fade
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Popup scale in
      Animated.parallel([
        Animated.spring(popupScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      // Car drives in from left
      Animated.parallel([
        Animated.spring(carSlideX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 9,
        }),
        Animated.timing(carOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Header appears
      Animated.parallel([
        Animated.spring(headerSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      // Form slides up
      Animated.parallel([
        Animated.spring(formSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      // Button appears
      Animated.parallel([
        Animated.spring(buttonSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [overlayOpacity, popupScale, popupOpacity, carSlideX, carOpacity, headerSlideY, headerOpacity, formSlideY, formOpacity, buttonSlideY, buttonOpacity]);

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

  const playSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      navigation.goBack();
    });
  };

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

      void runSyncCycle();
      playSuccessAnimation();
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

  // Mode-specific accent color for the car
  const modeAccent = isEndingTrip ? '#EF4444' : isRestartingTrip ? '#F59E0B' : '#10B981';

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={styles.overlay}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      bounces={false}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)',
            opacity: overlayOpacity,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      </Animated.View>

      <Animated.View
        style={[
          styles.popup,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            transform: [{ scale: popupScale }],
            opacity: popupOpacity,
          },
        ]}
      >
        {/* Animated car SVG driving in */}
        <Animated.View
          style={[
            styles.carSvgWrap,
            {
              transform: [{ translateX: carSlideX }],
              opacity: carOpacity,
            },
          ]}
        >
          <AnimatedCarSvg
            width={220}
            height={70}
            animate={!showSuccess}
            accentColor={modeAccent}
          />
        </Animated.View>

        {/* Header */}
        <Animated.View
          style={{
            transform: [{ translateY: headerSlideY }],
            opacity: headerOpacity,
          }}
        >
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

            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <MaterialIcons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Form section */}
        <Animated.View
          style={{
            transform: [{ translateY: formSlideY }],
            opacity: formOpacity,
          }}
        >
          <View style={[styles.metaPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Last odometer</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formattedLastOdometer} km</Text>
            {!isEditing && activeTrip ? (
              <Text style={[styles.metaHint, { color: colors.textSecondary }]}>
                Active trip started at {formattedTripStartOdometer} km
              </Text>
            ) : null}
          </View>

          <View style={{ marginTop: 16 }}>
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
          </View>

          <View style={[styles.sharedRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Pressable
              onPress={() => setSharedTripEnabled((prev) => !prev)}
              hitSlop={10}
              style={styles.sharedRowInner}>
              <MaterialIcons
                name={sharedTripEnabled ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={sharedTripEnabled ? modeAccent : colors.textSecondary}
              />
              <View style={styles.sharedRowCopy}>
                <Text style={[styles.sharedRowTitle, { color: colors.textPrimary }]}>Shared trip</Text>
                <Text style={[styles.sharedRowSubtitle, { color: colors.textSecondary }]}>
                  Show this trip in both users timeline.
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View
          style={[
            styles.actionRow,
            {
              transform: [{ translateY: buttonSlideY }],
              opacity: buttonOpacity,
            },
          ]}
        >
          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <MaterialIcons name="delete-outline" size={24} color={isDark ? '#FCA5A5' : '#EF4444'} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton label={buttonLabel} onPress={onSubmit} loading={isSubmitting} style={styles.primaryAction} />
          </View>
        </Animated.View>

        {/* Success overlay */}
        {showSuccess ? (
          <Animated.View
            style={[
              styles.successOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.successCircle,
                {
                  backgroundColor: modeAccent,
                  transform: [{ scale: checkScale }],
                },
              ]}
            >
              <MaterialIcons
                name={isEndingTrip ? 'flag' : 'directions-car'}
                size={36}
                color="#FFFFFF"
              />
            </Animated.View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              {isEditing ? 'Updated!' : isEndingTrip ? 'Trip Ended!' : 'Trip Started!'}
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {isEditing
                ? 'Odometer reading has been updated.'
                : isEndingTrip
                  ? 'Your trip has been recorded successfully.'
                  : 'Drive safe! Your trip is being tracked.'}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  popup: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    minHeight: 400,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  carSvgWrap: {
    alignSelf: 'center',
    marginBottom: -4,
    marginTop: -8,
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
    marginTop: 12,
  },
  primaryAction: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  // ── Success Overlay ──
  successOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
