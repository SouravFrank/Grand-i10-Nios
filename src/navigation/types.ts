export type AppStackParamList = {
  Home: undefined;
  History: undefined;
  SyncLogs: undefined;
  StartingCarModal: { mode?: 'start' | 'end' | 'restart' } | undefined;
  FuelEntryModal: { entryId?: string } | undefined;
  ExpenseEntryModal: { entryId?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Biometric: undefined;
};
