import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/constants/storage";
import { canUseBiometricAuth } from "@/services/auth/authService";
import { removeEntryFromRealtimeDb } from "@/services/realtime/entriesRepository";
import { sha256 } from "@/services/security/hash";
import {
  buildEntryIntegrityHash,
  verifyEntryIntegrity,
} from "@/services/security/integrity";
import {
  deleteAuthToken,
  deleteSecureUser,
  getAuthToken,
  getIntegritySecret,
  getSecureUser,
  setAuthToken,
  setIntegritySecret,
  setSecureUser,
} from "@/services/storage/secureStore";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@/services/storage/sessionStorage";
import type {
  ActiveTrip,
  AppUser,
  AuthStatus,
  CarSpec,
  CarSpecEditableFields,
  Entry,
  EntryRecord,
  ExpenseCategory,
  PendingQueueItem,
  RemoteEntryDocument,
  SpecUpdateDetail,
  SyncStatus,
} from "@/types/models";
import { dayjs, normalizeIndianDate } from "@/utils/day";
import { createId } from "@/utils/id";
import { syncLog } from "@/utils/syncLogger";

type PersistedAppData = {
  entries: EntryRecord[];
  pendingQueue: PendingQueueItem[];
  lastSyncTime: number | null;
  lastOdometerValue: number;
  activeTrip: ActiveTrip | null;
  currentUser: AppUser | null;
  biometricEnabled: boolean;
  carSpec: CarSpec;
  carSpecDirty: boolean;
};

type AddEntryInput = {
  type: Entry["type"];
  userId: string;
  userName: string;
  odometer?: number;
  tripId?: string;
  tripStage?: "start" | "end";
  tripDistanceKm?: number;
  fuelAmount?: number;
  fuelLiters?: number;
  fullTank?: boolean;
  sharedTrip?: boolean;
  sharedTripMarkedById?: string;
  sharedTripMarkedByName?: string;
  expenseCategory?: ExpenseCategory;
  expenseTitle?: string;
  cost?: number;
  specUpdatedFields?: string[];
  specUpdateDetails?: SpecUpdateDetail[];
  createdAt?: number;
};

type SharedTripActor = {
  userId: string;
  userName: string;
};

type UpdateEntryInput = {
  odometer: number;
  fuelAmount?: number;
  fuelLiters?: number;
  fullTank?: boolean;
  expenseCategory?: ExpenseCategory;
  expenseTitle?: string;
  cost?: number;
  sharedTrip?: boolean;
};

const DEFAULT_CAR_SPEC: CarSpec = {
  purchasedOn: "27 Feb 2026",
  registrationNumber: "WB12BP0584",
  engineNumber: "G4LAPM522487",
  chassisNumber: "MALB351 CLPM464714",
  registrationDate: "09 Aug 2023",
  registrationYear: "Aug 2023",
  manufacturingYear: "July 2023",
  initialOdometer: 29810,
  fuelType: "Petrol",
  model: "Hyundai Grand i10 Nios",
  variant: "SPORTZ 1.2 KAPPA VTVT - 2023",
  carColor: "Spark Green Pearl",
  lastMaintenanceDate: "05 Sep 2025",
  lastEngineOilChangedOn: "05 Sep 2025",
  lastCoolantRefillOn: "04 Nov 2025",
  lastBrakeFluidChangedOn: "Not set",
  lastGearboxOilChangedOn: "05 Sep 2025",
  lastAirFilterChangedOn: "05 Sep 2025",
  lastOilFilterChangedOn: "05 Sep 2025",
  lastAcFilterChangedOn: "Not set",
  lastSparkPlugsChangedOn: "Not set",
  lastBatteryChangedOn: "Not set",
  lastBrakePadsChangedOn: "05 Sep 2025",
  lastTyresChangedOn: "Not set",
  puccExpireDate: "20 Sep 2026",
  insuranceValidUpTo: "26 Feb 2027",
  fitnessValidUpTo: "08 Aug 2038",
  taxValidUpTo: "06 Aug 2028",
};

