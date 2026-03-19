export type AppStackParamList = {
  Home: undefined;
  History: undefined;
  Report: undefined;
  SyncLogs: undefined;
  StartingCarModal: { mode?: 'start' | 'end' | 'restart' | 'edit'; entryId?: string } | undefined;
  FuelEntryModal: { entryId?: string } | undefined;
  ExpenseEntryModal: { entryId?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Biometric: undefined;
};
