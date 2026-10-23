import {
  ensureAnonymousFirebaseAuth,
  getFirebaseConfigErrorMessage,
  getFirebaseDb,
} from "@/config/firebase";
import {
  pullDocumentMetadataFromRealtimeDb,
  pullSingleDocumentFromRealtimeDb,
} from "@/services/realtime/documentsRepository";
import {
  canUpdateCarSpecFieldsRemotely,
  pullCarSpecFromRealtimeDb,
  pullEntriesFromRealtimeDb,
  pushCarSpecFieldsToRealtimeDb,
  pushCarSpecToRealtimeDb,
  pushEntryToRealtimeDb,
} from "@/services/realtime/entriesRepository";
import {
  pullMileageFromRealtimeDb,
  pullSettlementsFromRealtimeDb,
  pushMileageToRealtimeDb,
  pushSettlementsToRealtimeDb,
} from "@/services/realtime/settlementRepository";
import {
  getAllLocalDocuments,
  saveDocumentLocally,
} from "@/services/storage/localDocuments";
import { useAppStore } from "@/store/useAppStore";
import type { CarDocumentKey, CarSpec, PendingQueueItem } from "@/types/models";
import {
  syncError,
  syncLog,
  syncWarn,
  toErrorPayload,
} from "@/utils/syncLogger";

function buildFailedQueueItem(queueItem: PendingQueueItem): PendingQueueItem {
  return {
    entryId: queueItem.entryId,
    retries: queueItem.retries + 1,
    lastAttemptAt: Date.now(),
  };
}

function getSyncFailureMessage(error: unknown): string {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown sync error";
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;
  const normalizedMessage = errorMessage.toLowerCase();

  if (
    errorCode === "PERMISSION_DENIED" ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Sync access denied. Check Firebase Realtime Database rules for /carEntries and /carMeta/carSpec, and ensure anonymous users are allowed.";
  }

  return errorMessage;
}

let inFlightSyncCycle: Promise<void> | null = null;

function diffCarSpecAgainstBaseline(
  local: CarSpec,
  baseline: CarSpec,
): Partial<CarSpec> {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(local) as (keyof CarSpec)[]) {
    if (key === "tyreSetup") {
      if (
        JSON.stringify(local.tyreSetup) !== JSON.stringify(baseline.tyreSetup)
      ) {
        changes.tyreSetup = local.tyreSetup;
      }
      continue;
    }

    if (local[key] !== baseline[key]) {
      changes[key] = local[key];
    }
  }
  return changes as Partial<CarSpec>;
}