function normalizeCarSpec(carSpec?: Partial<CarSpec> | null): CarSpec {
  const merged = {
    ...DEFAULT_CAR_SPEC,
    ...(carSpec ?? {}),
  };

  const normalizeTextKey = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();

  const normalizedManufacturingYear =
    normalizeTextKey(merged.manufacturingYear) === "july 2023"
      ? DEFAULT_CAR_SPEC.manufacturingYear
      : merged.manufacturingYear;
  const normalizedModel =
    normalizeTextKey(merged.model) === "hyundai grand i10 nios"
      ? DEFAULT_CAR_SPEC.model
      : merged.model;

  return {
    ...merged,
    manufacturingYear: normalizedManufacturingYear,
    model: normalizedModel,
    purchasedOn: normalizeIndianDate(merged.purchasedOn),
    registrationDate: normalizeIndianDate(merged.registrationDate),
    lastMaintenanceDate: normalizeIndianDate(merged.lastMaintenanceDate),
    lastEngineOilChangedOn: normalizeIndianDate(merged.lastEngineOilChangedOn),
    lastCoolantRefillOn: normalizeIndianDate(merged.lastCoolantRefillOn),
    lastBrakeFluidChangedOn: normalizeIndianDate(
      merged.lastBrakeFluidChangedOn,
    ),
    lastGearboxOilChangedOn: normalizeIndianDate(
      merged.lastGearboxOilChangedOn,
    ),
    lastAirFilterChangedOn: normalizeIndianDate(merged.lastAirFilterChangedOn),
    lastOilFilterChangedOn: normalizeIndianDate(merged.lastOilFilterChangedOn),
    lastAcFilterChangedOn: normalizeIndianDate(merged.lastAcFilterChangedOn),
    lastSparkPlugsChangedOn: normalizeIndianDate(
      merged.lastSparkPlugsChangedOn,
    ),
    lastBatteryChangedOn: normalizeIndianDate(merged.lastBatteryChangedOn),
    lastBrakePadsChangedOn: normalizeIndianDate(merged.lastBrakePadsChangedOn),
    lastTyresChangedOn: normalizeIndianDate(merged.lastTyresChangedOn),
    puccExpireDate: normalizeIndianDate(merged.puccExpireDate),
    insuranceValidUpTo: normalizeIndianDate(merged.insuranceValidUpTo),
    fitnessValidUpTo: normalizeIndianDate(merged.fitnessValidUpTo),
    taxValidUpTo: normalizeIndianDate(merged.taxValidUpTo),
  };
}

