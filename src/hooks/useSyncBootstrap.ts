import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

import { ensureAnonymousFirebaseAuth, getFirebaseConfigErrorMessage, getFirebaseDb } from '@/config/firebase';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

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

    syncLog('bootstrap_effect_start');
    let isMounted = true;

    const bootstrap = async () => {
      try {
        syncLog('bootstrap_step_start', { step: 'runIntegrityCheck' });
        await runIntegrityCheck();
        syncLog('bootstrap_step_done', { step: 'runIntegrityCheck' });

        syncLog('bootstrap_step_start', { step: 'ensureDemoData' });
        await ensureDemoData();
        syncLog('bootstrap_step_done', { step: 'ensureDemoData' });

        syncLog('bootstrap_step_start', { step: 'bootstrapAuth' });
        await bootstrapAuth();
        syncLog('bootstrap_step_done', { step: 'bootstrapAuth' });

        const networkState = await NetInfo.fetch();
        const online = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);
        syncLog('bootstrap_network_state', {
          isConnected: networkState.isConnected ?? null,
          isInternetReachable: networkState.isInternetReachable ?? null,
          computedOnline: online,
        });
        setNetworkStatus(online);

        if (!getFirebaseDb()) {
          syncWarn('bootstrap_firebase_db_missing');
          setSyncOutcome('failed', `Sync not configured. ${getFirebaseConfigErrorMessage()}`);
        } else if (online) {
          const authState = await ensureAnonymousFirebaseAuth();
          if (!authState.ok) {
            syncWarn('bootstrap_anonymous_auth_failed', { reason: authState.reason });
            setSyncOutcome('failed', `Firebase anonymous auth failed: ${authState.reason}`);
          }
        }

        syncLog('bootstrap_trigger_sync_cycle');
        void runSyncCycle();
      } catch (error) {
        syncError('bootstrap_failed', toErrorPayload(error));
      }
    };

    void bootstrap();

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!isMounted) {
        return;
      }

      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setNetworkStatus(online);
      syncLog('network_listener_update', {
        isConnected: state.isConnected ?? null,
        isInternetReachable: state.isInternetReachable ?? null,
        computedOnline: online,
      });

      if (online) {
        syncLog('network_listener_trigger_sync_cycle');
        void runSyncCycle();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [bootstrapAuth, ensureDemoData, isHydrated, runIntegrityCheck, setNetworkStatus, setSyncOutcome]);
}
