import { get, orderByChild, query, ref, set, startAt } from 'firebase/database';

import { getFirebaseDb } from '@/config/firebase';
import type { CarSpec, EntryRecord, RemoteEntryDocument } from '@/types/models';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

const ENTRIES_COLLECTION = 'carEntries';
const CAR_SPEC_PATH = 'carMeta/carSpec';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const filteredEntries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return Object.fromEntries(filteredEntries) as T;
}

export async function pushEntryToRealtimeDb(entry: EntryRecord): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const payload: RemoteEntryDocument = {
    id: entry.id,
    type: entry.type,
    userId: entry.userId,
    userName: entry.userName,
    odometer: entry.odometer,
    fuelAmount: entry.fuelAmount,
    fuelLiters: entry.fuelLiters,
    fullTank: entry.fullTank,
    sharedTrip: entry.sharedTrip,
    sharedTripMarkedById: entry.sharedTripMarkedById,
    sharedTripMarkedByName: entry.sharedTripMarkedByName,
    expenseCategory: entry.expenseCategory,
    expenseTitle: entry.expenseTitle,
    cost: entry.cost,
    specUpdatedFields: entry.specUpdatedFields,
    createdAt: entry.createdAt,
  };
  const sanitizedPayload = stripUndefined(payload);

  try {
    syncLog('realtime_push_entry_start', { entryId: entry.id, createdAt: entry.createdAt });
    await set(ref(db, `${ENTRIES_COLLECTION}/${entry.id}`), sanitizedPayload);
    syncLog('realtime_push_entry_success', { entryId: entry.id });
  } catch (error) {
    syncError('realtime_push_entry_failed', {
      entryId: entry.id,
      ...toErrorPayload(error),
    });
    throw error;
  }
}

export async function pullEntriesFromRealtimeDb(since?: number): Promise<RemoteEntryDocument[]> {
  const db = getFirebaseDb();
  if (!db) {
    syncWarn('realtime_pull_entries_skipped_no_db');
    return [];
  }

  const entriesRef = ref(db, ENTRIES_COLLECTION);
  const entriesQuery =
    typeof since === 'number'
      ? query(entriesRef, orderByChild('createdAt'), startAt(since))
      : query(entriesRef, orderByChild('createdAt'));

  try {
    syncLog('realtime_pull_entries_start', { since: since ?? null });
    const snapshot = await get(entriesQuery);
    if (!snapshot.exists()) {
      syncLog('realtime_pull_entries_empty', { since: since ?? null });
      return [];
    }

    const raw = snapshot.val() as Record<string, RemoteEntryDocument | undefined>;
    const entries = Object.values(raw)
      .filter((entry): entry is RemoteEntryDocument => Boolean(entry))
      .sort((a, b) => b.createdAt - a.createdAt);
    syncLog('realtime_pull_entries_success', { count: entries.length, since: since ?? null });
    return entries;
  } catch (error) {
    syncError('realtime_pull_entries_failed', {
      since: since ?? null,
      ...toErrorPayload(error),
    });
    throw error;
  }
}

export async function pushCarSpecToRealtimeDb(carSpec: CarSpec): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  try {
    syncLog('realtime_push_car_spec_start');
    await set(ref(db, CAR_SPEC_PATH), carSpec);
    syncLog('realtime_push_car_spec_success');
  } catch (error) {
    syncError('realtime_push_car_spec_failed', toErrorPayload(error));
    throw error;
  }
}

export async function pullCarSpecFromRealtimeDb(): Promise<CarSpec | null> {
  const db = getFirebaseDb();
  if (!db) {
    syncWarn('realtime_pull_car_spec_skipped_no_db');
    return null;
  }

  try {
    syncLog('realtime_pull_car_spec_start');
    const snapshot = await get(ref(db, CAR_SPEC_PATH));
    if (!snapshot.exists()) {
      syncLog('realtime_pull_car_spec_empty');
      return null;
    }

    syncLog('realtime_pull_car_spec_success');
    return snapshot.val() as CarSpec;
  } catch (error) {
    syncError('realtime_pull_car_spec_failed', toErrorPayload(error));
    throw error;
  }
}
