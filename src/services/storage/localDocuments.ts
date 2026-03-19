import * as FileSystem from 'expo-file-system/legacy';

import type { CarDocumentKey, LocalCarDocument } from '@/types/models';
import { syncError, syncLog, toErrorPayload } from '@/utils/syncLogger';

/**
 * Directory where user-uploaded / synced documents are stored locally.
 * Each document is saved as: <DOCS_DIR>/<docKey>_<fileName>
 * A metadata JSON sidecar tracks the current file for each key.
 */
const DOCS_DIR = `${FileSystem.documentDirectory ?? ''}car_documents/`;
const META_FILE = `${DOCS_DIR}_metadata.json`;

type DocumentMetadata = Partial<Record<CarDocumentKey, LocalCarDocument>>;

async function ensureDocsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(DOCS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true });
  }
}

async function readMetadata(): Promise<DocumentMetadata> {
  try {
    const info = await FileSystem.getInfoAsync(META_FILE);
    if (!info.exists) {
      return {};
    }
    const raw = await FileSystem.readAsStringAsync(META_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(raw) as DocumentMetadata;
  } catch {
    return {};
  }
}

async function writeMetadata(metadata: DocumentMetadata): Promise<void> {
  await ensureDocsDir();
  await FileSystem.writeAsStringAsync(META_FILE, JSON.stringify(metadata), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/**
 * Save a base64-encoded document to local filesystem.
 * Returns the LocalCarDocument metadata on success.
 */
export async function saveDocumentLocally(
  docKey: CarDocumentKey,
  base64Data: string,
  fileName: string,
  mimeType: string,
): Promise<LocalCarDocument> {
  await ensureDocsDir();

  // Sanitize filename: docKey_timestamp_originalName
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localFileName = `${docKey}_${Date.now()}_${sanitizedName}`;
  const localUri = `${DOCS_DIR}${localFileName}`;

  try {
    // Remove old file for this key if it exists
    const metadata = await readMetadata();
    const existing = metadata[docKey];
    if (existing?.localUri) {
      const oldInfo = await FileSystem.getInfoAsync(existing.localUri);
      if (oldInfo.exists) {
        await FileSystem.deleteAsync(existing.localUri, { idempotent: true });
      }
    }

    // Write the new file
    await FileSystem.writeAsStringAsync(localUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const localDoc: LocalCarDocument = {
      localUri,
      fileName,
      mimeType,
      updatedAt: Date.now(),
    };

    // Update metadata
    metadata[docKey] = localDoc;
    await writeMetadata(metadata);

    syncLog('local_document_saved', { docKey, fileName, localUri });
    return localDoc;
  } catch (error) {
    syncError('local_document_save_failed', { docKey, fileName, ...toErrorPayload(error) });
    throw error;
  }
}

/**
 * Save a document from a local file URI (e.g., from document picker).
 * Copies the file to our managed directory and returns LocalCarDocument.
 */
export async function saveDocumentFromUri(
  docKey: CarDocumentKey,
  sourceUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ localDoc: LocalCarDocument; base64Data: string }> {
  await ensureDocsDir();

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localFileName = `${docKey}_${Date.now()}_${sanitizedName}`;
  const localUri = `${DOCS_DIR}${localFileName}`;

  try {
    // Remove old file for this key if it exists
    const metadata = await readMetadata();
    const existing = metadata[docKey];
    if (existing?.localUri) {
      const oldInfo = await FileSystem.getInfoAsync(existing.localUri);
      if (oldInfo.exists) {
        await FileSystem.deleteAsync(existing.localUri, { idempotent: true });
      }
    }

    // Copy source file to our managed directory
    await FileSystem.copyAsync({ from: sourceUri, to: localUri });

    // Read as base64 for uploading to RTDB
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const localDoc: LocalCarDocument = {
      localUri,
      fileName,
      mimeType,
      updatedAt: Date.now(),
    };

    // Update metadata
    metadata[docKey] = localDoc;
    await writeMetadata(metadata);

    syncLog('local_document_copied', { docKey, fileName, localUri, base64Size: base64Data.length });
    return { localDoc, base64Data };
  } catch (error) {
    syncError('local_document_copy_failed', { docKey, fileName, ...toErrorPayload(error) });
    throw error;
  }
}

/**
 * Get the local document metadata for a given key.
 * Returns null if no local document exists or the file is missing.
 */
export async function getLocalDocument(docKey: CarDocumentKey): Promise<LocalCarDocument | null> {
  try {
    const metadata = await readMetadata();
    const doc = metadata[docKey];
    if (!doc?.localUri) {
      return null;
    }

    // Verify file still exists
    const info = await FileSystem.getInfoAsync(doc.localUri);
    if (!info.exists) {
      return null;
    }

    return doc;
  } catch {
    return null;
  }
}

/**
 * Get all local document metadata.
 */
export async function getAllLocalDocuments(): Promise<DocumentMetadata> {
  try {
    const metadata = await readMetadata();
    const verified: DocumentMetadata = {};

    for (const [key, doc] of Object.entries(metadata)) {
      if (doc?.localUri) {
        const info = await FileSystem.getInfoAsync(doc.localUri);
        if (info.exists) {
          verified[key as CarDocumentKey] = doc;
        }
      }
    }

    return verified;
  } catch {
    return {};
  }
}
