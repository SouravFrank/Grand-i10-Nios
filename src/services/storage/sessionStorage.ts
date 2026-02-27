import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/storage';
import type { StoredSession } from '@/types/models';

export async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.session);
}
