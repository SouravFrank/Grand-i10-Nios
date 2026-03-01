import { ensureAnonymousFirebaseAuth, getFirebaseDb } from '@/config/firebase';
import type { PendingQueueItem } from '@/types/models';
import {
  pullCarSpecFromRealtimeDb,
  pullEntriesFromRealtimeDb,
  pushCarSpecToRealtimeDb,
  pushEntryToRealtimeDb,
} from '@/services/realtime/entriesRepository';
import { useAppStore } from '@/store/useAppStore';

function buildFailedQueueItem(queueItem: PendingQueueItem): PendingQueueItem {
  return {
    entryId: queueItem.entryId,
    retries: queueItem.retries + 1,
    lastAttemptAt: Date.now(),
  };
}

export async function runSyncCycle(): Promise<void> {
  const state = useAppStore.getState();
  if (!state.isOnline || state.isSyncing) {
    return;
  }

  if (!getFirebaseDb()) {
    useAppStore.getState().setSyncOutcome('failed', 'Sync not configured. Firebase is not configured.');
    return;
  }

  const authState = await ensureAnonymousFirebaseAuth();
  if (!authState.ok) {
    useAppStore.getState().setSyncOutcome('failed', `Firebase anonymous auth failed: ${authState.reason}`);
    return;
  }

  const queueSnapshot = [...state.pendingQueue];
  state.setSyncing();

  try {
    const entriesMap = new Map(state.entries.map((entry) => [entry.id, entry]));
    const syncedIds: string[] = [];
    const failedQueue: PendingQueueItem[] = [];

    for (const queueItem of queueSnapshot) {
      const entry = entriesMap.get(queueItem.entryId);
      if (!entry) {
        continue;
      }

      try {
        await pushEntryToRealtimeDb(entry);
        syncedIds.push(entry.id);
      } catch {
        failedQueue.push(buildFailedQueueItem(queueItem));
      }
    }

    if (syncedIds.length > 0) {
      useAppStore.getState().markEntriesSynced(syncedIds);
    }

    useAppStore.getState().updatePendingQueue(failedQueue);

    const remoteEntries = await pullEntriesFromRealtimeDb();
    await useAppStore.getState().mergeRemoteEntries(remoteEntries);

    const currentState = useAppStore.getState();
    const remoteCarSpec = await pullCarSpecFromRealtimeDb();

    if (remoteCarSpec && !currentState.carSpecDirty) {
      useAppStore.getState().replaceCarSpecFromRemote(remoteCarSpec);
    } else {
      await pushCarSpecToRealtimeDb(currentState.carSpec);
      useAppStore.getState().markCarSpecSynced();
    }

    const hasPending = useAppStore.getState().pendingQueue.length > 0;
    useAppStore.getState().setSyncOutcome(hasPending ? 'failed' : 'synced', hasPending ? 'Pending items queued.' : null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    useAppStore.getState().setSyncOutcome('failed', message);
  }
}
