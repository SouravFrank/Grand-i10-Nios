type SyncLogPayload = Record<string, unknown> | undefined;

const SYNC_LOG_PREFIX = '[SYNC_DEBUG]';
const isSyncDebugEnabled = __DEV__ || process.env.EXPO_PUBLIC_SYNC_DEBUG === '1';

function write(level: 'log' | 'warn' | 'error', message: string, payload?: SyncLogPayload) {
  if (!isSyncDebugEnabled) {
    return;
  }

  const line = `${SYNC_LOG_PREFIX} ${new Date().toISOString()} ${message}`;
  if (payload) {
    console[level](line, payload);
    return;
  }

  console[level](line);
}

export function syncLog(message: string, payload?: SyncLogPayload) {
  write('log', message, payload);
}

export function syncWarn(message: string, payload?: SyncLogPayload) {
  write('warn', message, payload);
}

export function syncError(message: string, payload?: SyncLogPayload) {
  write('error', message, payload);
}

export function toErrorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: string };
    return {
      name: candidate.name,
      message: candidate.message,
      code: candidate.code ?? null,
      stack: candidate.stack ?? null,
    };
  }

  return {
    message: String(error),
  };
}
