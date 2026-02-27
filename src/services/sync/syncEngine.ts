import type { PendingQueueItem } from '@/types/models';
import { pullEntriesFromFirestore, pushEntryToFirestore } from '@/services/firestore/entriesRepository';
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
        await pushEntryToFirestore(entry);
        syncedIds.push(entry.id);
      } catch {
        failedQueue.push(buildFailedQueueItem(queueItem));
      }
    }

    if (syncedIds.length > 0) {
      useAppStore.getState().markEntriesSynced(syncedIds);
    }

    useAppStore.getState().updatePendingQueue(failedQueue);

    const latestState = useAppStore.getState();
    const remoteEntries = await pullEntriesFromFirestore(latestState.lastSyncTime ?? undefined);
    await useAppStore.getState().mergeRemoteEntries(remoteEntries);

    const hasPending = useAppStore.getState().pendingQueue.length > 0;
    useAppStore.getState().setSyncOutcome(hasPending ? 'failed' : 'synced', hasPending ? 'Pending items queued.' : null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    useAppStore.getState().setSyncOutcome('failed', message);
  }
}
