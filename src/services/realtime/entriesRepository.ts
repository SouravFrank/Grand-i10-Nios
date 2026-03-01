import { get, orderByChild, query, ref, set, startAt } from 'firebase/database';

import { getFirebaseDb } from '@/config/firebase';
import type { EntryRecord, RemoteEntryDocument } from '@/types/models';

const ENTRIES_COLLECTION = 'carEntries';

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

  await set(ref(db, `${ENTRIES_COLLECTION}/${entry.id}`), payload);
}

export async function pullEntriesFromRealtimeDb(since?: number): Promise<RemoteEntryDocument[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }

  const entriesRef = ref(db, ENTRIES_COLLECTION);
  const entriesQuery =
    typeof since === 'number'
      ? query(entriesRef, orderByChild('createdAt'), startAt(since))
      : query(entriesRef, orderByChild('createdAt'));

  const snapshot = await get(entriesQuery);
  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.val() as Record<string, RemoteEntryDocument | undefined>;
  return Object.values(raw)
    .filter((entry): entry is RemoteEntryDocument => Boolean(entry))
    .sort((a, b) => b.createdAt - a.createdAt);
}
