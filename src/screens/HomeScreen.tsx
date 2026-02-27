import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import type { AppStackParamList } from '@/navigation/types';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { dayjs } from '@/utils/day';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const entries = useAppStore((state) => state.entries);
  const pendingQueue = useAppStore((state) => state.pendingQueue);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const isOnline = useAppStore((state) => state.isOnline);
  const securityIssue = useAppStore((state) => state.securityIssue);

  const latestEntry = entries[0];

  useEffect(() => {
    void runSyncCycle();
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Last recorded odometer</Text>
          <Text style={styles.odometer}>{latestEntry ? `${latestEntry.odometer} km` : '-- km'}</Text>
          <Text style={styles.subtext}>
            Recorded date: {latestEntry ? dayjs(latestEntry.createdAt).format('DD MMM YYYY, hh:mm A') : 'No entries'}
          </Text>
          <Text style={styles.subtext}>
            Last updated: {latestEntry ? dayjs(latestEntry.createdAt).fromNow() : 'No local update'}
          </Text>
          <View style={styles.syncWrap}>
            <SyncStatusIndicator status={syncStatus} queuedCount={pendingQueue.length} isOnline={isOnline} />
            {syncStatus === 'syncing' ? <Text style={styles.syncText}>Sync in progress...</Text> : null}
          </View>
          {securityIssue ? <Text style={styles.securityText}>{securityIssue}</Text> : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Starting the Car" onPress={() => navigation.navigate('StartingCarModal')} />
          <PrimaryButton label="Add Fuel Entry" onPress={() => navigation.navigate('FuelEntryModal')} />
          <PrimaryButton
            label="View History"
            variant="secondary"
            onPress={() => navigation.navigate('History')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  odometer: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  syncWrap: {
    marginTop: 6,
    gap: 8,
  },
  syncText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  securityText: {
    marginTop: 4,
    color: colors.danger,
    fontSize: 12,
  },
  actions: {
    gap: 10,
  },
});
