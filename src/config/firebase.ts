import Constants from 'expo-constants';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInAnonymously } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';

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

function getFirebaseAppInstance(): FirebaseApp | null {
  const options = getFirebaseOptions();
  if (!options) {
    return null;
  }

  if (!cachedApp) {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(options);
  }

  return cachedApp;
}

export function getFirebaseDb(): Database | null {
  if (cachedDb) {
    return cachedDb;
  }

  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  cachedDb = getDatabase(app);
  return cachedDb;
}

export function getFirebaseAuthClient(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  cachedAuth = getAuth(app);
  return cachedAuth;
}

export async function ensureAnonymousFirebaseAuth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    return { ok: false, reason: 'Firebase is not configured.' };
  }

  if (auth.currentUser) {
    return { ok: true };
  }

  try {
    await signInAnonymously(auth);
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Firebase auth error';
    return { ok: false, reason };
  }
}
