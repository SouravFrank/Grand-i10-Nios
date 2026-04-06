import { ALLOWED_USERS } from '@/constants/users';
import type { EntryRecord } from '@/types/models';
import { dayjs, INDIA_MONTH_FORMAT } from '@/utils/day';

export const DEFAULT_MONTHLY_MILEAGE = 13.5;
const SETTLEMENT_EPSILON = 0.5;

export type ReportUser = {
  id: string;
  name: string;
};

export type ReportRangeInput = {
  startTs: number;
  endTs: number;
  filterMode: 'month' | 'range';
  monthKey?: string;
  isCompleteMonth: boolean;
};

export type ReportUserSummary = {
  id: string;
  name: string;
  distanceKm: number;
  fuelFilledLiters: number;
  fuelPaidAmount: number;
  fuelUsedLiters: number;
  fuelConsumptionCost: number;
  fuelNetBalance: number;
  fastagRechargeAmount: number;
  fastagUsedAmount: number;
  fastagNetBalance: number;
  otherPaidAmount: number;
  otherShareAmount: number;
  totalPaidAmount: number;
  fairShareAmount: number;
  netBalance: number;
};

export type ReportSection = {
  key: 'toll' | 'misc' | 'repairs';
  title: string;
  totalAmount: number;
  paidByUser: Record<string, number>;
};

export type ExpenseReport = {
  users: ReportUser[];
  usersById: Record<string, ReportUserSummary>;
  rangeLabel: string;
  monthKeysInRange: string[];
  mileageByMonth: Record<string, number>;
  mileageEditorMonthKey: string | null;
  mileageEditorValue: number;
  isSettled: boolean;
  canEditMileage: boolean;
  hasTrips: boolean;
  hasFuelData: boolean;
  fuelCalculationBlocked: boolean;
  warnings: string[];
  summary: {
    totalExpense: number;
    totalTrips: number;
    ayanShare: number;
    souravShare: number;
  };
  fuel: {
    openingLiters: number;
    filledLiters: number;
    usedLiters: number;
    closingLiters: number;
    costPerLiter: number;
    totalFuelCost: number;
  };
  fastag: {
    openingBalance: number;
    rechargeAmount: number;
    usedAmount: number;
    closingBalance: number;
  };
  others: {
    totalSharedAmount: number;
    sections: ReportSection[];
  };
  settlement: {
    status: 'settled' | 'receive' | 'pay';
    toneIndex: number;
    amount: number;
    globalMessage: string;
    currentUserMessage: string;
  };
};

type TripSummary = {
  tripId: string;
  start: EntryRecord;
  end: EntryRecord;
  distanceKm: number;
  sharesByUser: Record<string, number>;
};

