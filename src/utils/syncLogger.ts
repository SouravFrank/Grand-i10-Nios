import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';

type SyncLogPayload = Record<string, unknown> | undefined;
export type SyncLogEntry = {
  id: string;
  level: 'log' | 'warn' | 'error';
  line: string;
  timestamp: string;
};

const SYNC_LOG_PREFIX = '[SYNC_DEBUG]';
const isSyncDebugEnabled =
  __DEV__ ||
  process.env.EXPO_PUBLIC_SYNC_DEBUG === '1' ||
  Constants.expoConfig?.extra?.syncDebug === '1';
const MAX_SYNC_LOG_ENTRIES = 300;
let syncLogEntries: SyncLogEntry[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function pushSyncLogEntry(level: 'log' | 'warn' | 'error', line: string) {
  syncLogEntries = [
    {
      id: `${Date.now()}_${Math.random()}`,
      level,
      line,
      timestamp: new Date().toISOString(),
    },
    ...syncLogEntries,
  ].slice(0, MAX_SYNC_LOG_ENTRIES);
  notifyListeners();
}

function write(level: 'log' | 'warn' | 'error', message: string, payload?: SyncLogPayload) {
  const line = `${SYNC_LOG_PREFIX} ${new Date().toISOString()} ${message}`;
  if (payload) {
    try {
      const payloadString = JSON.stringify(payload);
      const fullLine = `${line} ${payloadString}`;
      pushSyncLogEntry(level, fullLine);
      if (isSyncDebugEnabled) {
        console[level](fullLine);
      }
    } catch {
      pushSyncLogEntry(level, line);
      if (isSyncDebugEnabled) {
        console[level](line, payload);
      }
    }
    return;
  }

  pushSyncLogEntry(level, line);
  if (isSyncDebugEnabled) {
    console[level](line);
  }
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

export function getSyncLogEntries(): SyncLogEntry[] {
  return syncLogEntries;
}

export function clearSyncLogEntries() {
  syncLogEntries = [];
  notifyListeners();
}

export function subscribeSyncLogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncLogEntries() {
  return useSyncExternalStore(subscribeSyncLogs, getSyncLogEntries, getSyncLogEntries);
}