async function runSyncCycleInternal(): Promise<void> {
  const initialState = useAppStore.getState();
  syncLog("sync_cycle_start", {
    isOnline: initialState.isOnline,
    isSyncing: initialState.isSyncing,
    queueLength: initialState.pendingQueue.length,
    localEntries: initialState.entries.length,
    syncStatus: initialState.syncStatus,
  });

  if (!initialState.isOnline) {
    syncWarn("sync_cycle_skipped", { reason: "offline" });
    return;
  }

  if (initialState.isSyncing) {
    syncWarn("sync_cycle_skipped", { reason: "already_syncing" });
    return;
  }

  initialState.setSyncing();

  if (!getFirebaseDb()) {
    syncWarn("sync_cycle_failed_no_firebase_db");
    useAppStore
      .getState()
      .setSyncOutcome(
        "failed",
        `Sync not configured. ${getFirebaseConfigErrorMessage()}`,
      );
    return;
  }

  const authState = await ensureAnonymousFirebaseAuth();
  if (!authState.ok) {
    syncWarn("sync_cycle_failed_auth", { reason: authState.reason });
    useAppStore
      .getState()
      .setSyncOutcome(
        "failed",
        `Firebase anonymous auth failed: ${authState.reason}`,
      );
    return;
  }

  const cycleState = useAppStore.getState();
  const queueSnapshot = [...cycleState.pendingQueue];
  syncLog("sync_cycle_queue_snapshot", { queueLength: queueSnapshot.length });

  try {
    syncLog("sync_cycle_pull_remote_entries_before_push_start");
    const remoteEntriesBeforePush = await pullEntriesFromRealtimeDb();
    syncLog("sync_cycle_pull_remote_entries_before_push_success", {
      remoteCount: remoteEntriesBeforePush.length,
    });
    const remoteEntriesById = new Map(
      remoteEntriesBeforePush.map((entry) => [entry.id, entry]),
    );

    const entriesMap = new Map(
      cycleState.entries.map((entry) => [entry.id, entry]),
    );
    const syncedIds: string[] = [];
    const failedQueue: PendingQueueItem[] = [];

    for (const queueItem of queueSnapshot) {
      const entry = entriesMap.get(queueItem.entryId);
      if (!entry) {
        syncWarn("sync_cycle_missing_entry_for_queue_item", {
          entryId: queueItem.entryId,
          retries: queueItem.retries,
        });
        failedQueue.push(buildFailedQueueItem(queueItem));
        continue;
      }

      const alreadyExistsOnServer = remoteEntriesById.has(entry.id);
      const existedOnServerEarlier = Boolean(
        entry.lastSyncedAt ?? entry.synced,
      );

      // Check if local entry has been modified since last sync
      // For edited entries, check if they were updated after last sync
      const localModifiedAfterSync =
        existedOnServerEarlier && (!entry.lastSyncedAt || !entry.synced);

      // If local entry was modified after last sync, push the update
      if (localModifiedAfterSync) {
        syncLog("sync_cycle_push_modified_entry", {
          entryId: entry.id,
          localCreatedAt: entry.createdAt,
          lastSyncedAt: entry.lastSyncedAt,
        });
      } else if (alreadyExistsOnServer || existedOnServerEarlier) {
        syncLog("sync_cycle_skip_local_entry_server_authoritative", {
          entryId: entry.id,
          reason: alreadyExistsOnServer
            ? "remote_entry_exists"
            : "remote_entry_missing_after_prior_sync",
        });
        continue;
      }

      try {
        syncLog("sync_cycle_push_entry_start", {
          entryId: entry.id,
          retries: queueItem.retries,
        });
        await pushEntryToRealtimeDb(entry);
        syncLog("sync_cycle_push_entry_success", { entryId: entry.id });
        syncedIds.push(entry.id);
      } catch (error) {
        syncError("sync_cycle_push_entry_failed", {
          entryId: entry.id,
          retries: queueItem.retries,
          ...toErrorPayload(error),
        });
        failedQueue.push(buildFailedQueueItem(queueItem));
      }
    }

    if (syncedIds.length > 0) {
      syncLog("sync_cycle_mark_entries_synced", { count: syncedIds.length });
      useAppStore.getState().markEntriesSynced(syncedIds);
    }

    syncLog("sync_cycle_update_failed_queue", {
      failedQueueLength: failedQueue.length,
    });
    useAppStore.getState().updatePendingQueue(failedQueue);

    syncLog("sync_cycle_pull_remote_entries_start");
    const remoteEntries = await pullEntriesFromRealtimeDb();
    syncLog("sync_cycle_pull_remote_entries_success", {
      remoteCount: remoteEntries.length,
    });
    await useAppStore.getState().mergeRemoteEntries(remoteEntries);
    syncLog("sync_cycle_merge_remote_entries_done", {
      mergedCount: remoteEntries.length,
    });

    syncLog("sync_cycle_pull_car_spec_start");
    const remoteCarSpec = await pullCarSpecFromRealtimeDb();
    // Read state AFTER the pull: a spec edit may have landed while awaiting.
    // Deciding from a pre-await snapshot would either overwrite that edit with
    // remote data or mark it synced without ever pushing it.
    const specState = useAppStore.getState();
    syncLog("sync_cycle_pull_car_spec_result", {
      hasRemoteCarSpec: Boolean(remoteCarSpec),
      carSpecDirty: specState.carSpecDirty,
    });

    const localCarSpec = specState.carSpec;

    if (remoteCarSpec && !specState.carSpecDirty) {
      syncLog("sync_cycle_replace_car_spec_from_remote");
      useAppStore.getState().replaceCarSpecFromRemote(remoteCarSpec);
      const normalizedState = useAppStore.getState();
      if (normalizedState.carSpecDirty) {
        const normalizedSpec = normalizedState.carSpec;
        syncLog("sync_cycle_push_normalized_car_spec_start");
        await pushCarSpecToRealtimeDb(normalizedSpec);
        syncLog("sync_cycle_push_normalized_car_spec_success");
        if (useAppStore.getState().carSpec === normalizedSpec) {
          useAppStore.getState().markCarSpecSynced(normalizedSpec);
        }
      }
    } else {
      const baseline = specState.lastSyncedCarSpec;

      if (
        remoteCarSpec &&
        baseline &&
        canUpdateCarSpecFieldsRemotely(remoteCarSpec)
      ) {
        syncLog("sync_cycle_push_car_spec_start", { mode: "fields" });
        const changes = diffCarSpecAgainstBaseline(localCarSpec, baseline);
        if (Object.keys(changes).length > 0) {
          // Write only the fields changed since the last sync so concurrent
          // edits from other devices in other fields survive.
          await pushCarSpecFieldsToRealtimeDb(changes);
        } else {
          // Dirty flag with no local delta (e.g. a pending normalization-only
          // heal from a previous cycle). Local holds nothing unique, so adopt
          // the remote spec; if normalization rewrites it, heal remote.
          useAppStore.getState().replaceCarSpecFromRemote(remoteCarSpec);
          const replacedState = useAppStore.getState();
          if (replacedState.carSpecDirty) {
            const replacedSpec = replacedState.carSpec;
            await pushCarSpecToRealtimeDb(replacedSpec);
            if (useAppStore.getState().carSpec === replacedSpec) {
              useAppStore.getState().markCarSpecSynced(replacedSpec);
            }
          }
        }
      } else {
        // No baseline yet (first sync after install/update) or the remote
        // document is missing required fields: fall back to writing the
        // complete spec, which also heals legacy remote data.
        syncLog("sync_cycle_push_car_spec_start", { mode: "full" });
        await pushCarSpecToRealtimeDb(localCarSpec);
      }

      syncLog("sync_cycle_push_car_spec_success");
      // Only clear the dirty flag if no edit landed while pushing; otherwise
      // the newer edit would be marked synced without ever being uploaded.
      if (useAppStore.getState().carSpec === localCarSpec) {
        useAppStore.getState().markCarSpecSynced(localCarSpec);
      }
    }

    // ── Settlements & Mileage Sync ──────────────────────────────────────────
    console.log("[DEBUG] syncEngine: Starting settlements & mileage sync");
    try {
      syncLog("sync_cycle_settlements_start");
      console.log("[DEBUG] syncEngine: Pulling settlements from remote");
      const remoteSettlements = await pullSettlementsFromRealtimeDb();
      // Always get fresh state to ensure we have latest settlement updates
      const freshStateForSettlements = useAppStore.getState();
      const localSettlements = freshStateForSettlements.settledReportMonths;
      console.log("[DEBUG] syncEngine: Local settlements state", {
        monthCount: Object.keys(localSettlements).length,
        months: Object.keys(localSettlements),
      });

      if (remoteSettlements) {
        // Merge: if remote has newer data, use it; otherwise keep local
        console.log("[DEBUG] syncEngine: Remote settlements found, merging", {
          remoteMonthCount: Object.keys(remoteSettlements.settledReportMonths)
            .length,
        });
        const mergedSettlements = {
          ...remoteSettlements.settledReportMonths,
          ...localSettlements,
        };
        useAppStore.getState().replaceSettledReportMonths(mergedSettlements);
        syncLog("sync_cycle_settlements_merged", {
          count: Object.keys(mergedSettlements).length,
        });
      } else {
        console.log("[DEBUG] syncEngine: No remote settlements found");
      }

      // Always push fresh local state to ensure server has latest
      const stateToPush = useAppStore.getState().settledReportMonths;
      console.log("[DEBUG] syncEngine: Pushing settlements to remote", {
        monthCount: Object.keys(stateToPush).length,
      });
      await pushSettlementsToRealtimeDb(stateToPush);
      syncLog("sync_cycle_settlements_pushed", {
        monthCount: Object.keys(useAppStore.getState().settledReportMonths)
          .length,
      });
    } catch (settlementError) {
      console.error(
        "[DEBUG] syncEngine: Settlements sync error",
        settlementError,
      );
      syncWarn("sync_cycle_settlements_error", toErrorPayload(settlementError));
    }

    try {
      syncLog("sync_cycle_mileage_start");
      console.log("[DEBUG] syncEngine: Pulling mileage from remote");
      const remoteMileage = await pullMileageFromRealtimeDb();
      // Always get fresh state to ensure we have latest mileage updates
      const freshState = useAppStore.getState();
      const localMileage = freshState.reportMileageByMonth;
      console.log("[DEBUG] syncEngine: Local mileage state", {
        monthCount: Object.keys(localMileage).length,
        months: Object.keys(localMileage),
      });

      if (remoteMileage) {
        // Merge: if remote has newer data, use it; otherwise keep local
        console.log("[DEBUG] syncEngine: Remote mileage found, merging", {
          remoteMonthCount: Object.keys(remoteMileage.reportMileageByMonth)
            .length,
        });
        const mergedMileage = {
          ...remoteMileage.reportMileageByMonth,
          ...localMileage,
        };
        useAppStore.getState().replaceReportMileage(mergedMileage);
        syncLog("sync_cycle_mileage_merged", {
          count: Object.keys(mergedMileage).length,
        });
      } else {
        console.log("[DEBUG] syncEngine: No remote mileage found");
      }

      // Always push fresh local state to ensure server has latest
      const mileageToPush = useAppStore.getState().reportMileageByMonth;
      console.log("[DEBUG] syncEngine: Pushing mileage to remote", {
        monthCount: Object.keys(mileageToPush).length,
      });
      await pushMileageToRealtimeDb(mileageToPush);
      syncLog("sync_cycle_mileage_pushed", {
        monthCount: Object.keys(useAppStore.getState().reportMileageByMonth)
          .length,
      });
    } catch (mileageError) {
      console.error("[DEBUG] syncEngine: Mileage sync error", mileageError);
      syncWarn("sync_cycle_mileage_error", toErrorPayload(mileageError));
    }
    console.log("[DEBUG] syncEngine: Finished settlements & mileage sync");

    // ── Document Sync (non-blocking) ──────────────────────────────────────────
    try {
      syncLog("sync_cycle_documents_start");
      const remoteMeta = await pullDocumentMetadataFromRealtimeDb();
      const remoteKeys = Object.keys(remoteMeta) as CarDocumentKey[];
      syncLog("sync_cycle_documents_remote_meta", {
        count: remoteKeys.length,
        keys: remoteKeys,
      });

      if (remoteKeys.length > 0) {
        const localDocs = await getAllLocalDocuments();

        for (const docKey of remoteKeys) {
          const remote = remoteMeta[docKey];
          if (!remote) continue;

          const local = localDocs[docKey];
          const needsUpdate = !local || local.updatedAt < remote.uploadedAt;

          if (needsUpdate) {
            syncLog("sync_cycle_document_pull_needed", {
              docKey,
              localUpdatedAt: local?.updatedAt ?? null,
              remoteUploadedAt: remote.uploadedAt,
            });

            const fullDoc = await pullSingleDocumentFromRealtimeDb(docKey);
            if (fullDoc) {
              await saveDocumentLocally(
                docKey,
                fullDoc.data,
                fullDoc.fileName,
                fullDoc.mimeType,
              );
              syncLog("sync_cycle_document_saved_locally", {
                docKey,
                fileName: fullDoc.fileName,
              });
            }
          } else {
            syncLog("sync_cycle_document_up_to_date", { docKey });
          }
        }
      }

      syncLog("sync_cycle_documents_done");
    } catch (docError) {
      // Document sync failures should not break the main sync cycle
      syncWarn("sync_cycle_documents_error", toErrorPayload(docError));
    }

    const hasPending = useAppStore.getState().pendingQueue.length > 0;
    syncLog("sync_cycle_finish", {
      hasPending,
      finalQueueLength: useAppStore.getState().pendingQueue.length,
      resultStatus: hasPending ? "failed" : "synced",
    });
    useAppStore
      .getState()
      .setSyncOutcome(
        hasPending ? "failed" : "synced",
        hasPending ? "Pending items queued." : null,
      );
  } catch (error) {
    syncError("sync_cycle_unhandled_error", toErrorPayload(error));
    useAppStore
      .getState()
      .setSyncOutcome("failed", getSyncFailureMessage(error));
  }
}

export function runSyncCycle(): Promise<void> {
  if (inFlightSyncCycle) {
    syncWarn("sync_cycle_join_existing_inflight");
    return inFlightSyncCycle;
  }

  inFlightSyncCycle = runSyncCycleInternal().finally(() => {
    inFlightSyncCycle = null;
  });

  return inFlightSyncCycle;
}