function createEmptyUserSummary(user: ReportUser): ReportUserSummary {
  return {
    id: user.id,
    name: user.name,
    distanceKm: 0,
    fuelFilledLiters: 0,
    fuelPaidAmount: 0,
    fuelUsedLiters: 0,
    fuelConsumptionCost: 0,
    fuelNetBalance: 0,
    fastagRechargeAmount: 0,
    fastagUsedAmount: 0,
    fastagNetBalance: 0,
    otherPaidAmount: 0,
    otherShareAmount: 0,
    totalPaidAmount: 0,
    fairShareAmount: 0,
    netBalance: 0,
  };
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(value, 0);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function getMonthKey(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM');
}

function getMonthLabel(monthKey: string): string {
  return dayjs(`${monthKey}-01`).format(INDIA_MONTH_FORMAT);
}

function isWithinRange(timestamp: number, startTs: number, endTs: number): boolean {
  return timestamp >= startTs && timestamp <= endTs;
}

function buildMonthKeysBetween(startTs: number, endTs: number): string[] {
  const keys: string[] = [];
  let cursor = dayjs(startTs).startOf('month');
  const last = dayjs(endTs).startOf('month');

  while (cursor.isBefore(last) || cursor.isSame(last, 'month')) {
    keys.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }

  return keys;
}

function resolveMonthMileage(monthKey: string, mileageByMonth: Record<string, number>): number {
  const saved = mileageByMonth[monthKey];
  return Number.isFinite(saved) ? saved : DEFAULT_MONTHLY_MILEAGE;
}

function isFastagRecharge(entry: EntryRecord): boolean {
  if (entry.type !== 'expense' || typeof entry.cost !== 'number') return false;
  if (entry.expenseCategory !== 'utility_addon') return false;

  const title = (entry.expenseTitle ?? '').toLowerCase();
  return (
    (title.includes('fastag') || title.includes('fast tag')) &&
    title.includes('recharge')
  );
}

function isFastagToll(entry: EntryRecord): boolean {
  return entry.type === 'expense' && entry.expenseCategory === 'fasttag_toll_paid' && typeof entry.cost === 'number';
}

function isTrafficFine(entry: EntryRecord): boolean {
  return entry.type === 'expense' && entry.expenseCategory === 'traffic_violation_fine';
}

function getOtherSectionKey(entry: EntryRecord): ReportSection['key'] | null {
  if (isFastagToll(entry)) return 'toll';
  if (entry.type !== 'expense') return null;
  if (isFastagRecharge(entry) || isTrafficFine(entry) || entry.expenseCategory === 'purchase') return null;

  if (entry.expenseCategory === 'maintenance_lab' || entry.expenseCategory === 'shield_safety') {
    return 'repairs';
  }

  if (
    entry.expenseCategory === 'care_comfort' ||
    entry.expenseCategory === 'utility_addon' ||
    entry.expenseCategory === 'other'
  ) {
    return 'misc';
  }

  return null;
}

function buildTrips(entries: EntryRecord[]): TripSummary[] {
  const odometerEntries = entries.filter(
    (entry): entry is EntryRecord =>
      entry.type === 'odometer' &&
      typeof entry.tripId === 'string' &&
      typeof entry.tripStage === 'string',
  );

  const buckets = new Map<string, { start?: EntryRecord; end?: EntryRecord }>();
  for (const entry of odometerEntries) {
    const bucket = buckets.get(entry.tripId!) ?? {};
    if (entry.tripStage === 'start') bucket.start = entry;
    if (entry.tripStage === 'end') bucket.end = entry;
    buckets.set(entry.tripId!, bucket);
  }

  const trips: TripSummary[] = [];
  for (const [tripId, bucket] of buckets.entries()) {
    if (!bucket.start || !bucket.end) continue;

    const distanceKm =
      typeof bucket.end.tripDistanceKm === 'number'
        ? bucket.end.tripDistanceKm
        : bucket.end.odometer - bucket.start.odometer;

    if (!Number.isFinite(distanceKm) || distanceKm <= 0) continue;

    const sharesByUser: Record<string, number> = {
      [bucket.end.userId]: distanceKm,
    };

    if (
      bucket.end.sharedTrip &&
      bucket.end.sharedTripMarkedById &&
      bucket.end.sharedTripMarkedById !== bucket.end.userId
    ) {
      sharesByUser[bucket.end.userId] = distanceKm / 2;
      sharesByUser[bucket.end.sharedTripMarkedById] = distanceKm / 2;
    }

    trips.push({
      tripId,
      start: bucket.start,
      end: bucket.end,
      distanceKm,
      sharesByUser,
    });
  }

  return trips.sort((left, right) => left.end.createdAt - right.end.createdAt);
}

function findTripByOdometer(trips: TripSummary[], odometer: number): TripSummary | null {
  for (const trip of trips) {
    const minOdometer = Math.min(trip.start.odometer, trip.end.odometer);
    const maxOdometer = Math.max(trip.start.odometer, trip.end.odometer);
    if (odometer >= minOdometer && odometer <= maxOdometer) {
      return trip;
    }
  }

  return null;
}

function formatRangeLabel(startTs: number, endTs: number): string {
  const startLabel = dayjs(startTs).format('DD MMM YYYY');
  const endLabel = dayjs(endTs).format('DD MMM YYYY');
  return `${startLabel} - ${endLabel}`;
}

export function buildExpenseReport(params: {
  entries: EntryRecord[];
  currentUserId?: string | null;
  mileageByMonth: Record<string, number>;
  settledMonths: Record<string, boolean>;
  range: ReportRangeInput;
}): ExpenseReport {
  const {
    entries,
    currentUserId,
    mileageByMonth,
    settledMonths,
    range,
  } = params;

  const users: ReportUser[] = ALLOWED_USERS.map((user) => ({
    id: user.id,
    name: user.name,
  }));
  const usersById = Object.fromEntries(
    users.map((user) => [user.id, createEmptyUserSummary(user)]),
  ) as Record<string, ReportUserSummary>;

  const monthKeysInRange = buildMonthKeysBetween(range.startTs, range.endTs);
  const rangeLabel = formatRangeLabel(range.startTs, range.endTs);
  const trips = buildTrips(entries);
  const tripsInRange = trips.filter((trip) => isWithinRange(trip.end.createdAt, range.startTs, range.endTs));
  const tripsBeforeRange = trips.filter((trip) => trip.end.createdAt < range.startTs);
  const sortedEntries = [...entries].sort((left, right) => left.createdAt - right.createdAt);
  const entriesInRange = sortedEntries.filter((entry) => isWithinRange(entry.createdAt, range.startTs, range.endTs));
  const entriesBeforeRange = sortedEntries.filter((entry) => entry.createdAt < range.startTs);
  const warnings = new Set<string>();

  const mileageSnapshot = Object.fromEntries(
    monthKeysInRange.map((monthKey) => [monthKey, resolveMonthMileage(monthKey, mileageByMonth)]),
  ) as Record<string, number>;

  let totalFuelUsedLiters = 0;
  let totalFuelCost = 0;
  let totalFuelFilledLiters = 0;
  let totalFuelFilledBefore = 0;
  let totalFuelUsedBefore = 0;
  let totalFastagRecharge = 0;
  let totalFastagRechargeBefore = 0;
  let totalFastagUsed = 0;
  let totalFastagUsedBefore = 0;
  let totalOtherSharedAmount = 0;

  const otherSections = new Map<ReportSection['key'], ReportSection>([
    ['toll', { key: 'toll', title: 'Toll Expenses', totalAmount: 0, paidByUser: {} }],
    ['misc', { key: 'misc', title: 'Misc Expenses', totalAmount: 0, paidByUser: {} }],
    ['repairs', { key: 'repairs', title: 'Repairs & Maintenance', totalAmount: 0, paidByUser: {} }],
  ]);

  // Fuel usage is derived from trips and the mileage configured for each month.
  for (const trip of tripsInRange) {
    const monthKey = getMonthKey(trip.end.createdAt);
    const mileage = resolveMonthMileage(monthKey, mileageByMonth);

    if (!Number.isFinite(mileage) || mileage <= 0) {
      warnings.add(`Fuel calculation is blocked because mileage for ${getMonthLabel(monthKey)} is 0 or invalid.`);
      continue;
    }

    for (const [userId, distanceShare] of Object.entries(trip.sharesByUser)) {
      const target = usersById[userId];
      if (!target) continue;

      target.distanceKm += distanceShare;
      target.fuelUsedLiters += distanceShare / mileage;
      totalFuelUsedLiters += distanceShare / mileage;
    }
  }

  for (const trip of tripsBeforeRange) {
    const monthKey = getMonthKey(trip.end.createdAt);
    const mileage = resolveMonthMileage(monthKey, mileageByMonth);

    if (!Number.isFinite(mileage) || mileage <= 0) {
      continue;
    }

    totalFuelUsedBefore += trip.distanceKm / mileage;
  }

  for (const entry of entriesBeforeRange) {
    if (entry.type === 'fuel') {
      if (typeof entry.fuelLiters === 'number') {
        totalFuelFilledBefore += entry.fuelLiters;
      }
      continue;
    }

    if (isFastagRecharge(entry)) {
      totalFastagRechargeBefore += entry.cost ?? 0;
      continue;
    }

    if (isFastagToll(entry)) {
      totalFastagUsedBefore += entry.cost ?? 0;
    }
  }

  for (const entry of entriesInRange) {
    if (entry.type === 'fuel') {
      const amount = typeof entry.fuelAmount === 'number' ? entry.fuelAmount : entry.cost;
      const target = usersById[entry.userId];

      if (target && typeof amount === 'number') {
        target.fuelPaidAmount += amount;
      }
      if (target && typeof entry.fuelLiters === 'number') {
        target.fuelFilledLiters += entry.fuelLiters;
      }

      if (typeof amount === 'number') {
        totalFuelCost += amount;
      }
      if (typeof entry.fuelLiters === 'number') {
        totalFuelFilledLiters += entry.fuelLiters;
      }
      continue;
    }

    if (isFastagRecharge(entry)) {
      const target = usersById[entry.userId];
      if (target) {
        target.fastagRechargeAmount += entry.cost ?? 0;
      }
      totalFastagRecharge += entry.cost ?? 0;
      continue;
    }

    if (isFastagToll(entry)) {
      const amount = entry.cost ?? 0;
      totalFastagUsed += amount;

      const trip = findTripByOdometer(tripsInRange, entry.odometer);
      if (trip) {
        for (const [userId, distanceShare] of Object.entries(trip.sharesByUser)) {
          const target = usersById[userId];
          if (!target) continue;
          target.fastagUsedAmount += amount * (distanceShare / trip.distanceKm);
        }
      } else if (usersById[entry.userId]) {
        usersById[entry.userId].fastagUsedAmount += amount;
      }

      const tollSection = otherSections.get('toll');
      if (tollSection) {
        tollSection.totalAmount += amount;
        tollSection.paidByUser[entry.userId] = (tollSection.paidByUser[entry.userId] ?? 0) + amount;
      }
      continue;
    }

    const sectionKey = getOtherSectionKey(entry);
    if (!sectionKey || typeof entry.cost !== 'number') {
      continue;
    }

    const section = otherSections.get(sectionKey);
    if (section) {
      section.totalAmount += entry.cost;
      section.paidByUser[entry.userId] = (section.paidByUser[entry.userId] ?? 0) + entry.cost;
    }

    const payer = usersById[entry.userId];
    if (payer) {
      payer.otherPaidAmount += entry.cost;
    }

    const equalShare = entry.cost / users.length;
    for (const user of users) {
      usersById[user.id].otherShareAmount += equalShare;
    }
    totalOtherSharedAmount += entry.cost;
  }

  const fuelCalculationBlocked = warnings.size > 0;
  const canCalculateFuelCost =
    !fuelCalculationBlocked &&
    totalFuelFilledLiters > 0 &&
    totalFuelCost > 0;

  if (tripsInRange.length > 0 && totalFuelFilledLiters <= 0) {
    warnings.add('No fuel fill exists in this period, so fuel settlement is shown as empty.');
  }

  const costPerLiter = canCalculateFuelCost ? totalFuelCost / totalFuelFilledLiters : 0;
  const openingFuelLiters = clampNonNegative(totalFuelFilledBefore - totalFuelUsedBefore);
  const closingFuelLiters = clampNonNegative(openingFuelLiters + totalFuelFilledLiters - totalFuelUsedLiters);
  const openingFastagBalance = clampNonNegative(totalFastagRechargeBefore - totalFastagUsedBefore);
  const closingFastagBalance = clampNonNegative(openingFastagBalance + totalFastagRecharge - totalFastagUsed);

  for (const user of users) {
    const summary = usersById[user.id];
    summary.fuelConsumptionCost = canCalculateFuelCost
      ? roundCurrency(summary.fuelUsedLiters * costPerLiter)
      : 0;
    summary.fuelNetBalance = roundCurrency(summary.fuelPaidAmount - summary.fuelConsumptionCost);
    summary.fastagNetBalance = roundCurrency(summary.fastagRechargeAmount - summary.fastagUsedAmount);
    summary.totalPaidAmount = roundCurrency(
      summary.fuelPaidAmount + summary.fastagRechargeAmount + summary.otherPaidAmount,
    );
    summary.fairShareAmount = roundCurrency(
      summary.fuelConsumptionCost + summary.fastagUsedAmount + summary.otherShareAmount,
    );
    summary.netBalance = roundCurrency(summary.totalPaidAmount - summary.fairShareAmount);
  }

  const ayanShare = usersById.ayan?.fairShareAmount ?? 0;
  const souravShare = usersById.sourav?.fairShareAmount ?? 0;
  const totalExpense = roundCurrency(
    (canCalculateFuelCost ? totalFuelUsedLiters * costPerLiter : 0) +
      totalFastagUsed +
      totalOtherSharedAmount,
  );

  const ayanNet = usersById.ayan?.netBalance ?? 0;
  const souravNet = usersById.sourav?.netBalance ?? 0;
  const activeUserId = currentUserId && usersById[currentUserId] ? currentUserId : 'sourav';
  const activeUser = usersById[activeUserId];
  const receiveUser = ayanNet >= souravNet ? usersById.ayan : usersById.sourav;
  const payUser = receiveUser.id === 'ayan' ? usersById.sourav : usersById.ayan;
  const settlementAmount = roundCurrency(Math.abs(receiveUser.netBalance));
  const monthIsSettled = Boolean(range.monthKey && settledMonths[range.monthKey]);

  let settlementStatus: ExpenseReport['settlement']['status'] = 'settled';
  let currentUserMessage = 'Settled for this month';
  let globalMessage = 'Settled for this month';
  let toneIndex = 2;

  if (!monthIsSettled && settlementAmount >= SETTLEMENT_EPSILON) {
    settlementStatus = activeUser.netBalance > 0 ? 'receive' : 'pay';
    currentUserMessage =
      activeUser.netBalance > 0
        ? `₹${settlementAmount.toLocaleString('en-IN')} to be received`
        : `₹${settlementAmount.toLocaleString('en-IN')} to be paid`;
    globalMessage = `${payUser.name} owes ${receiveUser.name} ₹${settlementAmount.toLocaleString('en-IN')}`;
    toneIndex = activeUser.netBalance > 0 ? 1 : 0;
  }

  return {
    users,
    usersById,
    rangeLabel,
    monthKeysInRange,
    mileageByMonth: mileageSnapshot,
    mileageEditorMonthKey: range.filterMode === 'month' ? range.monthKey ?? null : null,
    mileageEditorValue:
      range.filterMode === 'month' && range.monthKey
        ? resolveMonthMileage(range.monthKey, mileageByMonth)
        : DEFAULT_MONTHLY_MILEAGE,
    isSettled: monthIsSettled,
    canEditMileage:
      range.filterMode === 'month' &&
      Boolean(range.monthKey) &&
      range.isCompleteMonth &&
      !monthIsSettled,
    hasTrips: tripsInRange.length > 0,
    hasFuelData: totalFuelFilledLiters > 0,
    fuelCalculationBlocked,
    warnings: Array.from(warnings),
    summary: {
      totalExpense,
      totalTrips: tripsInRange.length,
      ayanShare,
      souravShare,
    },
    fuel: {
      openingLiters: roundCurrency(openingFuelLiters),
      filledLiters: roundCurrency(totalFuelFilledLiters),
      usedLiters: roundCurrency(totalFuelUsedLiters),
      closingLiters: roundCurrency(closingFuelLiters),
      costPerLiter: roundCurrency(costPerLiter),
      totalFuelCost: roundCurrency(totalFuelCost),
    },
    fastag: {
      openingBalance: roundCurrency(openingFastagBalance),
      rechargeAmount: roundCurrency(totalFastagRecharge),
      usedAmount: roundCurrency(totalFastagUsed),
      closingBalance: roundCurrency(closingFastagBalance),
    },
    others: {
      totalSharedAmount: roundCurrency(totalOtherSharedAmount),
      sections: Array.from(otherSections.values())
        .map((section) => ({
          ...section,
          totalAmount: roundCurrency(section.totalAmount),
          paidByUser: Object.fromEntries(
            Object.entries(section.paidByUser).map(([userId, value]) => [userId, roundCurrency(value)]),
          ),
        }))
        .filter((section) => section.totalAmount > 0),
    },
    settlement: {
      status: settlementStatus,
      toneIndex,
      amount: settlementAmount,
      globalMessage,
      currentUserMessage,
    },
  };
}
