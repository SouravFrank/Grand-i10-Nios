import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAlert } from '@/components/AppAlert';
import { CarDisplayCard } from '@/components/CarDisplayCard';
import { CarInfoBottomSheet } from '@/components/CarInfoBottomSheet';
import { DashboardSummaryCard } from '@/components/DashboardSummaryCard';
import { HeroPill } from '@/components/home/HeroPill';
import { KeepTrackingPromo } from '@/components/home/KeepTrackingPromo';
import { QuickTile } from '@/components/home/QuickTile';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { CarSpec, CarSpecFieldUpdateSubmission } from '@/types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAppStore((state) => state.currentUser);
  const entries = useAppStore((state) => state.entries);
  const activeTrip = useAppStore((state) => state.activeTrip);
  const carSpec = useAppStore((state) => state.carSpec);
  const updateCarSpec = useAppStore((state) => state.updateCarSpec);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const lastOdometerValue = useAppStore((state) => state.lastOdometerValue);
  const pendingQueue = useAppStore((state) => state.pendingQueue);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const lastSyncError = useAppStore((state) => state.lastSyncError);
  const isOnline = useAppStore((state) => state.isOnline);
  const [carSheetVisible, setCarSheetVisible] = useState(false);
  const appVersion =
    Constants.expoConfig?.extra?.appVersion ??
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '1.0.0';

  // Screen entrance animations
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaSlideY = useRef(new Animated.Value(25)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void runSyncCycle();

    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(ctaSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ctaOpacity, ctaSlideY, footerOpacity]);

  const offlineBannerText = useMemo(() => {
    if (isOnline) {
      return null;
    }

    return pendingQueue.length > 0
      ? `OFFLINE MODE - ${pendingQueue.length} ${pendingQueue.length > 1 ? 'ENTRIES' : 'ENTRY'} PENDING`
      : 'OFFLINE MODE';
  }, [isOnline, pendingQueue.length]);

  // The bell dot is a real signal: something needs attention in the sync pipeline.
  const showBellDot = (!isOnline && pendingQueue.length > 0) || syncStatus === 'failed';

  const handleCarSpecSave = async (submission: CarSpecFieldUpdateSubmission) => {
    const { field, label, previousValue, value, odometer, cost, wheelAlignmentOdometer, entryDate } = submission;
    const updates: Partial<CarSpec> = { [field]: value };
    if (field === 'lastWheelAlignmentOn' && wheelAlignmentOdometer !== undefined) {
      updates.lastWheelAlignmentOdometer = wheelAlignmentOdometer;
    }
    updateCarSpec(updates);

    if (!currentUser) {
      return;
    }

    try {
      await addEntryOfflineFirst({
        type: 'spec_update',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer,
        cost,
        // The picked date becomes the entry's timeline date so backdated
        // spec updates are recorded as history entries.
        createdAt: entryDate,
        specUpdatedFields: [field],
        specUpdateDetails: [
          {
            field,
            label,
            previousValue,
            nextValue: value,
          },
        ],
      });
      void runSyncCycle();
    } catch {
      // Spec values are already saved locally; entry history sync failure should not block UI.
    }
  };

  const handleCopyVehicleNumber = async () => {
    try {
      await Clipboard.setStringAsync(carSpec.registrationNumber);
      AppAlert.alert('Copied', 'Vehicle number copied to clipboard.');
    } catch {
      AppAlert.alert('Copy failed', 'Could not copy vehicle number.');
    }
  };

  const quickActions = useMemo(() => [
    {
      key: 'fuel',
      title: 'ADD FUEL',
      subtitle: 'Log refuel details',
      icon: 'gas-station' as const,
      solid: '#2FA35C',
      tint: 'rgba(47,163,92,0.13)',
      onPress: () => navigation.navigate('FuelEntryModal'),
    },
    {
      key: 'expense',
      title: 'ADD EXPENSE',
      subtitle: 'Track other costs',
      icon: 'receipt' as const,
      solid: '#F57C00',
      tint: 'rgba(245,124,0,0.13)',
      onPress: () => navigation.navigate('ExpenseEntryModal'),
    },
    {
      key: 'timeline',
      title: 'Timeline',
      subtitle: 'View all entries',
      icon: 'chart-line' as const,
      solid: '#2E86F0',
      tint: 'rgba(46,134,240,0.11)',
      onPress: () => navigation.navigate('History'),
    },
    {
      key: 'report',
      title: 'Report',
      subtitle: 'Insights & analysis',
      icon: 'chart-bar' as const,
      solid: '#7C4DFF',
      tint: 'rgba(124,77,255,0.11)',
      onPress: () => navigation.navigate('Report'),
    },
  ], []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <CarDisplayCard
          currentUser={currentUser}
          registrationText={carSpec.registrationNumber}
          subtitle="Viraaj i10"
          topInset={insets.top}
          showBellDot={showBellDot}
          onPress={() => setCarSheetVisible(true)}
          onLongPressRegistration={() => void handleCopyVehicleNumber()}
          onPressBell={() => navigation.navigate('SyncLogs')}
          onPressSettings={() => setCarSheetVisible(true)}
        />

        <View style={styles.content}>
          {offlineBannerText ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>{offlineBannerText}</Text>
            </View>
          ) : null}

          <DashboardSummaryCard
            entries={entries}
            syncStatus={syncStatus}
            lastSyncError={lastSyncError}
            queuedCount={pendingQueue.length}
            isOnline={isOnline}
            onRetrySync={() => void runSyncCycle()}
          />

          <Animated.View style={[styles.ctaStack, { opacity: ctaOpacity, transform: [{ translateY: ctaSlideY }] }]}>
            {activeTrip ? (
              <>
                <HeroPill
                  label="END TRIP"
                  icon="flag-checkered"
                  onPress={() => navigation.navigate('StartingCarModal', { mode: 'end' })}
                />
                <HeroPill
                  label="START NEW TRIP"
                  icon="plus-circle-outline"
                  outlined
                  onPress={() => navigation.navigate('StartingCarModal', { mode: 'restart' })}
                />
              </>
            ) : (
              <HeroPill
                label="START TRIP"
                icon="steering"
                onPress={() => navigation.navigate('StartingCarModal', { mode: 'start' })}
              />
            )}

            <View style={styles.tileGrid}>
              <View style={styles.tileRow}>
                <QuickTile {...quickActions[0]} key={quickActions[0].key} />
                <QuickTile {...quickActions[1]} key={quickActions[1].key} />
              </View>
              <View style={styles.tileRow}>
                <QuickTile {...quickActions[2]} key={quickActions[2].key} />
                <QuickTile {...quickActions[3]} key={quickActions[3].key} />
              </View>
            </View>

            <KeepTrackingPromo onPress={() => navigation.navigate('HistoryEntryModal')} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.versionFooter,
            { opacity: footerOpacity, paddingBottom: Math.max(insets.bottom, 14) },
          ]}>
          <Pressable delayLongPress={250} onLongPress={() => navigation.navigate('SyncLogs')} hitSlop={8}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>App version {appVersion}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <CarInfoBottomSheet
        visible={carSheetVisible}
        onClose={() => setCarSheetVisible(false)}
        carSpec={carSpec}
        lastOdometer={lastOdometerValue}
        onSaveFieldEdit={(submission) => void handleCarSpecSave(submission)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingBottom: 10,
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 14,
  },
  offlineBanner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderColor: 'rgba(249,168,37,0.4)',
    backgroundColor: 'rgba(249,168,37,0.12)',
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#9A6A00',
    textAlign: 'center',
  },
  ctaStack: {
    gap: 12,
    width: '100%',
  },
  tileGrid: {
    gap: 12,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  versionFooter: {
    alignItems: 'center',
    paddingTop: 6,
  },
  versionText: {
    fontSize: 11.5,
    letterSpacing: 0.4,
  },
});
