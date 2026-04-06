import { ensureAnonymousFirebaseAuth, getFirebaseConfigErrorMessage, getFirebaseDb } from '@/config/firebase';
import type { CarDocumentKey, PendingQueueItem } from '@/types/models';
import {
  pullCarSpecFromRealtimeDb,
  pullEntriesFromRealtimeDb,
  pushCarSpecToRealtimeDb,
  pushEntryToRealtimeDb,
} from '@/services/realtime/entriesRepository';
import {
  pullDocumentMetadataFromRealtimeDb,
  pullSingleDocumentFromRealtimeDb,
} from '@/services/realtime/documentsRepository';
import { getAllLocalDocuments, saveDocumentLocally } from '@/services/storage/localDocuments';
import { useAppStore } from '@/store/useAppStore';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

function buildFailedQueueItem(queueItem: PendingQueueItem): PendingQueueItem {
  return {
    entryId: queueItem.entryId,
    retries: queueItem.retries + 1,
    lastAttemptAt: Date.now(),
  };
}

function getSyncFailureMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  const normalizedMessage = errorMessage.toLowerCase();

  if (errorCode === 'PERMISSION_DENIED' || normalizedMessage.includes('permission denied')) {
    return 'Sync access denied. Check Firebase Realtime Database rules for /carEntries and /carMeta/carSpec, and ensure anonymous users are allowed.';
  }

  return errorMessage;
}

let inFlightSyncCycle: Promise<void> | null = null;

async function runSyncCycleInternal(): Promise<void> {
  const initialState = useAppStore.getState();
  syncLog('sync_cycle_start', {
    isOnline: initialState.isOnline,
    isSyncing: initialState.isSyncing,
    queueLength: initialState.pendingQueue.length,
    localEntries: initialState.entries.length,
    syncStatus: initialState.syncStatus,
  });

  if (!initialState.isOnline) {
    syncWarn('sync_cycle_skipped', { reason: 'offline' });
    return;
  }

  if (initialState.isSyncing) {
    syncWarn('sync_cycle_skipped', { reason: 'already_syncing' });
    return;
  }

  initialState.setSyncing();

  if (!getFirebaseDb()) {
    syncWarn('sync_cycle_failed_no_firebase_db');
    useAppStore.getState().setSyncOutcome('failed', `Sync not configured. ${getFirebaseConfigErrorMessage()}`);
    return;
  }

  const authState = await ensureAnonymousFirebaseAuth();
  if (!authState.ok) {
    syncWarn('sync_cycle_failed_auth', { reason: authState.reason });
    useAppStore.getState().setSyncOutcome('failed', `Firebase anonymous auth failed: ${authState.reason}`);
    return;
  }

  const cycleState = useAppStore.getState();
  const queueSnapshot = [...cycleState.pendingQueue];
  syncLog('sync_cycle_queue_snapshot', { queueLength: queueSnapshot.length });

  try {
    const entriesMap = new Map(cycleState.entries.map((entry) => [entry.id, entry]));
    const syncedIds: string[] = [];
    const failedQueue: PendingQueueItem[] = [];

    for (const queueItem of queueSnapshot) {
      const entry = entriesMap.get(queueItem.entryId);
      if (!entry) {
        syncWarn('sync_cycle_missing_entry_for_queue_item', {
          entryId: queueItem.entryId,
          retries: queueItem.retries,
        });
        failedQueue.push(buildFailedQueueItem(queueItem));
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
      const normalizedState = useAppStore.getState();
      if (normalizedState.carSpecDirty) {
        syncLog('sync_cycle_push_normalized_car_spec_start');
        await pushCarSpecToRealtimeDb(normalizedState.carSpec);
        syncLog('sync_cycle_push_normalized_car_spec_success');
        useAppStore.getState().markCarSpecSynced();
      }
    } else {
      syncLog('sync_cycle_push_car_spec_start');
      await pushCarSpecToRealtimeDb(currentState.carSpec);
      syncLog('sync_cycle_push_car_spec_success');
      useAppStore.getState().markCarSpecSynced();
    }

    // ── Document Sync (non-blocking) ──────────────────────────────────────────
    try {
      syncLog('sync_cycle_documents_start');
      const remoteMeta = await pullDocumentMetadataFromRealtimeDb();
      const remoteKeys = Object.keys(remoteMeta) as CarDocumentKey[];
      syncLog('sync_cycle_documents_remote_meta', { count: remoteKeys.length, keys: remoteKeys });

      if (remoteKeys.length > 0) {
        const localDocs = await getAllLocalDocuments();

        for (const docKey of remoteKeys) {
          const remote = remoteMeta[docKey];
          if (!remote) continue;

          const local = localDocs[docKey];
          const needsUpdate = !local || local.updatedAt < remote.uploadedAt;

          if (needsUpdate) {
            syncLog('sync_cycle_document_pull_needed', {
              docKey,
              localUpdatedAt: local?.updatedAt ?? null,
              remoteUploadedAt: remote.uploadedAt,
            });

            const fullDoc = await pullSingleDocumentFromRealtimeDb(docKey);
            if (fullDoc) {
              await saveDocumentLocally(docKey, fullDoc.data, fullDoc.fileName, fullDoc.mimeType);
              syncLog('sync_cycle_document_saved_locally', { docKey, fileName: fullDoc.fileName });
            }
          } else {
            syncLog('sync_cycle_document_up_to_date', { docKey });
          }
        }
      }

      syncLog('sync_cycle_documents_done');
    } catch (docError) {
      // Document sync failures should not break the main sync cycle
      syncWarn('sync_cycle_documents_error', toErrorPayload(docError));
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
    useAppStore.getState().setSyncOutcome('failed', getSyncFailureMessage(error));
  }
}

export function runSyncCycle(): Promise<void> {
  if (inFlightSyncCycle) {
    syncWarn('sync_cycle_join_existing_inflight');
    return inFlightSyncCycle;
  }

  inFlightSyncCycle = runSyncCycleInternal().finally(() => {
    inFlightSyncCycle = null;
  });

  return inFlightSyncCycle;
}