function requiresCarSpecNormalization(
  carSpec?: Partial<CarSpec> | null,
): boolean {
  if (!carSpec) {
    return true;
  }

  const normalized = normalizeCarSpec(carSpec);
  const keys = Object.keys(DEFAULT_CAR_SPEC) as (keyof CarSpec)[];

  return keys.some((key) => {
    const rawValue = carSpec[key];
    const normalizedValue = normalized[key];
    return (
      rawValue === undefined || String(rawValue) !== String(normalizedValue)
    );
  });
}

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
  login: (params: {
    user: AppUser;
    credentialHash: string;
    biometricEnabled: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  startTrip: (params: { userId: string; userName: string; odometer: number; sharedTrip?: boolean }) => Promise<EntryRecord>;
  endTrip: (params: { userId: string; userName: string; odometer: number; sharedTrip?: boolean }) => Promise<EntryRecord>;
  addEntryOfflineFirst: (entry: AddEntryInput) => Promise<EntryRecord>;
  updateEntryOfflineFirst: (
    entryId: string,
    updates: UpdateEntryInput,
  ) => Promise<EntryRecord>;
  deleteEntry: (entryId: string) => Promise<void>;
  markEntriesSynced: (entryIds: string[]) => void;
  updatePendingQueue: (nextQueue: PendingQueueItem[]) => void;
  mergeRemoteEntries: (remoteEntries: RemoteEntryDocument[]) => Promise<void>;
  runIntegrityCheck: () => Promise<void>;
  updateCarSpec: (updates: Partial<CarSpecEditableFields>) => void;
  markCarSpecSynced: () => void;
  replaceCarSpecFromRemote: (carSpec: CarSpec) => void;
  markEntrySharedTrip: (
    entryId: string,
    actor: SharedTripActor,
  ) => Promise<void>;
  ensureDemoData: () => Promise<void>;
};

const initialPersistedState: PersistedAppData = {
  entries: [],
  pendingQueue: [],
  lastSyncTime: null,
  lastOdometerValue: 0,
  activeTrip: null,
  currentUser: null,
  biometricEnabled: false,
  carSpecDirty: false,
  carSpec: normalizeCarSpec(),
};

async function ensureIntegritySecret(): Promise<string> {
  const existing = await getIntegritySecret();
  if (existing) {
    return existing;
  }

  const seed = `${Date.now()}_${Math.random()}_${createId("int")}`;
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

function recalculateLastOdometer(
  entries: Array<Pick<EntryRecord, "odometer">>,
): number {
  return entries.reduce(
    (maxValue, entry) => Math.max(maxValue, entry.odometer),
    0,
  );
}

function validateUpdatedEntryOdometer(
  entries: EntryRecord[],
  entryId: string,
  nextOdometer: number,
): void {
  if (!Number.isFinite(nextOdometer) || nextOdometer <= 0) {
    throw new Error("Enter a valid odometer reading.");
  }

  const chronologicalEntries = [...entries].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  const targetIndex = chronologicalEntries.findIndex(
    (entry) => entry.id === entryId,
  );

  if (targetIndex === -1) {
    throw new Error("Entry not found.");
  }

  const previousEntry = chronologicalEntries[targetIndex - 1];
  const nextEntry = chronologicalEntries[targetIndex + 1];

  if (previousEntry && nextOdometer < previousEntry.odometer) {
    throw new Error(
      "Edited odometer cannot be less than the previous recorded value.",
    );
  }

  if (nextEntry && nextOdometer > nextEntry.odometer) {
    throw new Error("Edited odometer cannot exceed the next recorded value.");
  }

  if (previousEntry && nextOdometer - previousEntry.odometer > 500) {
    throw new Error(
      "Single odometer entry cannot exceed 500 km from the previous reading.",
    );
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      authStatus: "booting",
      syncStatus: "synced",
      isOnline: false,
      isHydrated: false,
      isSyncing: false,
      lastSyncError: null,
      securityIssue: null,

      setHydrated: (value) => set({ isHydrated: value }),

      setNetworkStatus: (online) => set({ isOnline: online }),

      setSyncing: () => {
        const queueLength = get().pendingQueue.length;
        syncLog("store_set_syncing", { queueLength });
        set({ syncStatus: "syncing", isSyncing: true, lastSyncError: null });
      },

      setSyncOutcome: (status, error = null) => {
        syncLog("store_set_sync_outcome", {
          status,
          error,
          pendingQueueLength: get().pendingQueue.length,
        });
        set({
          syncStatus: status,
          isSyncing: false,
          lastSyncError: error,
          lastSyncTime: status === "synced" ? Date.now() : get().lastSyncTime,
        });
      },

      bootstrapAuth: async () => {
        const [session, secureUser, biometricAvailable, secureToken] =
          await Promise.all([
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
            authStatus: "unauthenticated",
            currentUser: null,
            biometricEnabled: false,
          });
          return;
        }

        set({
          currentUser: secureUser.user,
          biometricEnabled: Boolean(
            session.biometricEnabled && biometricAvailable,
          ),
          authStatus:
            session.biometricEnabled && biometricAvailable
              ? "biometric"
              : "authenticated",
        });
      },

      unlockWithBiometric: () => {
        set({ authStatus: "authenticated" });
      },

      fallbackToPassword: () => {
        set({ authStatus: "unauthenticated" });
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
          authStatus: "authenticated",
          currentUser: user,
          biometricEnabled,
        });
      },

      logout: async () => {
        await Promise.all([
          clearStoredSession(),
          deleteSecureUser(),
          deleteAuthToken(),
        ]);

        set({
          ...initialPersistedState,
          authStatus: "unauthenticated",
          syncStatus: "synced",
          isSyncing: false,
          lastSyncError: null,
          securityIssue: null,
        });
      },

      startTrip: async ({ userId, userName, odometer, sharedTrip }) => {
        const tripId = createId("trip");
        const shouldShare = Boolean(sharedTrip);
        const entry = await get().addEntryOfflineFirst({
          type: "odometer",
          userId,
          userName,
          odometer,
          tripId,
          tripStage: "start",
          sharedTrip: shouldShare,
          sharedTripMarkedById: shouldShare ? userId : undefined,
          sharedTripMarkedByName: shouldShare ? userName : undefined,
        });

        set({
          activeTrip: {
            tripId,
            startEntryId: entry.id,
            startOdometer: odometer,
            startedAt: entry.createdAt,
            userId,
            userName,
          },
        });

        return entry;
      },

      endTrip: async ({ userId, userName, odometer, sharedTrip }) => {
        const activeTrip = get().activeTrip;

        if (!activeTrip) {
          throw new Error("No active trip found.");
        }

        if (odometer < activeTrip.startOdometer) {
          throw new Error(
            "Trip end odometer cannot be less than the trip start reading.",
          );
        }

        const shouldShare = Boolean(sharedTrip);
        const entry = await get().addEntryOfflineFirst({
          type: "odometer",
          userId,
          userName,
          odometer,
          tripId: activeTrip.tripId,
          tripStage: "end",
          tripDistanceKm: odometer - activeTrip.startOdometer,
          sharedTrip: shouldShare,
          sharedTripMarkedById: shouldShare ? userId : undefined,
          sharedTripMarkedByName: shouldShare ? userName : undefined,
        });

        set({ activeTrip: null });

        return entry;
      },

      addEntryOfflineFirst: async (payload) => {
        const { lastOdometerValue, pendingQueue } = get();

        if (typeof payload.odometer !== "number") {
          throw new Error("Odometer is required.");
        }

        const entryOdometer = payload.odometer;

        if (!Number.isFinite(entryOdometer) || entryOdometer <= 0) {
          throw new Error("Enter a valid odometer reading.");
        }

        if (entryOdometer < lastOdometerValue) {
          throw new Error(
            "New odometer entry cannot be less than the previous value.",
          );
        }
        if (entryOdometer - lastOdometerValue > 500) {
          throw new Error(
            "Single odometer entry cannot exceed 500 km from the previous reading.",
          );
        }

        const createdAt = payload.createdAt ?? Date.now();
        const baseEntry: Entry = {
          id: createId("entry"),
          type: payload.type,
          userId: payload.userId,
          userName: payload.userName,
          odometer: entryOdometer,
          tripId: payload.tripId,
          tripStage: payload.tripStage,
          tripDistanceKm: payload.tripDistanceKm,
          fuelAmount: payload.fuelAmount,
          fuelLiters: payload.fuelLiters,
          fullTank: payload.fullTank,
          sharedTrip: payload.sharedTrip,
          sharedTripMarkedById: payload.sharedTripMarkedById,
          sharedTripMarkedByName: payload.sharedTripMarkedByName,
          expenseCategory: payload.expenseCategory,
          expenseTitle: payload.expenseTitle,
          cost: payload.cost,
          specUpdatedFields: payload.specUpdatedFields,
          specUpdateDetails: payload.specUpdateDetails,
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
          lastOdometerValue: recalculateLastOdometer([
            entryRecord,
            ...state.entries,
          ]),
          syncStatus: "failed",
        }));

        return entryRecord;
      },

      updateEntryOfflineFirst: async (entryId, updates) => {
        const { entries, pendingQueue } = get();
        const targetEntry = entries.find((entry) => entry.id === entryId);

        if (!targetEntry) {
          throw new Error("Entry not found.");
        }

        if (targetEntry.type !== "fuel" && targetEntry.type !== "expense" && targetEntry.type !== "odometer") {
          throw new Error("Only fuel, expense, and odometer entries can be edited.");
        }

        validateUpdatedEntryOdometer(entries, entryId, updates.odometer);

        const secret = await ensureIntegritySecret();
        const updatedEntry: Entry = {
          ...targetEntry,
          odometer: updates.odometer,
          fuelAmount:
            targetEntry.type === "fuel" ? updates.fuelAmount : undefined,
          fuelLiters:
            targetEntry.type === "fuel" ? updates.fuelLiters : undefined,
          fullTank: targetEntry.type === "fuel" ? updates.fullTank : undefined,
          expenseCategory:
            targetEntry.type === "expense"
              ? updates.expenseCategory
              : undefined,
          expenseTitle:
            targetEntry.type === "expense" ? updates.expenseTitle : undefined,
          cost: updates.cost,
          sharedTrip: updates.sharedTrip !== undefined ? updates.sharedTrip : targetEntry.sharedTrip,
          sharedTripMarkedById: updates.sharedTrip ? targetEntry.userId : undefined,
          sharedTripMarkedByName: updates.sharedTrip ? targetEntry.userName : undefined,
          synced: false,
        };
        const integrityHash = await buildEntryIntegrityHash(
          updatedEntry,
          secret,
        );
        const nextQueue = normalizeQueue([
          ...pendingQueue,
          {
            entryId,
            retries: 0,
          },
        ]);
        const nextRecord: EntryRecord = {
          ...updatedEntry,
          integrityHash,
        };

        set((state) => {
          const nextEntries = state.entries.map((entry) =>
            entry.id === entryId ? nextRecord : entry,
          );

          return {
            entries: nextEntries,
            pendingQueue: nextQueue,
            lastOdometerValue: recalculateLastOdometer(nextEntries),
            syncStatus: "failed",
          };
        });

        return nextRecord;
      },

      deleteEntry: async (entryId) => {
        const { entries, pendingQueue } = get();

        try {
          await removeEntryFromRealtimeDb(entryId);
        } catch (error) {
          console.error('Failed to remote delete entry:', error);
        }

        set((state) => {
          const nextEntries = state.entries.filter((entry) => entry.id !== entryId);
          return {
            entries: nextEntries,
            pendingQueue: state.pendingQueue.filter(q => q.entryId !== entryId),
            lastOdometerValue: recalculateLastOdometer(nextEntries),
          };
        });
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
          pendingQueue: state.pendingQueue.filter(
            (item) => !ids.has(item.entryId),
          ),
        }));
      },

      updatePendingQueue: (nextQueue) => {
        set({ pendingQueue: normalizeQueue(nextQueue) });
      },

      mergeRemoteEntries: async (remoteEntries) => {
        const secret = await ensureIntegritySecret();
        const remoteRecords: EntryRecord[] = [];
        for (const remoteEntry of remoteEntries) {
          const baseEntry: Entry = {
            ...remoteEntry,
            synced: true,
          };
          const integrityHash = await buildEntryIntegrityHash(
            baseEntry,
            secret,
          );
          remoteRecords.push({ ...baseEntry, integrityHash });
        }

        set((state) => {
          const byId = new Map(state.entries.map((entry) => [entry.id, entry]));
          const remoteIdSet = new Set(remoteRecords.map((r) => r.id));

          for (const remoteEntry of remoteRecords) {
            byId.set(remoteEntry.id, remoteEntry);
          }

          // Server is authoritative for entries that we previously synced.
          // If an entry is missing from the latest server snapshot, it was likely
          // deleted on the server and must be removed locally.
          const allEntries = Array.from(byId.values())
            .sort(
            (a, b) => b.createdAt - a.createdAt,
            )
            .filter((entry) => !entry.synced || remoteIdSet.has(entry.id));

          const lastOdometerValue = allEntries.reduce(
            (maxValue, entry) => Math.max(maxValue, entry.odometer),
            state.lastOdometerValue,
          );
          const unsyncedIds = new Set(
            allEntries
              .filter((entry) => !entry.synced)
              .map((entry) => entry.id),
          );
          const filteredQueue = state.pendingQueue.filter((item) =>
            unsyncedIds.has(item.entryId),
          );

          return {
            entries: allEntries,
            lastOdometerValue,
            pendingQueue: filteredQueue,
            activeTrip: (() => {
              const activeTrip = state.activeTrip;
              if (!activeTrip) return null;
              return allEntries.some((e) => e.id === activeTrip.startEntryId) ? activeTrip : null;
            })(),
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

        const sortedByTimeAsc = [...validEntries].sort(
          (a, b) => a.createdAt - b.createdAt,
        );
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
          const filteredQueue = state.pendingQueue.filter((item) =>
            validIds.has(item.entryId),
          );

          return {
            entries: validEntries.sort((a, b) => b.createdAt - a.createdAt),
            pendingQueue: filteredQueue,
            lastOdometerValue: recalculatedLastOdometer,
            activeTrip:
              state.activeTrip && validIds.has(state.activeTrip.startEntryId)
                ? state.activeTrip
                : null,
            syncStatus: filteredQueue.length > 0 ? "failed" : "synced",
            securityIssue: integrityIssue
              ? "Local data integrity check failed. Invalid records were removed."
              : null,
          };
        });
      },

      updateCarSpec: (updates) => {
        set((state) => ({
          carSpec: normalizeCarSpec({
            ...state.carSpec,
            ...updates,
          }),
          carSpecDirty: true,
        }));
      },

      markCarSpecSynced: () => {
        set({ carSpecDirty: false });
      },

      replaceCarSpecFromRemote: (carSpec) => {
        const shouldSyncNormalizedSpec = requiresCarSpecNormalization(carSpec);
        set({
          carSpec: normalizeCarSpec(carSpec),
          carSpecDirty: shouldSyncNormalizedSpec,
        });
      },

      markEntrySharedTrip: async (entryId, actor) => {
        const { entries, pendingQueue } = get();
        const targetEntry = entries.find((entry) => entry.id === entryId);
        if (
          !targetEntry ||
          targetEntry.type !== "odometer" ||
          targetEntry.userId === actor.userId ||
          targetEntry.sharedTrip
        ) {
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
        const integrityHash = await buildEntryIntegrityHash(
          updatedEntry,
          secret,
        );
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
          syncStatus: "failed",
        }));
      },

      ensureDemoData: async () => {
        const state = get();
        const secret = await ensureIntegritySecret();
        const baseEntries: Entry[] = [
          {
            id: "entry_actual_20250905_spec_update_service_sourav",
            type: "spec_update",
            userId: "sourav",
            userName: "Sourav",
            odometer: 26743,
            specUpdatedFields: [
              "lastBrakePadsChangedOn",
              "lastEngineOilChangedOn",
              "lastGearboxOilChangedOn",
              "lastAirFilterChangedOn",
              "lastOilFilterChangedOn",
            ],
            specUpdateDetails: [
              {
                field: "lastBrakePadsChangedOn",
                label: "Brake Pads",
                previousValue: "Not set",
                nextValue: "05 Sep 2025",
              },
              {
                field: "lastEngineOilChangedOn",
                label: "Engine Oil",
                previousValue: "Not set",
                nextValue: "05 Sep 2025",
              },
              {
                field: "lastGearboxOilChangedOn",
                label: "Gearbox Oil",
                previousValue: "Not set",
                nextValue: "05 Sep 2025",
              },
              {
                field: "lastAirFilterChangedOn",
                label: "Air Filter (Engine)",
                previousValue: "Not set",
                nextValue: "05 Sep 2025",
              },
              {
                field: "lastOilFilterChangedOn",
                label: "Oil Filter",
                previousValue: "Not set",
                nextValue: "05 Sep 2025",
              },
            ],
            createdAt: dayjs("2025-09-05T12:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_trip_start_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29810,
            tripId: "trip_actual_20260227",
            tripStage: "start",
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-02-27T12:10:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_trip_end_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29840,
            tripId: "trip_actual_20260227",
            tripStage: "end",
            tripDistanceKm: 30,
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-02-27T13:10:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260218_expense_cars24_report_ayan",
            type: "expense",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29661,
            expenseCategory: "purchase",
            expenseTitle: "Cars24Report",
            cost: 250,
            createdAt: dayjs("2026-02-18T12:15:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260221_expense_inspection_3rd_party_ayan",
            type: "expense",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29703,
            expenseCategory: "purchase",
            expenseTitle: "Inspection 3rd Party",
            cost: 1500,
            createdAt: dayjs("2026-02-21T11:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260221_expense_booking_amount_penalty_ayan",
            type: "expense",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29703,
            expenseCategory: "purchase",
            expenseTitle: "Booking Amount Penalty",
            cost: 1000,
            createdAt: dayjs("2026-02-21T11:05:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_expense_downpayment_charges_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29703,
            expenseCategory: "purchase",
            expenseTitle: "Downpayment & Charges",
            cost: 17480,
            createdAt: dayjs("2026-02-27T10:15:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_expense_cash_wages_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29810,
            expenseCategory: "purchase",
            expenseTitle: "Car - Cash Wages",
            cost: 50,
            createdAt: dayjs("2026-02-27T12:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_expense_cash_wages_ayan",
            type: "expense",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29810,
            expenseCategory: "purchase",
            expenseTitle: "Car - Cash Wages",
            cost: 200,
            createdAt: dayjs("2026-02-27T12:01:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_fuel_ayan",
            type: "fuel",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29810,
            fuelAmount: 2000,
            fuelLiters: 18.98,
            fullTank: false,
            cost: 2000,
            createdAt: dayjs("2026-02-27T12:05:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260227_expense_driver_delivery_ayan",
            type: "expense",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29840,
            expenseCategory: "purchase",
            expenseTitle: "Driver for Delivery",
            cost: 800,
            createdAt: dayjs("2026-02-27T17:30:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260228_expense_cover_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29840,
            expenseCategory: "shield_safety",
            expenseTitle: "Cover",
            cost: 951,
            createdAt: dayjs("2026-02-27T17:45:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260228_expense_rat_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29840,
            expenseCategory: "shield_safety",
            expenseTitle: "Rat Spray",
            cost: 449,
            createdAt: dayjs("2026-02-27T17:50:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260301_trip_start_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29840,
            tripId: "trip_actual_20260301",
            tripStage: "start",
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-01T07:30:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260301_trip_end_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29853,
            tripId: "trip_actual_20260301",
            tripStage: "end",
            tripDistanceKm: 13,
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-01T08:10:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260301_expense_scratch_treatment_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29853,
            expenseCategory: "care_comfort",
            expenseTitle: "Scratch Treatment Materials",
            cost: 978,
            createdAt: dayjs("2026-03-01T08:30:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260301_fuel_ayan",
            type: "fuel",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29853,
            fuelAmount: 211,
            fuelLiters: 2,
            fullTank: false,
            cost: 211,
            createdAt: dayjs("2026-03-01T09:05:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260303_trip_start_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29853,
            tripId: "trip_actual_20260303",
            tripStage: "start",
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-03T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260303_fuel_ayan",
            type: "fuel",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29859,
            fuelAmount: 2100,
            fuelLiters: 19.92,
            fullTank: false,
            cost: 2100,
            createdAt: dayjs("2026-03-03T18:15:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260303_trip_end_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29865,
            tripId: "trip_actual_20260303",
            tripStage: "end",
            tripDistanceKm: 12,
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-03T20:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260304_trip_start_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29865,
            tripId: "trip_actual_20260304",
            tripStage: "start",
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-04T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260304_trip_end_ayan",
            type: "odometer",
            userId: "ayan",
            userName: "Ayan",
            odometer: 29905,
            tripId: "trip_actual_20260304",
            tripStage: "end",
            tripDistanceKm: 40,
            sharedTrip: true,
            sharedTripMarkedById: "ayan",
            sharedTripMarkedByName: "Ayan",
            createdAt: dayjs("2026-03-04T12:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260307_trip_start_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29905,
            tripId: "trip_actual_20260307",
            tripStage: "start",
            createdAt: dayjs("2026-03-07T09:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260307_trip_end_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29940,
            tripId: "trip_actual_20260307",
            tripStage: "end",
            tripDistanceKm: 35,
            createdAt: dayjs("2026-03-07T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260311_trip_start_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29940,
            tripId: "trip_actual_20260311",
            tripStage: "start",
            createdAt: dayjs("2026-03-11T09:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260311_trip_end_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29957,
            tripId: "trip_actual_20260311",
            tripStage: "end",
            tripDistanceKm: 17,
            createdAt: dayjs("2026-03-11T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260312_trip_start_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29957,
            tripId: "trip_actual_20260312",
            tripStage: "start",
            createdAt: dayjs("2026-03-12T09:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260312_trip_end_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29994,
            tripId: "trip_actual_20260312",
            tripStage: "end",
            tripDistanceKm: 37,
            createdAt: dayjs("2026-03-12T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260315_trip_start_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 29994,
            tripId: "trip_actual_20260315",
            tripStage: "start",
            sharedTrip: true,
            sharedTripMarkedById: "sourav",
            sharedTripMarkedByName: "Sourav",
            createdAt: dayjs("2026-03-15T10:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260315_trip_end_sourav",
            type: "odometer",
            userId: "sourav",
            userName: "Sourav",
            odometer: 30035,
            tripId: "trip_actual_20260315",
            tripStage: "end",
            tripDistanceKm: 41,
            sharedTrip: true,
            sharedTripMarkedById: "sourav",
            sharedTripMarkedByName: "Sourav",
            createdAt: dayjs("2026-03-15T12:00:00").valueOf(),
            synced: false,
          },
          {
            id: "entry_actual_20260316_expense_traffic_fine_sourav",
            type: "expense",
            userId: "sourav",
            userName: "Sourav",
            odometer: 30035,
            expenseCategory: "traffic_violation_fine",
            expenseTitle: "Traffic Violation Fine",
            cost: 2000,
            createdAt: dayjs("2026-03-15T10:00:00").valueOf(),
            synced: false,
          },
        ];

        const existingById = new Map(
          state.entries.map((entry) => [entry.id, entry]),
        );
        const baseIds = new Set(baseEntries.map((entry) => entry.id));

        const seedSignature = (
          entry: Pick<
            Entry,
            | "type"
            | "userId"
            | "userName"
            | "odometer"
            | "tripId"
            | "tripStage"
            | "tripDistanceKm"
            | "fuelAmount"
            | "fuelLiters"
            | "fullTank"
            | "sharedTrip"
            | "sharedTripMarkedById"
            | "sharedTripMarkedByName"
            | "expenseCategory"
            | "expenseTitle"
            | "cost"
            | "specUpdatedFields"
            | "specUpdateDetails"
            | "createdAt"
          >,
        ) =>
          JSON.stringify({
            type: entry.type,
            userId: entry.userId,
            userName: entry.userName,
            odometer: entry.odometer,
            tripId: entry.tripId ?? null,
            tripStage: entry.tripStage ?? null,
            tripDistanceKm: entry.tripDistanceKm ?? null,
            fuelAmount: entry.fuelAmount ?? null,
            fuelLiters: entry.fuelLiters ?? null,
            fullTank: entry.fullTank ?? null,
            sharedTrip: entry.sharedTrip ?? null,
            sharedTripMarkedById: entry.sharedTripMarkedById ?? null,
            sharedTripMarkedByName: entry.sharedTripMarkedByName ?? null,
            expenseCategory: entry.expenseCategory ?? null,
            expenseTitle: entry.expenseTitle ?? null,
            cost: entry.cost ?? null,
            specUpdatedFields: entry.specUpdatedFields ?? null,
            specUpdateDetails: entry.specUpdateDetails ?? null,
            createdAt: entry.createdAt,
          });

        const needsUpsert = baseEntries.some((entry) => {
          const existing = existingById.get(entry.id);
          if (!existing) {
            return true;
          }
          return (
            seedSignature(entry) !==
            seedSignature({
              type: existing.type,
              userId: existing.userId,
              userName: existing.userName,
              odometer: existing.odometer,
              fuelAmount: existing.fuelAmount,
              fuelLiters: existing.fuelLiters,
              fullTank: existing.fullTank,
              expenseCategory: existing.expenseCategory,
              expenseTitle: existing.expenseTitle,
              cost: existing.cost,
              createdAt: existing.createdAt,
            })
          );
        });

        if (!needsUpsert) {
          return;
        }

        const hashedEntries: EntryRecord[] = [];
        for (const entry of baseEntries) {
          const integrityHash = await buildEntryIntegrityHash(entry, secret);
          hashedEntries.push({
            ...entry,
            integrityHash,
          });
        }

        const retainedEntries = state.entries.filter(
          (entry) => !baseIds.has(entry.id),
        );
        const nextEntries = [...retainedEntries, ...hashedEntries].sort(
          (a, b) => b.createdAt - a.createdAt,
        );

        const retainedQueue = state.pendingQueue.filter(
          (item) => !baseIds.has(item.entryId),
        );
        const seedQueue = baseEntries.map((entry) => ({
          entryId: entry.id,
          retries: 0,
        }));
        const nextQueue = normalizeQueue([...retainedQueue, ...seedQueue]);

        set({
          entries: nextEntries,
          pendingQueue: nextQueue,
          lastOdometerValue: recalculateLastOdometer(nextEntries),
          syncStatus: "failed",
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
        carSpecDirty: state.carSpecDirty,
        activeTrip: state.activeTrip,
      }),
      merge: (persistedState, currentState) => {
        const typedPersistedState = (persistedState as Partial<AppState>) ?? {};
        const persistedCarSpec = typedPersistedState.carSpec;
        return {
          ...currentState,
          ...typedPersistedState,
          carSpec: normalizeCarSpec(persistedCarSpec),
          carSpecDirty:
            Boolean(typedPersistedState.carSpecDirty) ||
            requiresCarSpecNormalization(persistedCarSpec),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
