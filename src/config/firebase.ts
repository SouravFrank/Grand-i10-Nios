import Constants from 'expo-constants';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FirebaseAuth from 'firebase/auth';
import { Auth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { syncError, syncLog, syncWarn, toErrorPayload } from '@/utils/syncLogger';

type FirebaseExtra = {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseDatabaseUrl?: string;
};

function getFirebaseOptions(): FirebaseOptions | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as FirebaseExtra;

  if (!extra.firebaseApiKey || !extra.firebaseProjectId || !extra.firebaseAppId) {
    syncWarn('firebase_options_missing', {
      hasApiKey: Boolean(extra.firebaseApiKey),
      hasProjectId: Boolean(extra.firebaseProjectId),
      hasAppId: Boolean(extra.firebaseAppId),
      hasDatabaseUrl: Boolean(extra.firebaseDatabaseUrl),
    });
    return null;
  }

  return {
    apiKey: extra.firebaseApiKey,
    authDomain: extra.firebaseAuthDomain,
    projectId: extra.firebaseProjectId,
    storageBucket: extra.firebaseStorageBucket,
    messagingSenderId: extra.firebaseMessagingSenderId,
    appId: extra.firebaseAppId,
    databaseURL: extra.firebaseDatabaseUrl,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;
let cachedAuth: Auth | null = null;
const authModule = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
};

function getFirebaseAppInstance(): FirebaseApp | null {
  const options = getFirebaseOptions();
  if (!options) {
    return null;
  }

  if (!cachedApp) {
    const hasExistingApp = getApps().length > 0;
    cachedApp = hasExistingApp ? getApp() : initializeApp(options);
    syncLog('firebase_app_initialized', {
      reusedExistingApp: hasExistingApp,
      projectId: options.projectId ?? null,
      hasDatabaseUrl: Boolean(options.databaseURL),
    });
  }

  return cachedApp;
}

export function getFirebaseDb(): Database | null {
  if (cachedDb) {
    return cachedDb;
  }

  const app = getFirebaseAppInstance();
  if (!app) {
    syncWarn('firebase_db_unavailable_no_app');
    return null;
  }

  cachedDb = getDatabase(app);
  syncLog('firebase_db_initialized');
  return cachedDb;
}

export function getFirebaseAuthClient(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseAppInstance();
  if (!app) {
    syncWarn('firebase_auth_unavailable_no_app');
    return null;
  }

  if (Platform.OS === 'web') {
    cachedAuth = FirebaseAuth.getAuth(app);
    syncLog('firebase_auth_initialized_web');
    return cachedAuth;
  }

  try {
    const persistence = authModule.getReactNativePersistence?.(AsyncStorage);
    cachedAuth = FirebaseAuth.initializeAuth(app, {
      ...(persistence ? { persistence: persistence as never } : {}),
    });
    syncLog('firebase_auth_initialized_native', {
      persistenceConfigured: Boolean(persistence),
    });
  } catch {
    // If already initialized elsewhere, get existing instance.
    cachedAuth = FirebaseAuth.getAuth(app);
    syncWarn('firebase_auth_initialize_fallback_to_getAuth');
  }

  return cachedAuth;
}

export async function ensureAnonymousFirebaseAuth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    syncWarn('firebase_anonymous_auth_skipped_no_client');
    return { ok: false, reason: 'Firebase is not configured.' };
  }

  if (auth.currentUser) {
    syncLog('firebase_anonymous_auth_already_signed_in', { uid: auth.currentUser.uid });
    return { ok: true };
  }

  try {
    syncLog('firebase_anonymous_auth_start');
    const credential = await FirebaseAuth.signInAnonymously(auth);
    syncLog('firebase_anonymous_auth_success', { uid: credential.user.uid });
    return { ok: true };
  } catch (error) {
    syncError('firebase_anonymous_auth_failed', toErrorPayload(error));
    const reason = error instanceof Error ? error.message : 'Unknown Firebase auth error';
    return { ok: false, reason };
  }
}
