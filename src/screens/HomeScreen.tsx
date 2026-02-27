import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CarDisplayCard } from '@/components/CarDisplayCard';
import { CarInfoBottomSheet, type CarInfoField } from '@/components/CarInfoBottomSheet';
import { DashboardSummaryCard } from '@/components/DashboardSummaryCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SharpButton } from '@/components/SharpButton';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const carInfoFields: CarInfoField[] = [
  { label: 'Chassis Number', value: 'MA3E12S00N0001234' },
  { label: 'Registration Number', value: 'WB XX XX XXXX' },
  { label: 'Engine Number', value: 'K12N-A1B2C3D4' },
  { label: 'PUCC Valid Upto', value: '20 SEP 2026' },
  { label: 'Last Engine Oil Changed', value: '12 JAN 2026' },
  { label: 'Last Coolant Changed', value: '04 NOV 2025' },
];

export function HomeScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const entries = useAppStore((state) => state.entries);
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
        {offlineBannerText ? (
          <View style={[styles.offlineBanner, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.offlineText, { color: colors.textSecondary }]}>{offlineBannerText}</Text>
          </View>
        ) : null}

        <Text style={[styles.title, { color: colors.textPrimary }]}>GRAND i10 NIOS</Text>

        <CarDisplayCard registrationText="WB XX XX XXXX" onPress={() => setCarSheetVisible(true)} />

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
            style={styles.ctaButton}
            onPress={() => navigation.navigate('StartingCarModal')}
          />
          <SharpButton
            label="ADD FUEL"
            style={styles.ctaButton}
            onPress={() => navigation.navigate('FuelEntryModal')}
          />
        </View>

        <Pressable onPress={() => navigation.navigate('History')}>
          <Text style={[styles.historyLink, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>VIEW HISTORY</Text>
        </Pressable>

        {securityIssue ? <Text style={[styles.securityText, { color: colors.textSecondary }]}>{securityIssue}</Text> : null}
      </ScrollView>

      <CarInfoBottomSheet visible={carSheetVisible} onClose={() => setCarSheetVisible(false)} fields={carInfoFields} />
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  ctaButton: {
    flex: 1,
  },
  historyLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
    width: 110,
  },
  securityText: {
    fontSize: 12,
  },
});
