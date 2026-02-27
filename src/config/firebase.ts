import Constants from 'expo-constants';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';

type FirebaseExtra = {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
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
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseDb(): Firestore | null {
  if (cachedDb) {
    return cachedDb;
  }

  const options = getFirebaseOptions();
  if (!options) {
    return null;
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(options);
  cachedDb = getFirestore(cachedApp);

  return cachedDb;
}
