import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarDisplayCard } from '@/components/CarDisplayCard';
import { CarInfoBottomSheet } from '@/components/CarInfoBottomSheet';
import { DashboardSummaryCard } from '@/components/DashboardSummaryCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SharpButton } from '@/components/SharpButton';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { CarSpecFieldUpdateSubmission } from '@/types/models';

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
  const securityIssue = useAppStore((state) => state.securityIssue);
  const [carSheetVisible, setCarSheetVisible] = useState(false);
  const appVersion =
    Constants.expoConfig?.extra?.appVersion ??
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '1.0.0';

  const latestEntry = entries[0];

  useEffect(() => {
    void runSyncCycle();
  }, []);

  const offlineBannerText = useMemo(() => {
    if (isOnline) {
      return null;
    }

    return pendingQueue.length > 0
      ? `OFFLINE MODE - ${pendingQueue.length} ${pendingQueue.length > 1 ? 'ENTRIES' : 'ENTRY'} PENDING`
      : 'OFFLINE MODE';
  }, [isOnline, pendingQueue.length]);

  const handleCarSpecSave = async (submission: CarSpecFieldUpdateSubmission) => {
    const { field, label, previousValue, value, odometer, cost } = submission;
    updateCarSpec({ [field]: value });

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
      Alert.alert('Copied', 'Vehicle number copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy vehicle number.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome {currentUser?.name ?? 'User'}
          </Text>

          {offlineBannerText ? (
            <View style={[styles.offlineBanner, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.offlineText, { color: colors.textSecondary }]}>{offlineBannerText}</Text>
            </View>
          ) : null}

          <CarDisplayCard
            registrationText={carSpec.registrationNumber}
            subtitle={carSpec.model}
            onPress={() => setCarSheetVisible(true)}
            onLongPressRegistration={() => void handleCopyVehicleNumber()}
          />

          <DashboardSummaryCard
            latestEntry={latestEntry}
            syncStatus={syncStatus}
            lastSyncError={lastSyncError}
            queuedCount={pendingQueue.length}
            isOnline={isOnline}
            onRetrySync={() => void runSyncCycle()}
          />

          {activeTrip ? (
            <View style={[styles.tripBanner, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.tripBannerLabel, { color: colors.textSecondary }]}>ACTIVE TRIP</Text>
              <Text style={[styles.tripBannerValue, { color: colors.textPrimary }]}>Started at {activeTrip.startOdometer} km</Text>
            </View>
          ) : null}

          <View style={styles.ctaRow}>
            {activeTrip ? (
              <>
                <SharpButton
                  label="END TRIP"
                  variant="primary"
                  iconName="flag-checkered"
                  style={styles.equalCtaButton}
                  onPress={() => navigation.navigate('StartingCarModal', { mode: 'end' })}
                />
                <SharpButton
                  label="START NEW TRIP"
                  variant="secondary"
                  iconName="plus-circle-outline"
                  style={styles.equalCtaButton}
                  onPress={() => navigation.navigate('StartingCarModal', { mode: 'restart' })}
                />
              </>
            ) : (
              <>
                <SharpButton
                  label="START TRIP"
                  variant="primary"
                  iconName="steering"
                  style={styles.primaryCtaButton}
                  onPress={() => navigation.navigate('StartingCarModal', { mode: 'start' })}
                />
                <SharpButton
                  label="ADD FUEL"
                  variant="secondary"
                  iconName="fuel"
                  style={styles.secondaryCtaButton}
                  onPress={() => navigation.navigate('FuelEntryModal')}
                />
              </>
            )}
          </View>

          {activeTrip ? (
            <View style={styles.ctaRow}>
              <SharpButton
                label="ADD FUEL"
                variant="secondary"
                iconName="fuel"
                style={styles.equalCtaButton}
                onPress={() => navigation.navigate('FuelEntryModal')}
              />
              <SharpButton
                label="ADD EXPENSE"
                variant="secondary"
                iconName="wallet-plus-outline"
                style={styles.equalCtaButton}
                onPress={() => navigation.navigate('ExpenseEntryModal')}
              />
            </View>
          ) : (
            <SharpButton
              label="ADD EXPENSE"
              variant="secondary"
              iconName="wallet-plus-outline"
              onPress={() => navigation.navigate('ExpenseEntryModal')}
            />
          )}

          <Pressable onPress={() => navigation.navigate('History')} style={styles.historyWrap}>
            <View style={styles.historyRow}>
              <MaterialIcons name="history" size={16} color={colors.textPrimary} />
              <Text style={[styles.historyLink, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>
                VIEW HISTORY
              </Text>
            </View>
          </Pressable>

          {securityIssue ? <Text style={[styles.securityText, { color: colors.textSecondary }]}>{securityIssue}</Text> : null}
        </ScrollView>

        <Pressable
          delayLongPress={250}
          onLongPress={() => navigation.navigate('SyncLogs')}
          style={[
            styles.versionFooter,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>App version {appVersion}</Text>
        </Pressable>
      </View>

      <CarInfoBottomSheet
        visible={carSheetVisible}
        onClose={() => setCarSheetVisible(false)}
        carSpec={carSpec}
        lastOdometer={lastOdometerValue}
        onSaveFieldEdit={(submission) => void handleCarSpecSave(submission)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 20,
  },
  offlineBanner: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  offlineText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 2,
    alignSelf: 'center',
    textAlign: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  tripBanner: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  tripBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tripBannerValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryCtaButton: {
    flex: 1.65,
  },
  secondaryCtaButton: {
    flex: 1,
  },
  equalCtaButton: {
    flex: 1,
  },
  historyWrap: {
    alignItems: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  securityText: {
    fontSize: 12,
  },
  versionFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  versionText: {
    alignSelf: 'center',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
