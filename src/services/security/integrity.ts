import { sha256 } from '@/services/security/hash';
import type { EntryRecord } from '@/types/models';

export async function buildEntryIntegrityHash(entry: Omit<EntryRecord, 'integrityHash'>, secret: string) {
  const updatedFields = entry.specUpdatedFields?.join(',') ?? '';
  const payload = [
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

  return sha256(`${payload}|${secret}`);
}

export async function verifyEntryIntegrity(entry: EntryRecord, secret: string): Promise<boolean> {
  const { integrityHash, ...rest } = entry;
  const expected = await buildEntryIntegrityHash(rest, secret);
  return expected === integrityHash;
}
