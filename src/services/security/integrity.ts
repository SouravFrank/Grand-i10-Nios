import { sha256 } from '@/services/security/hash';
import type { EntryRecord } from '@/types/models';

function buildSpecUpdateDetailSignature(entry: Omit<EntryRecord, 'integrityHash'>): string {
  return (
    entry.specUpdateDetails
      ?.map((detail) => [detail.field, detail.label, detail.previousValue, detail.nextValue].join('>'))
      .join(',')
      ?? ''
  );
}

function buildPayloadV1(entry: Omit<EntryRecord, 'integrityHash'>): string {
  const updatedFields = entry.specUpdatedFields?.join(',') ?? '';
  return [
    entry.id,
    entry.type,
    entry.userId,
    entry.userName,
    entry.odometer,
    entry.fuelAmount ?? '',
    entry.fuelLiters ?? '',
    entry.fullTank ?? '',
    entry.cost ?? '',
    updatedFields,
    entry.createdAt,
  ].join('|');
}

function buildPayloadV2(entry: Omit<EntryRecord, 'integrityHash'>): string {
  const updatedFields = entry.specUpdatedFields?.join(',') ?? '';
  return [
    entry.id,
    entry.type,
    entry.userId,
    entry.userName,
    entry.odometer,
    entry.fuelAmount ?? '',
    entry.fuelLiters ?? '',
    entry.fullTank ?? '',
    entry.sharedTrip ?? '',
    entry.sharedTripMarkedById ?? '',
    entry.sharedTripMarkedByName ?? '',
    entry.cost ?? '',
    updatedFields,
    entry.createdAt,
  ].join('|');
}

function buildPayloadV3(entry: Omit<EntryRecord, 'integrityHash'>): string {
  const updatedFields = entry.specUpdatedFields?.join(',') ?? '';
  return [
    entry.id,
    entry.type,
    entry.userId,
    entry.userName,
    entry.odometer,
    entry.fuelAmount ?? '',
    entry.fuelLiters ?? '',
    entry.fullTank ?? '',
    entry.sharedTrip ?? '',
    entry.sharedTripMarkedById ?? '',
    entry.sharedTripMarkedByName ?? '',
    entry.expenseCategory ?? '',
    entry.expenseTitle ?? '',
    entry.cost ?? '',
    updatedFields,
    entry.createdAt,
  ].join('|');
}

function buildPayloadV4(entry: Omit<EntryRecord, 'integrityHash'>): string {
  const updatedFields = entry.specUpdatedFields?.join(',') ?? '';
  const specUpdateDetails = buildSpecUpdateDetailSignature(entry);
  return [
    entry.id,
    entry.type,
    entry.userId,
    entry.userName,
    entry.odometer,
    entry.fuelAmount ?? '',
    entry.fuelLiters ?? '',
    entry.fullTank ?? '',
    entry.sharedTrip ?? '',
    entry.sharedTripMarkedById ?? '',
    entry.sharedTripMarkedByName ?? '',
    entry.expenseCategory ?? '',
    entry.expenseTitle ?? '',
    entry.cost ?? '',
    updatedFields,
    specUpdateDetails,
    entry.createdAt,
  ].join('|');
}

export async function buildEntryIntegrityHash(entry: Omit<EntryRecord, 'integrityHash'>, secret: string) {
  const payload = buildPayloadV4(entry);

  return sha256(`${payload}|${secret}`);
}

export async function verifyEntryIntegrity(entry: EntryRecord, secret: string): Promise<boolean> {
  const { integrityHash, ...rest } = entry;
  const checks = await Promise.all([
    sha256(`${buildPayloadV4(rest)}|${secret}`),
    sha256(`${buildPayloadV3(rest)}|${secret}`),
    sha256(`${buildPayloadV2(rest)}|${secret}`),
    sha256(`${buildPayloadV1(rest)}|${secret}`),
  ]);
  return checks.includes(integrityHash);
}
