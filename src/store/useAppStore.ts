import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage';
import { canUseBiometricAuth } from '@/services/auth/authService';
import { sha256 } from '@/services/security/hash';
import { buildEntryIntegrityHash, verifyEntryIntegrity } from '@/services/security/integrity';
import {
  deleteAuthToken,
  getAuthToken,
  deleteSecureUser,
  getIntegritySecret,
  getSecureUser,
  setAuthToken,
  setIntegritySecret,
  setSecureUser,
} from '@/services/storage/secureStore';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/services/storage/sessionStorage';
import type {
  AppUser,
  AuthStatus,
  CarSpec,
  CarSpecEditableFields,
  Entry,
  EntryRecord,
  PendingQueueItem,
  RemoteEntryDocument,
  SyncStatus,
} from '@/types/models';
import { createId } from '@/utils/id';

type PersistedAppData = {
  entries: EntryRecord[];
  pendingQueue: PendingQueueItem[];
  lastSyncTime: number | null;
  lastOdometerValue: number;
  currentUser: AppUser | null;
  biometricEnabled: boolean;
  carSpec: CarSpec;
};

type AddEntryInput = {
  type: Entry['type'];
  userId: string;
  userName: string;
  odometer: number;
  fuelAmount?: number;
  fuelLiters?: number;
  fullTank?: boolean;
  cost?: number;
  specUpdatedFields?: string[];
  createdAt?: number;
};

type SharedTripActor = {
  userId: string;
  userName: string;
};

