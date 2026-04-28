import type { Entry } from '@/types/models';

type OwnerTrackedEntry = Pick<
  Entry,
  'type' | 'userId' | 'userName' | 'sharedTripMarkedById' | 'sharedTripMarkedByName'
>;

export function isPayerSelectableEntryType(type: Entry['type']) {
  return type === 'fuel' || type === 'expense';
}

export function getEntryOwnerId(entry: OwnerTrackedEntry) {
  if (!isPayerSelectableEntryType(entry.type)) {
    return entry.userId;
  }

  return entry.sharedTripMarkedById ?? entry.userId;
}

export function getEntryOwnerName(entry: OwnerTrackedEntry) {
  if (!isPayerSelectableEntryType(entry.type)) {
    return entry.userName;
  }

  return entry.sharedTripMarkedByName ?? entry.userName;
}
