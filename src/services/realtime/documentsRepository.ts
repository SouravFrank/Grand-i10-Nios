import { get, ref, set } from 'firebase/database';

import { getFirebaseDb } from '@/config/firebase';
import type { CarDocumentKey, RemoteCarDocument } from '@/types/models';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

const CAR_DOCUMENTS_PATH = 'carMeta/carDocuments';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const filteredEntries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return Object.fromEntries(filteredEntries) as T;
}

/**
 * Upload a document (as base64) to Firebase RTDB under carMeta/carDocuments/<docKey>.
 * Overwrites any previous version for this key.
 */
export async function pushDocumentToRealtimeDb(
  docKey: CarDocumentKey,
  document: RemoteCarDocument,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const payload = stripUndefined({ ...document });

  try {
    syncLog('realtime_push_document_start', { docKey, fileName: document.fileName, dataLength: document.data.length });
    await set(ref(db, `${CAR_DOCUMENTS_PATH}/${docKey}`), payload);
    syncLog('realtime_push_document_success', { docKey });
  } catch (error) {
    syncError('realtime_push_document_failed', { docKey, ...toErrorPayload(error) });
    throw error;
  }
}

/**
 * Pull all documents from Firebase RTDB.
 * Returns a map of docKey → RemoteCarDocument (with base64 data).
 * Only returns documents that exist in the DB.
 */
export async function pullDocumentsFromRealtimeDb(): Promise<Partial<Record<CarDocumentKey, RemoteCarDocument>>> {
  const db = getFirebaseDb();
  if (!db) {
    syncWarn('realtime_pull_documents_skipped_no_db');
    return {};
  }

  try {
    syncLog('realtime_pull_documents_start');
    const snapshot = await get(ref(db, CAR_DOCUMENTS_PATH));
    if (!snapshot.exists()) {
      syncLog('realtime_pull_documents_empty');
      return {};
    }

    const raw = snapshot.val() as Record<string, RemoteCarDocument | undefined>;
    const result: Partial<Record<CarDocumentKey, RemoteCarDocument>> = {};

    for (const [key, doc] of Object.entries(raw)) {
      if (doc && doc.data && doc.fileName && doc.mimeType && typeof doc.uploadedAt === 'number') {
        result[key as CarDocumentKey] = doc;
      }
    }

    const docKeys = Object.keys(result);
    syncLog('realtime_pull_documents_success', { count: docKeys.length, keys: docKeys });
    return result;
  } catch (error) {
    syncError('realtime_pull_documents_failed', toErrorPayload(error));
    throw error;
  }
}

/**
 * Pull metadata only (without base64 data) for all documents.
 * Uses the same path but we only need uploadedAt for comparison.
 * This is a lightweight check to avoid downloading large base64 payloads unnecessarily.
 */
export async function pullDocumentMetadataFromRealtimeDb(): Promise<
  Partial<Record<CarDocumentKey, { uploadedAt: number; fileName: string; mimeType: string }>>
> {
  const db = getFirebaseDb();
  if (!db) {
    return {};
  }

  try {
    const snapshot = await get(ref(db, CAR_DOCUMENTS_PATH));
    if (!snapshot.exists()) {
      return {};
    }

    const raw = snapshot.val() as Record<string, RemoteCarDocument | undefined>;
    const result: Partial<Record<CarDocumentKey, { uploadedAt: number; fileName: string; mimeType: string }>> = {};

    for (const [key, doc] of Object.entries(raw)) {
      if (doc && typeof doc.uploadedAt === 'number') {
        result[key as CarDocumentKey] = {
          uploadedAt: doc.uploadedAt,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
        };
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Pull a single document by key from Firebase RTDB.
 * Returns the full document including base64 data, or null if not found.
 */
export async function pullSingleDocumentFromRealtimeDb(
  docKey: CarDocumentKey,
): Promise<RemoteCarDocument | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  try {
    syncLog('realtime_pull_single_document_start', { docKey });
    const snapshot = await get(ref(db, `${CAR_DOCUMENTS_PATH}/${docKey}`));
    if (!snapshot.exists()) {
      syncLog('realtime_pull_single_document_empty', { docKey });
      return null;
    }

    const doc = snapshot.val() as RemoteCarDocument;
    if (!doc.data || !doc.fileName || typeof doc.uploadedAt !== 'number') {
      syncWarn('realtime_pull_single_document_invalid', { docKey });
      return null;
    }

    syncLog('realtime_pull_single_document_success', { docKey, dataLength: doc.data.length });
    return doc;
  } catch (error) {
    syncError('realtime_pull_single_document_failed', { docKey, ...toErrorPayload(error) });
    return null;
  }
}
