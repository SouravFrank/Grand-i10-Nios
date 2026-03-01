import { ensureAnonymousFirebaseAuth, getFirebaseDb } from '@/config/firebase';
import type { PendingQueueItem } from '@/types/models';
import {
  pullCarSpecFromRealtimeDb,
  pullEntriesFromRealtimeDb,
  pushCarSpecToRealtimeDb,
  pushEntryToRealtimeDb,
} from '@/services/realtime/entriesRepository';
import { useAppStore } from '@/store/useAppStore';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

function buildFailedQueueItem(queueItem: PendingQueueItem): PendingQueueItem {
  return {
    entryId: queueItem.entryId,
    retries: queueItem.retries + 1,
    lastAttemptAt: Date.now(),
  };
}

export async function runSyncCycle(): Promise<void> {
  const state = useAppStore.getState();
  syncLog('sync_cycle_start', {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    queueLength: state.pendingQueue.length,
    localEntries: state.entries.length,
    syncStatus: state.syncStatus,
  });

  if (!state.isOnline || state.isSyncing) {
    syncWarn('sync_cycle_skipped', { reason: !state.isOnline ? 'offline' : 'already_syncing' });
    return;
  }

  if (!getFirebaseDb()) {
    syncWarn('sync_cycle_failed_no_firebase_db');
    useAppStore.getState().setSyncOutcome('failed', 'Sync not configured. Firebase is not configured.');
    return;
  }

  const authState = await ensureAnonymousFirebaseAuth();
  if (!authState.ok) {
    syncWarn('sync_cycle_failed_auth', { reason: authState.reason });
    useAppStore.getState().setSyncOutcome('failed', `Firebase anonymous auth failed: ${authState.reason}`);
    return;
  }

  const queueSnapshot = [...state.pendingQueue];
  syncLog('sync_cycle_queue_snapshot', { queueLength: queueSnapshot.length });
  state.setSyncing();

  try {
    const entriesMap = new Map(state.entries.map((entry) => [entry.id, entry]));
    const syncedIds: string[] = [];
    const failedQueue: PendingQueueItem[] = [];

    for (const queueItem of queueSnapshot) {
      const entry = entriesMap.get(queueItem.entryId);
      if (!entry) {
        syncWarn('sync_cycle_missing_entry_for_queue_item', {
          entryId: queueItem.entryId,
          retries: queueItem.retries,
        });
        continue;
      }

      try {
        syncLog('sync_cycle_push_entry_start', { entryId: entry.id, retries: queueItem.retries });
        await pushEntryToRealtimeDb(entry);
        syncLog('sync_cycle_push_entry_success', { entryId: entry.id });
        syncedIds.push(entry.id);
      } catch (error) {
        syncError('sync_cycle_push_entry_failed', {
          entryId: entry.id,
          retries: queueItem.retries,
          ...toErrorPayload(error),
        });
        failedQueue.push(buildFailedQueueItem(queueItem));
      }
    }

    if (syncedIds.length > 0) {
      syncLog('sync_cycle_mark_entries_synced', { count: syncedIds.length });
      useAppStore.getState().markEntriesSynced(syncedIds);
    }

    syncLog('sync_cycle_update_failed_queue', { failedQueueLength: failedQueue.length });
    useAppStore.getState().updatePendingQueue(failedQueue);

    syncLog('sync_cycle_pull_remote_entries_start');
    const remoteEntries = await pullEntriesFromRealtimeDb();
    syncLog('sync_cycle_pull_remote_entries_success', { remoteCount: remoteEntries.length });
    await useAppStore.getState().mergeRemoteEntries(remoteEntries);
    syncLog('sync_cycle_merge_remote_entries_done', { mergedCount: remoteEntries.length });

    const currentState = useAppStore.getState();
    syncLog('sync_cycle_pull_car_spec_start');
    const remoteCarSpec = await pullCarSpecFromRealtimeDb();
    syncLog('sync_cycle_pull_car_spec_result', { hasRemoteCarSpec: Boolean(remoteCarSpec), carSpecDirty: currentState.carSpecDirty });

    if (remoteCarSpec && !currentState.carSpecDirty) {
      syncLog('sync_cycle_replace_car_spec_from_remote');
      useAppStore.getState().replaceCarSpecFromRemote(remoteCarSpec);
    } else {
      syncLog('sync_cycle_push_car_spec_start');
      await pushCarSpecToRealtimeDb(currentState.carSpec);
      syncLog('sync_cycle_push_car_spec_success');
      useAppStore.getState().markCarSpecSynced();
    }

    const hasPending = useAppStore.getState().pendingQueue.length > 0;
    syncLog('sync_cycle_finish', {
      hasPending,
      finalQueueLength: useAppStore.getState().pendingQueue.length,
      resultStatus: hasPending ? 'failed' : 'synced',
    });
    useAppStore.getState().setSyncOutcome(hasPending ? 'failed' : 'synced', hasPending ? 'Pending items queued.' : null);
  } catch (error) {
    syncError('sync_cycle_unhandled_error', toErrorPayload(error));
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    useAppStore.getState().setSyncOutcome('failed', message);
  }
}