type AppState = PersistedAppData & {
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  isOnline: boolean;
  isHydrated: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  securityIssue: string | null;
  setHydrated: (value: boolean) => void;
  setNetworkStatus: (online: boolean) => void;
  setSyncing: () => void;
  setSyncOutcome: (status: SyncStatus, error?: string | null) => void;
  bootstrapAuth: () => Promise<void>;
  unlockWithBiometric: () => void;
  fallbackToPassword: () => void;
  login: (params: { user: AppUser; credentialHash: string; biometricEnabled: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  addEntryOfflineFirst: (entry: AddEntryInput) => Promise<EntryRecord>;
  markEntriesSynced: (entryIds: string[]) => void;
  updatePendingQueue: (nextQueue: PendingQueueItem[]) => void;
  mergeRemoteEntries: (remoteEntries: RemoteEntryDocument[]) => Promise<void>;
  runIntegrityCheck: () => Promise<void>;
  updateCarSpec: (updates: Partial<CarSpecEditableFields>) => void;
  markEntrySharedTrip: (entryId: string, actor: SharedTripActor) => Promise<void>;
  ensureDemoData: () => Promise<void>;
};

const initialPersistedState: PersistedAppData = {
  entries: [],
  pendingQueue: [],
  lastSyncTime: null,
  lastOdometerValue: 0,
  currentUser: null,
  biometricEnabled: false,
  carSpec: {
    registrationNumber: 'WB12BP0584',
    registrationYear: 'Aug-2023',
    manufacturingYear: 'JULY 2023',
    initialOdometer: 29661,
    fuelType: 'Petrol',
    model: 'Hyundai GRAND I10 NIOS',
    variant: 'SPORTZ 1.2 KAPPA VTVT - 2023',
    lastMaintenanceDate: '12 JAN 2026',
    lastEngineOilChangedOn: '12 JAN 2026',
    lastCoolantRefillOn: '04 NOV 2025',
    puccExpireDate: '20 SEP 2026',
    insuranceFirstPartyExpiry: '31 AUG 2026',
    insuranceThirdPartyExpiry: '31 AUG 2028',
  },
};

async function ensureIntegritySecret(): Promise<string> {
  const existing = await getIntegritySecret();
  if (existing) {
    return existing;
  }

  const seed = `${Date.now()}_${Math.random()}_${createId('int')}`;
  const secret = await sha256(seed);
  await setIntegritySecret(secret);
  return secret;
}

function normalizeQueue(queue: PendingQueueItem[]): PendingQueueItem[] {
  const seen = new Set<string>();
  return queue.filter((item) => {
    if (seen.has(item.entryId)) {
      return false;
    }
    seen.add(item.entryId);
    return true;
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      authStatus: 'booting',
      syncStatus: 'synced',
      isOnline: false,
      isHydrated: false,
      isSyncing: false,
      lastSyncError: null,
      securityIssue: null,

      setHydrated: (value) => set({ isHydrated: value }),

      setNetworkStatus: (online) => set({ isOnline: online }),

      setSyncing: () => {
        set({ syncStatus: 'syncing', isSyncing: true, lastSyncError: null });
      },

      setSyncOutcome: (status, error = null) => {
        set({
          syncStatus: status,
          isSyncing: false,
          lastSyncError: error,
          lastSyncTime: status === 'synced' ? Date.now() : get().lastSyncTime,
        });
      },

      bootstrapAuth: async () => {
        const [session, secureUser, biometricAvailable, secureToken] = await Promise.all([
          getStoredSession(),
          getSecureUser(),
          canUseBiometricAuth(),
          getAuthToken(),
        ]);

        if (
          !session ||
          !secureUser ||
          !secureToken ||
          session.userId !== secureUser.user.id ||
          secureToken !== session.sessionToken
        ) {
          set({
            authStatus: 'unauthenticated',
            currentUser: null,
            biometricEnabled: false,
          });
          return;
        }

        set({
          currentUser: secureUser.user,
          biometricEnabled: Boolean(session.biometricEnabled && biometricAvailable),
          authStatus: session.biometricEnabled && biometricAvailable ? 'biometric' : 'authenticated',
        });
      },

      unlockWithBiometric: () => {
        set({ authStatus: 'authenticated' });
      },

      fallbackToPassword: () => {
        set({ authStatus: 'unauthenticated' });
      },

      login: async ({ user, credentialHash, biometricEnabled }) => {
        const token = await sha256(`${user.id}|${Date.now()}|${Math.random()}`);

        await Promise.all([
          setSecureUser({ user, credentialHash }),
          setAuthToken(token),
          setStoredSession({
            userId: user.id,
            biometricEnabled,
            loginAt: Date.now(),
            sessionToken: token,
          }),
          ensureIntegritySecret(),
        ]);

        set({
          authStatus: 'authenticated',
          currentUser: user,
          biometricEnabled,
        });
      },

      logout: async () => {
        await Promise.all([clearStoredSession(), deleteSecureUser(), deleteAuthToken()]);

        set({
          ...initialPersistedState,
          authStatus: 'unauthenticated',
          syncStatus: 'synced',
          isSyncing: false,
          lastSyncError: null,
          securityIssue: null,
        });
      },

      addEntryOfflineFirst: async (payload) => {
        const { lastOdometerValue, pendingQueue } = get();
        if (payload.odometer < lastOdometerValue) {
          throw new Error('Odometer rollback detected.');
        }
        if (payload.odometer - lastOdometerValue > 500) {
          throw new Error('Single odometer entry cannot exceed 500 km from the previous reading.');
        }

        const createdAt = payload.createdAt ?? Date.now();
        const baseEntry: Entry = {
          id: createId('entry'),
          type: payload.type,
          userId: payload.userId,
          userName: payload.userName,
          odometer: payload.odometer,
          fuelAmount: payload.fuelAmount,
          fuelLiters: payload.fuelLiters,
          fullTank: payload.fullTank,
          cost: payload.cost,
          specUpdatedFields: payload.specUpdatedFields,
          createdAt,
          synced: false,
        };

        const secret = await ensureIntegritySecret();
        const integrityHash = await buildEntryIntegrityHash(baseEntry, secret);

        const entryRecord: EntryRecord = {
          ...baseEntry,
          integrityHash,
        };

        const nextQueue = normalizeQueue([
          ...pendingQueue,
          {
            entryId: entryRecord.id,
            retries: 0,
          },
        ]);

        set((state) => ({
          entries: [entryRecord, ...state.entries],
          pendingQueue: nextQueue,
          lastOdometerValue: Math.max(state.lastOdometerValue, entryRecord.odometer),
          syncStatus: 'failed',
        }));

        return entryRecord;
      },

      markEntriesSynced: (entryIds) => {
        const ids = new Set(entryIds);

        set((state) => ({
          entries: state.entries.map((entry) =>
            ids.has(entry.id)
              ? {
                  ...entry,
                  synced: true,
                }
              : entry,
          ),
          pendingQueue: state.pendingQueue.filter((item) => !ids.has(item.entryId)),
        }));
      },

      updatePendingQueue: (nextQueue) => {
        set({ pendingQueue: normalizeQueue(nextQueue) });
      },

      mergeRemoteEntries: async (remoteEntries) => {
        if (remoteEntries.length === 0) {
          return;
        }

        const secret = await ensureIntegritySecret();
        const existingIds = new Set(get().entries.map((entry) => entry.id));

        const remoteToAdd: EntryRecord[] = [];
        for (const remoteEntry of remoteEntries) {
          if (existingIds.has(remoteEntry.id)) {
            continue;
          }

          const baseEntry: Entry = {
            ...remoteEntry,
            synced: true,
          };
          const integrityHash = await buildEntryIntegrityHash(baseEntry, secret);
          remoteToAdd.push({ ...baseEntry, integrityHash });
        }

        if (remoteToAdd.length === 0) {
          return;
        }

        set((state) => {
          const allEntries = [...state.entries, ...remoteToAdd].sort((a, b) => b.createdAt - a.createdAt);
          const lastOdometerValue = allEntries.reduce(
            (maxValue, entry) => Math.max(maxValue, entry.odometer),
            state.lastOdometerValue,
          );

          return {
            entries: allEntries,
            lastOdometerValue,
          };
        });
      },

      runIntegrityCheck: async () => {
        const secret = await ensureIntegritySecret();
        const { entries } = get();

        const validEntries: EntryRecord[] = [];
        let integrityIssue = false;

        for (const entry of entries) {
          const isValid = await verifyEntryIntegrity(entry, secret);
          if (isValid) {
            validEntries.push(entry);
          } else {
            integrityIssue = true;
          }
        }

        const sortedByTimeAsc = [...validEntries].sort((a, b) => a.createdAt - b.createdAt);
        let maxOdometer = 0;
        for (const entry of sortedByTimeAsc) {
          if (entry.odometer < maxOdometer) {
            integrityIssue = true;
          }
          maxOdometer = Math.max(maxOdometer, entry.odometer);
        }

        set((state) => {
          const validIds = new Set(validEntries.map((entry) => entry.id));
          const recalculatedLastOdometer = validEntries.reduce(
            (maxValue, entry) => Math.max(maxValue, entry.odometer),
            0,
          );
          const filteredQueue = state.pendingQueue.filter((item) => validIds.has(item.entryId));

          return {
            entries: validEntries.sort((a, b) => b.createdAt - a.createdAt),
            pendingQueue: filteredQueue,
            lastOdometerValue: recalculatedLastOdometer,
            syncStatus: filteredQueue.length > 0 ? 'failed' : 'synced',
            securityIssue: integrityIssue
              ? 'Local data integrity check failed. Invalid records were removed.'
              : null,
          };
        });
      },

      updateCarSpec: (updates) => {
        set((state) => ({
          carSpec: {
            ...state.carSpec,
            ...updates,
          },
        }));
      },

      markEntrySharedTrip: async (entryId, actor) => {
        const { entries, pendingQueue } = get();
        const targetEntry = entries.find((entry) => entry.id === entryId);
        if (!targetEntry || targetEntry.type !== 'odometer' || targetEntry.userId === actor.userId || targetEntry.sharedTrip) {
          return;
        }

        const secret = await ensureIntegritySecret();
        const updatedEntry: Entry = {
          ...targetEntry,
          sharedTrip: true,
          sharedTripMarkedById: actor.userId,
          sharedTripMarkedByName: actor.userName,
          synced: false,
        };
        const integrityHash = await buildEntryIntegrityHash(updatedEntry, secret);
        const nextQueue = normalizeQueue([
          ...pendingQueue,
          {
            entryId,
            retries: 0,
          },
        ]);

        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...updatedEntry,
                  integrityHash,
                }
              : entry,
          ),
          pendingQueue: nextQueue,
          syncStatus: 'failed',
        }));
      },

      ensureDemoData: async () => {
        const state = get();
        if (state.entries.length > 0) {
          return;
        }

        const secret = await ensureIntegritySecret();
        const now = Date.now();
        const baseEntries: Entry[] = [
          {
            id: createId('entry_demo_1'),
            type: 'odometer',
            userId: 'sourav',
            userName: 'Sourav',
            odometer: 29661,
            createdAt: now - 1000 * 60 * 60 * 24 * 2,
            synced: true,
          },
          {
            id: createId('entry_demo_2'),
            type: 'fuel',
            userId: 'ayan',
            userName: 'Ayan',
            odometer: 29980,
            fuelAmount: 2300,
            fuelLiters: 31.2,
            fullTank: true,
            cost: 2300,
            createdAt: now - 1000 * 60 * 60 * 18,
            synced: true,
          },
        ];

        const hashedEntries: EntryRecord[] = [];
        for (const entry of baseEntries) {
          const integrityHash = await buildEntryIntegrityHash(entry, secret);
          hashedEntries.push({
            ...entry,
            integrityHash,
          });
        }

        set({
          entries: hashedEntries.sort((a, b) => b.createdAt - a.createdAt),
          pendingQueue: [],
          lastOdometerValue: 29980,
          syncStatus: 'synced',
        });
      },
    }),
    {
      name: STORAGE_KEYS.appState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        pendingQueue: state.pendingQueue,
        lastSyncTime: state.lastSyncTime,
        lastOdometerValue: state.lastOdometerValue,
        currentUser: state.currentUser,
        biometricEnabled: state.biometricEnabled,
        carSpec: state.carSpec,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
