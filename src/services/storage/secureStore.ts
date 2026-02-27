import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS } from '@/constants/storage';
import type { SecureUserPayload } from '@/types/models';

export async function getSecureUser(): Promise<SecureUserPayload | null> {
  const raw = await SecureStore.getItemAsync(SECURE_KEYS.currentUser);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SecureUserPayload;
  } catch {
    return null;
  }
}

export async function setSecureUser(payload: SecureUserPayload): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.currentUser, JSON.stringify(payload));
}

export async function deleteSecureUser(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEYS.currentUser);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.authToken, token);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.authToken);
}

export async function deleteAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
}

export async function getIntegritySecret(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.integritySecret);
}

export async function setIntegritySecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.integritySecret, secret);
}
