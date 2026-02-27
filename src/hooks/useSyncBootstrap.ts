import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';

export function useSyncBootstrap() {
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
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
      setNetworkStatus(Boolean(networkState.isConnected && networkState.isInternetReachable !== false));
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
  }, [bootstrapAuth, ensureDemoData, isHydrated, runIntegrityCheck, setNetworkStatus]);
}
