export type AppStackParamList = {
  Home: undefined;
  History: undefined;
  SyncLogs: undefined;
  StartingCarModal: undefined;
  FuelEntryModal: { entryId?: string } | undefined;
  ExpenseEntryModal: { entryId?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Biometric: undefined;
};
