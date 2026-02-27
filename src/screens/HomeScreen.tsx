import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CarDisplayCard } from '@/components/CarDisplayCard';
import { CarInfoBottomSheet } from '@/components/CarInfoBottomSheet';
import { DashboardSummaryCard } from '@/components/DashboardSummaryCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SharpButton } from '@/components/SharpButton';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const entries = useAppStore((state) => state.entries);
  const carSpec = useAppStore((state) => state.carSpec);
  const updateCarSpec = useAppStore((state) => state.updateCarSpec);
  const pendingQueue = useAppStore((state) => state.pendingQueue);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const isOnline = useAppStore((state) => state.isOnline);
  const securityIssue = useAppStore((state) => state.securityIssue);
  const [carSheetVisible, setCarSheetVisible] = useState(false);

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

  return (
    <ScreenContainer>
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
        />

        <DashboardSummaryCard
          latestEntry={latestEntry}
          syncStatus={syncStatus}
          queuedCount={pendingQueue.length}
          isOnline={isOnline}
          onRetrySync={() => void runSyncCycle()}
        />

        <View style={styles.ctaRow}>
          <SharpButton
            label="START THE CAR"
            variant="primary"
            iconName="steering"
            style={styles.primaryCtaButton}
            onPress={() => navigation.navigate('StartingCarModal')}
          />
          <SharpButton
            label="ADD FUEL"
            variant="secondary"
            iconName="fuel"
            style={styles.secondaryCtaButton}
            onPress={() => navigation.navigate('FuelEntryModal')}
          />
        </View>

        <Pressable onPress={() => navigation.navigate('History')} style={styles.historyWrap}>
          <Text style={[styles.historyLink, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>VIEW HISTORY</Text>
        </Pressable>

        {securityIssue ? <Text style={[styles.securityText, { color: colors.textSecondary }]}>{securityIssue}</Text> : null}
      </ScrollView>

      <CarInfoBottomSheet
        visible={carSheetVisible}
        onClose={() => setCarSheetVisible(false)}
        carSpec={carSpec}
        onSaveEdits={updateCarSpec}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 24,
  },
  offlineBanner: {
    borderWidth: 1,
    borderRadius: 2,
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
  primaryCtaButton: {
    flex: 1.65,
  },
  secondaryCtaButton: {
    flex: 1,
  },
  historyWrap: {
    alignItems: 'center',
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
});
