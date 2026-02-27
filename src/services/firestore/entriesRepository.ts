import { collection, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';

import { getFirebaseDb } from '@/config/firebase';
import type { EntryRecord, RemoteEntryDocument } from '@/types/models';

const ENTRIES_COLLECTION = 'carEntries';

export async function pushEntryToFirestore(entry: EntryRecord): Promise<void> {
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
    createdAt: entry.createdAt,
  };

  await setDoc(doc(db, ENTRIES_COLLECTION, entry.id), payload, { merge: true });
}

export async function pullEntriesFromFirestore(since?: number): Promise<RemoteEntryDocument[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }

  const entriesRef = collection(db, ENTRIES_COLLECTION);
  const q =
    typeof since === 'number'
      ? query(entriesRef, where('createdAt', '>=', since), orderBy('createdAt', 'desc'))
      : query(entriesRef, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => item.data() as RemoteEntryDocument);
}
