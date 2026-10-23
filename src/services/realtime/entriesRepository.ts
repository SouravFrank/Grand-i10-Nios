import { get, orderByChild, query, ref, set, startAt, remove, update } from 'firebase/database';

import { getFirebaseDb } from '@/config/firebase';
import type { CarSpec, EntryRecord, RemoteEntryDocument } from '@/types/models';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

const ENTRIES_COLLECTION = 'carEntries';
const CAR_SPEC_PATH = 'carMeta/carSpec';

// Mirrors the required children and primitive types in the deployed
// carMeta/carSpec .validate rules. Field-level updates validate against the
// merged remote document, so they are only safe when every required field
// already exists remotely.
const CAR_SPEC_REQUIRED_STRING_FIELDS: (keyof CarSpec)[] = [
  'purchasedOn',
  'registrationNumber',
  'engineNumber',
  'chassisNumber',
  'registrationDate',
  'registrationYear',
  'manufacturingYear',
  'fuelType',
  'model',
  'variant',
  'carColor',
  'lastMaintenanceDate',
  'lastEngineOilChangedOn',
  'lastCoolantRefillOn',
  'lastBrakeFluidChangedOn',
  'lastGearboxOilChangedOn',
  'lastAirFilterChangedOn',
  'lastOilFilterChangedOn',
  'lastAcFilterChangedOn',
  'lastSparkPlugsChangedOn',
  'lastBatteryChangedOn',
  'lastBrakePadsChangedOn',
  'lastTyresChangedOn',
  'lastWheelAlignmentOn',
  'puccExpireDate',
  'insuranceValidUpTo',
  'fitnessValidUpTo',
  'taxValidUpTo',
];
const CAR_SPEC_REQUIRED_NUMBER_FIELDS: (keyof CarSpec)[] = [
  'initialOdometer',
  'lastWheelAlignmentOdometer',
];

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const filteredEntries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return Object.fromEntries(filteredEntries) as T;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    const filteredEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .map(([key, nestedValue]) => [key, stripUndefinedDeep(nestedValue)]);
    return Object.fromEntries(filteredEntries) as T;
  }

  return value;
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
    tripId: entry.tripId,
    tripStage: entry.tripStage,
    tripDistanceKm: entry.tripDistanceKm,
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
    specUpdateDetails: entry.specUpdateDetails,
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

export async function removeEntryFromRealtimeDb(entryId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await remove(ref(db, `${ENTRIES_COLLECTION}/${entryId}`));
  } catch (error) {
    syncError('realtime_remove_entry_failed', { entryId, ...toErrorPayload(error) });
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

  try {
    syncLog('realtime_pull_entries_start', { since: since ?? null });
    const snapshot =
      typeof since === 'number'
        ? await get(query(entriesRef, orderByChild('createdAt'), startAt(since)))
        : await get(entriesRef);
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

export function canUpdateCarSpecFieldsRemotely(remoteCarSpec: CarSpec): boolean {
  const raw = remoteCarSpec as Record<string, unknown>;
  const hasType = (key: keyof CarSpec, expected: 'string' | 'number') =>
    typeof raw[key] === expected;

  return (
    CAR_SPEC_REQUIRED_STRING_FIELDS.every((key) => hasType(key, 'string')) &&
    CAR_SPEC_REQUIRED_NUMBER_FIELDS.every((key) => hasType(key, 'number'))
  );
}

export async function pushCarSpecFieldsToRealtimeDb(
  changes: Partial<CarSpec>,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const changeCount = Object.keys(changes).length;
  if (changeCount === 0) {
    return;
  }

  try {
    syncLog('realtime_push_car_spec_fields_start', { fields: Object.keys(changes) });
    await update(ref(db, CAR_SPEC_PATH), stripUndefinedDeep(changes));
    syncLog('realtime_push_car_spec_fields_success');
  } catch (error) {
    syncError('realtime_push_car_spec_fields_failed', {
      fields: Object.keys(changes),
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
    await set(ref(db, CAR_SPEC_PATH), stripUndefinedDeep(carSpec));
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
