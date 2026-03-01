import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

import { ensureAnonymousFirebaseAuth, getFirebaseDb } from '@/config/firebase';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';

export function useSyncBootstrap() {
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const setSyncOutcome = useAppStore((state) => state.setSyncOutcome);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const runIntegrityCheck = useAppStore((state) => state.runIntegrityCheck);
  const ensureDemoData = useAppStore((state) => state.ensureDemoData);
  const bootstrapAuth = useAppStore((state) => state.bootstrapAuth);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isMounted = true;

    const bootstrap = async () => {
      await runIntegrityCheck();
      await ensureDemoData();
      await bootstrapAuth();

      const networkState = await NetInfo.fetch();
      const online = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);
      setNetworkStatus(online);

      if (!getFirebaseDb()) {
        setSyncOutcome('failed', 'Sync not configured. Firebase is not configured.');
      } else if (online) {
        const authState = await ensureAnonymousFirebaseAuth();
        if (!authState.ok) {
          setSyncOutcome('failed', `Firebase anonymous auth failed: ${authState.reason}`);
        }
      }

      void runSyncCycle();
    };

    void bootstrap();

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!isMounted) {
        return;
      }

      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setNetworkStatus(online);

      if (online) {
        void runSyncCycle();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [bootstrapAuth, ensureDemoData, isHydrated, runIntegrityCheck, setNetworkStatus, setSyncOutcome]);
}
