export type EntryType = 'odometer' | 'fuel' | 'spec_update' | 'expense';

export type ExpenseCategory = 'shield_safety' | 'care_comfort' | 'maintenance_lab' | 'utility_addon' | 'other';

export type Entry = {
  id: string;
  type: EntryType;
  userId: string;
  userName: string;
  odometer: number;
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
  createdAt: number;
  synced: boolean;
};

export type EntryRecord = Entry & {
  integrityHash: string;
};

export type PendingQueueItem = {
  entryId: string;
  retries: number;
  lastAttemptAt?: number;
};

export type AppUser = {
  id: string;
  name: string;
};

export type StoredSession = {
  userId: string;
  biometricEnabled: boolean;
  loginAt: number;
  sessionToken: string;
};

export type SecureUserPayload = {
  user: AppUser;
  credentialHash: string;
};

export type SyncStatus = 'synced' | 'syncing' | 'failed';

export type AuthStatus = 'booting' | 'unauthenticated' | 'biometric' | 'authenticated';

export type RemoteEntryDocument = Omit<Entry, 'synced'>;

export type CarSpec = {
  registrationNumber: string;
  registrationYear: string;
  manufacturingYear: string;
  initialOdometer: number;
  fuelType: string;
  model: string;
  variant: string;
  carColor: string;
  lastMaintenanceDate: string;
  lastEngineOilChangedOn: string;
  lastCoolantRefillOn: string;
  puccExpireDate: string;
  insuranceFirstPartyExpiry: string;
  insuranceThirdPartyExpiry: string;
};

export type CarSpecEditableFields = {
  lastMaintenanceDate: string;
  lastEngineOilChangedOn: string;
  lastCoolantRefillOn: string;
  puccExpireDate: string;
  insuranceFirstPartyExpiry: string;
  insuranceThirdPartyExpiry: string;
};

export type CarSpecEditableFieldKey = keyof CarSpecEditableFields;

export type CarSpecFieldUpdateSubmission = {
  field: CarSpecEditableFieldKey;
  value: string;
  cost?: number;
};
