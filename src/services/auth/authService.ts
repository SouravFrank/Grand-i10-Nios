import * as LocalAuthentication from 'expo-local-authentication';

import { ALLOWED_USERS, AUTH_HASH_PEPPER } from '@/constants/users';
import { sha256 } from '@/services/security/hash';
import type { AllowedUser } from '@/constants/users';

export async function hashCredential(userId: string, password: string): Promise<string> {
  return sha256(`${userId}:${password}:${AUTH_HASH_PEPPER}`);
}

export async function authenticateWithPassword(
  userId: string,
  password: string,
): Promise<AllowedUser | null> {
  const user = ALLOWED_USERS.find((item) => item.id === userId.trim());
  if (!user) {
    return null;
  }

  const computedHash = await hashCredential(user.id, password);
  return computedHash === user.credentialHash ? user : null;
}

export async function canUseBiometricAuth(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return false;
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to unlock Grand i10 Nios',
    disableDeviceFallback: false,
  });

  return result.success;
}
