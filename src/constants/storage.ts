export const STORAGE_KEYS = {
  appState: '@grandi10nios/app-state/v1',
  session: '@grandi10nios/session/v1',
  integritySecret: '@grandi10nios/integrity-secret/v1',
} as const;

export const SECURE_KEYS = {
  currentUser: 'grandi10nios.current_user.v1',
  authToken: 'grandi10nios.auth_token.v1',
  integritySecret: 'grandi10nios.integrity_secret.v1',
} as const;
