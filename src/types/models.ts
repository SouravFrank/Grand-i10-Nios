export type EntryType = 'odometer' | 'fuel' | 'spec_update' | 'expense';

export type ExpenseCategory =
  | 'shield_safety'
  | 'care_comfort'
  | 'maintenance_lab'
  | 'utility_addon'
  | 'purchase'
  | 'traffic_violation_fine'
  | 'fasttag_toll_paid'
  | 'other';

export type SpecUpdateDetail = {
  field: string;
  label: string;
  previousValue: string;
  nextValue: string;
};

export type Entry = {
  id: string;
  type: EntryType;
  userId: string;
  userName: string;
  odometer: number;
  tripId?: string;
  tripStage?: 'start' | 'end';
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
  createdAt: number;
  synced: boolean;
};

export type EntryRecord = Entry & {
  integrityHash: string;
};

export type ActiveTrip = {
  tripId: string;
  startEntryId: string;
  startOdometer: number;
  startedAt: number;
  userId: string;
  userName: string;
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
  purchasedOn: string;
  registrationNumber: string;
  engineNumber: string;
  chassisNumber: string;
  registrationDate: string;
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
  lastBrakeFluidChangedOn: string;
  lastGearboxOilChangedOn: string;
  lastAirFilterChangedOn: string;
  lastOilFilterChangedOn: string;
  lastAcFilterChangedOn: string;
  lastSparkPlugsChangedOn: string;
  lastBatteryChangedOn: string;
  lastBrakePadsChangedOn: string;
  lastTyresChangedOn: string;
  puccExpireDate: string;
  insuranceValidUpTo: string;
  fitnessValidUpTo: string;
  taxValidUpTo: string;
};

export type CarSpecEditableFields = {
  lastMaintenanceDate: string;
  lastEngineOilChangedOn: string;
  lastCoolantRefillOn: string;
  lastBrakeFluidChangedOn: string;
  lastGearboxOilChangedOn: string;
  lastAirFilterChangedOn: string;
  lastOilFilterChangedOn: string;
  lastAcFilterChangedOn: string;
  lastSparkPlugsChangedOn: string;
  lastBatteryChangedOn: string;
  lastBrakePadsChangedOn: string;
  lastTyresChangedOn: string;
  puccExpireDate: string;
  insuranceValidUpTo: string;
  fitnessValidUpTo: string;
  taxValidUpTo: string;
};

export type CarSpecEditableFieldKey = keyof CarSpecEditableFields;

export type CarSpecFieldUpdateSubmission = {
  field: CarSpecEditableFieldKey;
  label: string;
  previousValue: string;
  value: string;
  odometer: number;
  cost?: number;
};

export type CarDocumentKey = 'pucc' | 'insurance' | 'rc' | 'fitness' | 'roadTax' | 'numberPlate' | 'pdiReport';

export type RemoteCarDocument = {
  data: string; // base64-encoded file content
  fileName: string;
  mimeType: string;
  uploadedAt: number;
  uploadedByUserId: string;
  uploadedByUserName: string;
};

export type LocalCarDocument = {
  localUri: string;
  fileName: string;
  mimeType: string;
  updatedAt: number;
};
