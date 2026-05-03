import { get, ref, set } from 'firebase/database';

import { getFirebaseDb } from '@/config/firebase';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

const SETTLEMENTS_PATH = 'carMeta/settlements';
const MILEAGE_PATH = 'carMeta/reportMileage';

export type RemoteSettlementsData = {
  settledReportMonths: Record<string, boolean>;
  lastUpdatedAt: number;
};

export type RemoteMileageData = {
  reportMileageByMonth: Record<string, number>;
  lastUpdatedAt: number;
};

export async function pushSettlementsToRealtimeDb(
  settledReportMonths: Record<string, boolean>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const payload: RemoteSettlementsData = {
    settledReportMonths,
    lastUpdatedAt: Date.now(),
  };

  try {
    syncLog('realtime_push_settlements_start', { monthCount: Object.keys(settledReportMonths).length });
    await set(ref(db, SETTLEMENTS_PATH), payload);
    syncLog('realtime_push_settlements_success');
  } catch (error) {
    syncError('realtime_push_settlements_failed', toErrorPayload(error));
    throw error;
  }
}

export async function pullSettlementsFromRealtimeDb(): Promise<RemoteSettlementsData | null> {
  const db = getFirebaseDb();
  if (!db) {
    syncWarn('realtime_pull_settlements_skipped_no_db');
    return null;
  }

  try {
    syncLog('realtime_pull_settlements_start');
    const snapshot = await get(ref(db, SETTLEMENTS_PATH));
    if (!snapshot.exists()) {
      syncLog('realtime_pull_settlements_empty');
      return null;
    }

    const data = snapshot.val() as RemoteSettlementsData;
    syncLog('realtime_pull_settlements_success', { monthCount: Object.keys(data.settledReportMonths).length });
    return data;
  } catch (error) {
    syncError('realtime_pull_settlements_failed', toErrorPayload(error));
    throw error;
  }
}

export async function pushMileageToRealtimeDb(
  reportMileageByMonth: Record<string, number>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const payload: RemoteMileageData = {
    reportMileageByMonth,
    lastUpdatedAt: Date.now(),
  };

  try {
    syncLog('realtime_push_mileage_start', { monthCount: Object.keys(reportMileageByMonth).length });
    await set(ref(db, MILEAGE_PATH), payload);
    syncLog('realtime_push_mileage_success');
  } catch (error) {
    syncError('realtime_push_mileage_failed', toErrorPayload(error));
    throw error;
  }
}

export async function pullMileageFromRealtimeDb(): Promise<RemoteMileageData | null> {
  const db = getFirebaseDb();
  if (!db) {
    syncWarn('realtime_pull_mileage_skipped_no_db');
    return null;
  }

  try {
    syncLog('realtime_pull_mileage_start');
    const snapshot = await get(ref(db, MILEAGE_PATH));
    if (!snapshot.exists()) {
      syncLog('realtime_pull_mileage_empty');
      return null;
    }

    const data = snapshot.val() as RemoteMileageData;
    syncLog('realtime_pull_mileage_success', { monthCount: Object.keys(data.reportMileageByMonth).length });
    return data;
  } catch (error) {
    syncError('realtime_pull_mileage_failed', toErrorPayload(error));
    throw error;
  }
}
