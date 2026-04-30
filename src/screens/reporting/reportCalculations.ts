import { ALLOWED_USERS } from "@/constants/users";
import type { EntryRecord, EntryType } from "@/types/models";
import { dayjs, INDIA_MONTH_FORMAT } from "@/utils/day";

export const DEFAULT_MONTHLY_MILEAGE = 13.5;
const SETTLEMENT_EPSILON = 0.5;

export type ReportUser = {
  id: string;
  name: string;
};

export type ReportRangeInput = {
  startTs: number;
  endTs: number;
  filterMode: "month" | "range";
  monthKey?: string;
  isCompleteMonth: boolean;
};

export type ReportUserSummary = {
  id: string;
  name: string;
  distanceKm: number;
  personalDistanceKm: number;
  sharedDistanceKm: number;
  fuelFilledLiters: number;
  fuelPaidAmount: number;
  fuelUsedLiters: number;
  fuelConsumptionCost: number;
  fuelInventoryShareAmount: number;
  fuelNetBalance: number;
  fastagRechargeAmount: number;
  fastagUsedAmount: number;
  fastagBalanceShareAmount: number;
  fastagNetBalance: number;
  trafficFinePaidAmount: number;
  trafficFineShareAmount: number;
  parkingPaidAmount: number;
  parkingShareAmount: number;
  otherPaidAmount: number;
  otherShareAmount: number;
  totalPaidAmount: number;
  fairShareAmount: number;
  netBalance: number;
};

export type ReportExpenseItem = {
  id: string;
  title: string;
  amount: number;
  userId: string;
  userName: string;
  createdAt: number;
};

export type ReportSection = {
  key: "toll" | "misc" | "repairs";
  title: string;
  totalAmount: number;
  items: ReportExpenseItem[];
};

export type ReportTripCalculation = {
  id: string;
  monthKey: string;
  monthLabel: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  drivenBy: string;
  avgFuelRate: number;
  mileage: number;
  costPerKm: number;
  totalCost: number;
  souravCost: number;
  ayanCost: number;
  createdAt: number;
};

export type ReportFuelLogCalculation = {
  id: string;
  monthKey: string;
  monthLabel: string;
  amount: number;
  liters: number;
  rate: number;
  paidByUserId: string;
  paidByUserName: string;
  createdAt: number;
};

export type ReportMileageConfig = {
  monthKey: string;
  monthLabel: string;
  mileage: number;
};

export type ReportMonthlySummary = {
  monthKey: string;
  monthLabel: string;
  totalKm: number;
  souravKm: number;
  ayanKm: number;
  sharedKm: number;
  avgFuelRate: number;
  mileage: number;
  tripFuelCost: number;
  souravTripCost: number;
  ayanTripCost: number;
  fuelFilledLiters: number;
  fuelUsedLiters: number;
  totalFuelUsed: number;
  sharedFuelUsed: number;
  souravFuelUsed: number;
  ayanFuelUsed: number;
  costPerKm: number;
  closingFuelLiters: number;
  closingFuelValue: number;
  fastagUsedAmount: number;
  otherExpenseAmount: number;
  trafficFineAmount: number;
  totalExpense: number;
};

export type ReportSettlementRow = {
  userId: string;
  userName: string;
  paidAmount: number;
  shareAmount: number;
  netBalance: number;
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
    totalDistanceKm: number;
    sharedDistanceKm: number;
    ayanShare: number;
    souravShare: number;
  };
  fuel: {
    openingLiters: number;
    openingValue: number;
    filledLiters: number;
    filledAmount: number;
    usedLiters: number;
    closingLiters: number;
    closingValue: number;
    costPerLiter: number;
    totalFuelCost: number;
    inventoryAdjustmentAmount: number;
  };
  fastag: {
    openingBalance: number;
    rechargeAmount: number;
    usedAmount: number;
    closingBalance: number;
    balanceAdjustmentAmount: number;
    sharedTripTolls: number;
  };
  trafficFine: {
    totalAmount: number;
    totalCount: number;
    byUser: Record<string, number>;
    sharedTripFines: number;
    items: ReportExpenseItem[];
  };
  parking: {
    totalAmount: number;
    totalCount: number;
    byUser: Record<string, number>;
    sharedTripParking: number;
    items: ReportExpenseItem[];
  };
  others: {
    totalSharedAmount: number;
    sections: ReportSection[];
  };
  audit: {
    tripRows: ReportTripCalculation[];
    fuelLogRows: ReportFuelLogCalculation[];
    mileageRows: ReportMileageConfig[];
    monthlySummaries: ReportMonthlySummary[];
    settlementRows: ReportSettlementRow[];
    formulaNotes: string[];
  };
  csv: {
    fileName: string;
    content: string;
  };
  settlement: {
    status: "settled" | "receive" | "pay";
    toneIndex: number;
    amount: number;
    title: string;
    directionMessage: string;
    currentUserMessage: string;
  };
};

type TripSummary = {
  tripId: string;
  start: EntryRecord;
  end: EntryRecord;
  distanceKm: number;
  isShared: boolean;
  drivenBy: string;
  sharesByUser: Record<string, number>;
};

type FuelMonthStats = {
  monthKey: string;
  rates: number[];
  amount: number;
  liters: number;
};

function createEmptyUserSummary(user: ReportUser): ReportUserSummary {
  return {
    id: user.id,
    name: user.name,
    distanceKm: 0,
    personalDistanceKm: 0,
    sharedDistanceKm: 0,
    fuelFilledLiters: 0,
    fuelPaidAmount: 0,
    fuelUsedLiters: 0,
    fuelConsumptionCost: 0,
    fuelInventoryShareAmount: 0,
    fuelNetBalance: 0,
    fastagRechargeAmount: 0,
    fastagUsedAmount: 0,
    fastagBalanceShareAmount: 0,
    fastagNetBalance: 0,
    trafficFinePaidAmount: 0,
    trafficFineShareAmount: 0,
    parkingPaidAmount: 0,
    parkingShareAmount: 0,
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

function roundMeasure(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatSettlementAmount(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function buildExpenseItem(
  entry: EntryRecord,
  fallbackTitle: string,
): ReportExpenseItem {
  return {
    id: entry.id,
    title: (entry.expenseTitle ?? "").trim() || fallbackTitle,
    amount: roundCurrency(entry.cost ?? 0),
    userId: entry.userId,
    userName: entry.userName,
    createdAt: entry.createdAt,
  };
}

function getMonthKey(timestamp: number): string {
  return dayjs(timestamp).format("YYYY-MM");
}

function getShortMonthLabel(monthKey: string): string {
  return dayjs(`${monthKey}-01`).format("MMM");
}

function getMonthLabel(monthKey: string): string {
  return dayjs(`${monthKey}-01`).format(INDIA_MONTH_FORMAT);
}

function isWithinRange(
  timestamp: number,
  startTs: number,
  endTs: number,
): boolean {
  return timestamp >= startTs && timestamp <= endTs;
}

function buildMonthKeysBetween(startTs: number, endTs: number): string[] {
  const keys: string[] = [];
  let cursor = dayjs(startTs).startOf("month");
  const last = dayjs(endTs).startOf("month");

  while (cursor.isBefore(last) || cursor.isSame(last, "month")) {
    keys.push(cursor.format("YYYY-MM"));
    cursor = cursor.add(1, "month");
  }

  return keys;
}

function resolveMonthMileage(
  monthKey: string,
  mileageByMonth: Record<string, number>,
): number {
  const saved = mileageByMonth[monthKey];
  return Number.isFinite(saved) ? saved : DEFAULT_MONTHLY_MILEAGE;
}

function isFastagRecharge(entry: EntryRecord): boolean {
  if (entry.type !== "expense" || typeof entry.cost !== "number") return false;
  if (entry.expenseCategory !== "utility_addon") return false;

  const title = (entry.expenseTitle ?? "").toLowerCase();
  return (
    (title.includes("fastag") || title.includes("fast tag")) &&
    title.includes("recharge")
  );
}

function isFastagToll(entry: EntryRecord): boolean {
  return (
    entry.type === "expense" &&
    entry.expenseCategory === "fasttag_toll_paid" &&
    typeof entry.cost === "number"
  );
}

function isTrafficFine(entry: EntryRecord): boolean {
  return (
    entry.type === "expense" &&
    entry.expenseCategory === "traffic_violation_fine"
  );
}

function isParkingExpense(entry: EntryRecord): boolean {
  return (
    entry.type === "expense" &&
    (entry.expenseCategory === "parking" ||
      (entry.expenseTitle !== null &&
        entry.expenseTitle !== undefined &&
        entry.expenseTitle.toLowerCase().includes("parking")))
  );
}

function getOtherSectionKey(entry: EntryRecord): ReportSection["key"] | null {
  if (isFastagToll(entry)) return "toll";
  if (entry.type !== "expense") return null;
  if (
    isFastagRecharge(entry) ||
    isTrafficFine(entry) ||
    entry.expenseCategory === "purchase"
  )
    return null;

  if (
    entry.expenseCategory === "maintenance_lab" ||
    entry.expenseCategory === "shield_safety"
  ) {
    return "repairs";
  }

  if (
    entry.expenseCategory === "care_comfort" ||
    entry.expenseCategory === "utility_addon" ||
    entry.expenseCategory === "other"
  ) {
    return "misc";
  }

  return null;
}

function getUserName(userId: string): string {
  return ALLOWED_USERS.find((user) => user.id === userId)?.name ?? userId;
}

function getEqualShares(
  amount: number,
  users: ReportUser[],
): Record<string, number> {
  const share = users.length > 0 ? amount / users.length : 0;
  return Object.fromEntries(users.map((user) => [user.id, share]));
}

function buildTrips(
  entries: EntryRecord[],
  users: ReportUser[],
): TripSummary[] {
  const odometerEntries = entries.filter(
    (entry): entry is EntryRecord =>
      entry.type === "odometer" &&
      typeof entry.tripId === "string" &&
      typeof entry.tripStage === "string",
  );

  const buckets = new Map<string, { start?: EntryRecord; end?: EntryRecord }>();
  for (const entry of odometerEntries) {
    const bucket = buckets.get(entry.tripId!) ?? {};
    if (entry.tripStage === "start") bucket.start = entry;
    if (entry.tripStage === "end") bucket.end = entry;
    buckets.set(entry.tripId!, bucket);
  }

  const trips: TripSummary[] = [];
  for (const [tripId, bucket] of buckets.entries()) {
    if (!bucket.start || !bucket.end) continue;

    const distanceKm =
      typeof bucket.end.tripDistanceKm === "number"
        ? bucket.end.tripDistanceKm
        : bucket.end.odometer - bucket.start.odometer;

    if (!Number.isFinite(distanceKm) || distanceKm <= 0) continue;

    const isShared = Boolean(bucket.start.sharedTrip || bucket.end.sharedTrip);
    const sharesByUser = isShared
      ? getEqualShares(distanceKm, users)
      : { [bucket.end.userId]: distanceKm };

    trips.push({
      tripId,
      start: bucket.start,
      end: bucket.end,
      distanceKm,
      isShared,
      drivenBy: isShared ? "Shared" : getUserName(bucket.end.userId),
      sharesByUser,
    });
  }

  return trips.sort((left, right) => left.end.createdAt - right.end.createdAt);
}

function findTripByOdometer(
  trips: TripSummary[],
  odometer: number,
): TripSummary | null {
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
  const startLabel = dayjs(startTs).format("DD MMM YYYY");
  const endLabel = dayjs(endTs).format("DD MMM YYYY");
  return `${startLabel} - ${endLabel}`;
}

function getFuelAmount(entry: EntryRecord): number | null {
  if (entry.type !== "fuel") return null;
  const amount =
    typeof entry.fuelAmount === "number" ? entry.fuelAmount : entry.cost;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function getFuelLiters(entry: EntryRecord): number | null {
  if (entry.type !== "fuel") return null;
  return typeof entry.fuelLiters === "number" &&
    Number.isFinite(entry.fuelLiters)
    ? entry.fuelLiters
    : null;
}

function buildFuelLogRows(
  entries: EntryRecord[],
  monthKeysInRange: string[],
): ReportFuelLogCalculation[] {
  const monthSet = new Set(monthKeysInRange);

  return entries
    .filter(
      (entry) =>
        entry.type === "fuel" && monthSet.has(getMonthKey(entry.createdAt)),
    )
    .map((entry) => {
      const amount = getFuelAmount(entry) ?? 0;
      const liters = getFuelLiters(entry) ?? 0;
      return {
        id: entry.id,
        monthKey: getMonthKey(entry.createdAt),
        monthLabel: getShortMonthLabel(getMonthKey(entry.createdAt)),
        amount,
        liters,
        rate: amount > 0 && liters > 0 ? amount / liters : 0,
        paidByUserId: entry.userId,
        paidByUserName: entry.userName,
        createdAt: entry.createdAt,
      };
    })
    .sort((left, right) => left.createdAt - right.createdAt);
}

function buildFuelStatsByMonth(
  entries: EntryRecord[],
): Map<string, FuelMonthStats> {
  const statsByMonth = new Map<string, FuelMonthStats>();

  for (const entry of entries) {
    if (entry.type !== "fuel") continue;

    const amount = getFuelAmount(entry);
    const liters = getFuelLiters(entry);
    if (!amount || !liters || amount <= 0 || liters <= 0) continue;

    const monthKey = getMonthKey(entry.createdAt);
    const stats = statsByMonth.get(monthKey) ?? {
      monthKey,
      rates: [],
      amount: 0,
      liters: 0,
    };

    stats.rates.push(amount / liters);
    stats.amount += amount;
    stats.liters += liters;
    statsByMonth.set(monthKey, stats);
  }

  return statsByMonth;
}

function getAverageFuelRate(
  monthKey: string,
  statsByMonth: Map<string, FuelMonthStats>,
): number {
  const stats = statsByMonth.get(monthKey);
  if (!stats || stats.rates.length === 0) return 0;
  return (
    stats.rates.reduce((total, rate) => total + rate, 0) / stats.rates.length
  );
}

function getLatestFuelRateAtOrBefore(
  timestamp: number,
  fuelLogRows: ReportFuelLogCalculation[],
): number {
  let latest: ReportFuelLogCalculation | null = null;
  for (const row of fuelLogRows) {
    if (
      row.createdAt <= timestamp &&
      row.rate > 0 &&
      (!latest || row.createdAt > latest.createdAt)
    ) {
      latest = row;
    }
  }
  return latest?.rate ?? 0;
}

function calculateFuelUsedLiters(
  trips: TripSummary[],
  mileageByMonth: Record<string, number>,
): number {
  let usedLiters = 0;

  for (const trip of trips) {
    const monthKey = getMonthKey(trip.end.createdAt);
    const mileage = resolveMonthMileage(monthKey, mileageByMonth);
    if (!Number.isFinite(mileage) || mileage <= 0) continue;
    usedLiters += trip.distanceKm / mileage;
  }

  return usedLiters;
}

function calculateFuelFilledLiters(entries: EntryRecord[]): number {
  return entries.reduce(
    (total, entry) => total + (getFuelLiters(entry) ?? 0),
    0,
  );
}

function buildCsvContent(params: {
  rangeLabel: string;
  tripRows: ReportTripCalculation[];
  fuelLogRows: ReportFuelLogCalculation[];
  mileageRows: ReportMileageConfig[];
  monthlySummaries: ReportMonthlySummary[];
  settlementRows: ReportSettlementRow[];
}): string {
  const {
    rangeLabel,
    tripRows,
    fuelLogRows,
    mileageRows,
    monthlySummaries,
    settlementRows,
  } = params;

  const tripTotal = tripRows.reduce((total, row) => total + row.totalCost, 0);
  const souravTripTotal = tripRows.reduce(
    (total, row) => total + row.souravCost,
    0,
  );
  const ayanTripTotal = tripRows.reduce(
    (total, row) => total + row.ayanCost,
    0,
  );
  const mileageStartIndex = fuelLogRows.length + 4;
  const totalsIndex = tripRows.length + 3;
  const monthlyStartIndex = totalsIndex + 3;
  const settlementStartIndex = monthlyStartIndex + monthlySummaries.length + 3;
  const rowCount = Math.max(
    settlementStartIndex + settlementRows.length + 2,
    mileageStartIndex + mileageRows.length + 2,
    fuelLogRows.length + 3,
  );

  const rows = Array.from({ length: rowCount }, () =>
    Array<string | number | null>(17).fill(null),
  );

  rows[0][0] = "Month";
  rows[0][1] = "Start";
  rows[0][2] = "End";
  rows[0][3] = "KM Driven";
  rows[0][4] = "Driven By";
  rows[0][5] = "Avg Fuel Rate";
  rows[0][6] = "Mileage";
  rows[0][7] = "Cost/KM";
  rows[0][8] = "Trip Cost Total";
  rows[0][9] = "Trip Cost Sourav";
  rows[0][10] = "Trip Cost Ayan";
  rows[0][12] = "Fuel Log";
  rows[0][16] = rangeLabel;

  tripRows.forEach((row, index) => {
    const target = rows[index + 1];
    target[0] = row.monthLabel;
    target[1] = row.startOdometer;
    target[2] = row.endOdometer;
    target[3] = row.distanceKm;
    target[4] = row.drivenBy;
    target[5] = row.avgFuelRate;
    target[6] = row.mileage;
    target[7] = row.costPerKm;
    target[8] = row.totalCost;
    target[9] = row.souravCost;
    target[10] = row.ayanCost;
  });

  rows[1][12] = "Month";
  rows[1][13] = "Amount";
  rows[1][14] = "Qty";
  rows[1][15] = "Rate";
  rows[1][16] = "Paid By";
  fuelLogRows.forEach((row, index) => {
    const target = rows[index + 2];
    target[12] = row.monthLabel;
    target[13] = row.amount;
    target[14] = row.liters;
    target[15] = row.rate;
    target[16] = row.paidByUserName;
  });

  rows[mileageStartIndex][12] = "Mileage Config";
  rows[mileageStartIndex + 1][12] = "Month";
  rows[mileageStartIndex + 1][13] = "Mileage";
  mileageRows.forEach((row, index) => {
    const target = rows[mileageStartIndex + 2 + index];
    target[12] = row.monthLabel;
    target[13] = row.mileage;
  });

  rows[totalsIndex][7] = "Totals";
  rows[totalsIndex][8] = roundCurrency(tripTotal);
  rows[totalsIndex][9] = roundCurrency(souravTripTotal);
  rows[totalsIndex][10] = roundCurrency(ayanTripTotal);

  rows[monthlyStartIndex][0] = "Monthly Summary";
  rows[monthlyStartIndex + 1][0] = "Month";
  rows[monthlyStartIndex + 1][1] = "Total KM";
  rows[monthlyStartIndex + 1][2] = "Sourav KM";
  rows[monthlyStartIndex + 1][3] = "Ayan KM";
  rows[monthlyStartIndex + 1][4] = "Shared KM";
  rows[monthlyStartIndex + 1][5] = "Fuel Left";
  rows[monthlyStartIndex + 1][6] = "Fuel Value";
  rows[monthlyStartIndex + 1][7] = "Trip Fuel Cost";
  rows[monthlyStartIndex + 1][8] = "FASTag Used";
  rows[monthlyStartIndex + 1][9] = "Other Expenses";
  rows[monthlyStartIndex + 1][10] = "Total Expense";
  monthlySummaries.forEach((row, index) => {
    const target = rows[monthlyStartIndex + 2 + index];
    target[0] = row.monthLabel;
    target[1] = row.totalKm;
    target[2] = row.souravKm;
    target[3] = row.ayanKm;
    target[4] = row.sharedKm;
    target[5] = row.closingFuelLiters;
    target[6] = row.closingFuelValue;
    target[7] = row.tripFuelCost;
    target[8] = row.fastagUsedAmount;
    target[9] = row.otherExpenseAmount;
    target[10] = row.totalExpense;
  });

  rows[settlementStartIndex][0] = "Settlement";
  rows[settlementStartIndex + 1][0] = "User";
  rows[settlementStartIndex + 1][1] = "Paid";
  rows[settlementStartIndex + 1][2] = "Fair Share";
  rows[settlementStartIndex + 1][3] = "Net Balance";
  settlementRows.forEach((row, index) => {
    const target = rows[settlementStartIndex + 2 + index];
    target[0] = row.userName;
    target[1] = row.paidAmount;
    target[2] = row.shareAmount;
    target[3] = row.netBalance;
  });

  return rows
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return "";
          const text = String(value);
          if (/[",\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
          }
          return text;
        })
        .join(","),
    )
    .join("\n");
}

function buildCsvFileName(range: ReportRangeInput): string {
  const suffix =
    range.filterMode === "month" && range.monthKey
      ? range.monthKey
      : `${dayjs(range.startTs).format("YYYYMMDD")}-${dayjs(range.endTs).format("YYYYMMDD")}`;
  return `grand-i10-report-${suffix}.csv`;
}

export function buildExpenseReport(params: {
  entries: EntryRecord[];
  currentUserId?: string | null;
  mileageByMonth: Record<string, number>;
  settledMonths: Record<string, boolean>;
  range: ReportRangeInput;
}): ExpenseReport {
  const { entries, currentUserId, mileageByMonth, settledMonths, range } =
    params;

  const users: ReportUser[] = ALLOWED_USERS.map((user) => ({
    id: user.id,
    name: user.name,
  }));
  const usersById = Object.fromEntries(
    users.map((user) => [user.id, createEmptyUserSummary(user)]),
  ) as Record<string, ReportUserSummary>;

  const monthKeysInRange = buildMonthKeysBetween(range.startTs, range.endTs);
  const rangeLabel = formatRangeLabel(range.startTs, range.endTs);
  const sortedEntries = [...entries].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const entriesInRange = sortedEntries.filter((entry) =>
    isWithinRange(entry.createdAt, range.startTs, range.endTs),
  );
  const entriesBeforeRange = sortedEntries.filter(
    (entry) => entry.createdAt < range.startTs,
  );
  const fuelStatsByMonth = buildFuelStatsByMonth(sortedEntries);
  const fuelLogRows = buildFuelLogRows(sortedEntries, monthKeysInRange);
  const allFuelLogRows = buildFuelLogRows(
    sortedEntries,
    Array.from(
      new Set(sortedEntries.map((entry) => getMonthKey(entry.createdAt))),
    ),
  );
  const trips = buildTrips(sortedEntries, users);
  const tripsInRange = trips.filter((trip) =>
    isWithinRange(trip.end.createdAt, range.startTs, range.endTs),
  );
  const tripsBeforeRange = trips.filter(
    (trip) => trip.end.createdAt < range.startTs,
  );
  const warnings = new Set<string>();

  const mileageSnapshot = Object.fromEntries(
    monthKeysInRange.map((monthKey) => [
      monthKey,
      resolveMonthMileage(monthKey, mileageByMonth),
    ]),
  ) as Record<string, number>;

  const mileageRows = monthKeysInRange.map((monthKey) => ({
    monthKey,
    monthLabel: getShortMonthLabel(monthKey),
    mileage: resolveMonthMileage(monthKey, mileageByMonth),
  }));

  let totalFuelUsedLiters = 0;
  let totalTripFuelCost = 0;
  let totalFuelFilledLiters = 0;
  let totalFuelPaidAmount = 0;
  let totalFastagRecharge = 0;
  let totalFastagRechargeBefore = 0;
  let totalFastagUsed = 0;
  let totalFastagUsedBefore = 0;
  let totalSharedTripTolls = 0;
  let totalSharedTripFines = 0;
  let totalParkingAmount = 0;
  let totalSharedTripParking = 0;
  let totalOtherSharedAmount = 0;
  let totalTrafficFineAmount = 0;

  const trafficFineByUser = Object.fromEntries(
    users.map((user) => [user.id, 0]),
  ) as Record<string, number>;
  const trafficFineItems: ReportExpenseItem[] = [];

  const parkingByUser = Object.fromEntries(
    users.map((user) => [user.id, 0]),
  ) as Record<string, number>;
  const parkingItems: ReportExpenseItem[] = [];

  const otherSections = new Map<ReportSection["key"], ReportSection>([
    [
      "toll",
      { key: "toll", title: "Toll Expenses", totalAmount: 0, items: [] },
    ],
    [
      "misc",
      { key: "misc", title: "Misc Expenses", totalAmount: 0, items: [] },
    ],
    [
      "repairs",
      {
        key: "repairs",
        title: "Repairs & Maintenance",
        totalAmount: 0,
        items: [],
      },
    ],
  ]);

  const tripRows: ReportTripCalculation[] = [];

  for (const trip of tripsInRange) {
    const monthKey = getMonthKey(trip.end.createdAt);
    const mileage = resolveMonthMileage(monthKey, mileageByMonth);
    const avgFuelRate = getAverageFuelRate(monthKey, fuelStatsByMonth);
    const hasValidMileage = Number.isFinite(mileage) && mileage > 0;
    const hasValidFuelRate = Number.isFinite(avgFuelRate) && avgFuelRate > 0;

    if (!hasValidMileage) {
      warnings.add(
        `Fuel calculation is blocked because mileage for ${getMonthLabel(monthKey)} is 0 or invalid.`,
      );
    }

    if (!hasValidFuelRate) {
      warnings.add(
        `No fuel refill rate exists for ${getMonthLabel(monthKey)}, so trip fuel cost for that month is shown as 0.`,
      );
    }

    const costPerKm =
      hasValidMileage && hasValidFuelRate ? avgFuelRate / mileage : 0;
    const tripFuelUsedLiters = hasValidMileage ? trip.distanceKm / mileage : 0;
    const tripTotalCost = trip.distanceKm * costPerKm;
    const tripCostShares = Object.fromEntries(
      Object.entries(trip.sharesByUser).map(([userId, distanceShare]) => [
        userId,
        trip.distanceKm > 0
          ? tripTotalCost * (distanceShare / trip.distanceKm)
          : 0,
      ]),
    );

    tripRows.push({
      id: trip.tripId,
      monthKey,
      monthLabel: getShortMonthLabel(monthKey),
      startOdometer: trip.start.odometer,
      endOdometer: trip.end.odometer,
      distanceKm: roundMeasure(trip.distanceKm),
      drivenBy: trip.drivenBy,
      avgFuelRate,
      mileage,
      costPerKm,
      totalCost: tripTotalCost,
      souravCost: tripCostShares.sourav || 0,
      ayanCost: tripCostShares.ayan || 0,
      createdAt: trip.end.createdAt,
    });

    // Add trip costs to user's fuel consumption cost
    for (const [userId, cost] of Object.entries(tripCostShares)) {
      const user = usersById[userId];
      if (user) {
        user.fuelConsumptionCost += cost;
      }
    }
  }

  for (const entry of entriesBeforeRange) {
    if (isFastagRecharge(entry)) {
      totalFastagRechargeBefore += entry.cost ?? 0;
      continue;
    }

    if (isFastagToll(entry)) {
      totalFastagUsedBefore += entry.cost ?? 0;
    }
  }

  for (const entry of entriesInRange) {
    if (entry.type === "fuel") {
      const amount = getFuelAmount(entry);
      const liters = getFuelLiters(entry);
      const target = usersById[entry.userId];

      if (target && typeof amount === "number") {
        target.fuelPaidAmount += amount;
      }
      if (target && typeof liters === "number") {
        target.fuelFilledLiters += liters;
      }

      if (typeof amount === "number") {
        totalFuelPaidAmount += amount;
      }
      if (typeof liters === "number") {
        totalFuelFilledLiters += liters;
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

      // Track shared trip tolls separately
      if (entry.sharedTrip) {
        totalSharedTripTolls += amount;
      }

      const matchedTrip = findTripByOdometer(trips, entry.odometer);
      let sharesByUser: Record<string, number>;

      if (entry.sharedTrip) {
        // For shared trip tolls, split 50-50 between Ayan and Sourav
        sharesByUser = {
          ayan: amount / 2,
          sourav: amount / 2,
        };
      } else if (matchedTrip) {
        // For trip-related tolls, assign to user who was tagged/associated with trip
        sharesByUser = Object.fromEntries(
          Object.entries(matchedTrip.sharesByUser).map(
            ([userId, distanceShare]) => [
              userId,
              matchedTrip.distanceKm > 0
                ? amount * (distanceShare / matchedTrip.distanceKm)
                : 0,
            ],
          ),
        );
      } else {
        // If no trip found, assign to user who paid
        sharesByUser = { [entry.userId]: amount };
      }

      for (const [userId, value] of Object.entries(sharesByUser)) {
        const target = usersById[userId];
        if (!target) continue;
        target.fastagUsedAmount += value;
      }

      continue;
    }

    if (isTrafficFine(entry) && typeof entry.cost === "number") {
      const amount = entry.cost;
      const payer = usersById[entry.userId];
      if (payer) {
        payer.trafficFinePaidAmount += amount;
      }

      // Track shared trip fines separately
      if (entry.sharedTrip) {
        totalSharedTripFines += amount;
        // For shared fines, split 50-50 between Ayan and Sourav
        const halfShare = amount / 2;
        usersById.ayan.trafficFineShareAmount += halfShare;
        usersById.sourav.trafficFineShareAmount += halfShare;
      } else {
        // For individual fines, assign to tagged user (entry.userId)
        trafficFineByUser[entry.userId] =
          (trafficFineByUser[entry.userId] ?? 0) + amount;
        // Only add to share amount for the responsible user
        const responsibleUser = usersById[entry.userId];
        if (responsibleUser) {
          responsibleUser.trafficFineShareAmount += amount;
        }
      }

      totalTrafficFineAmount += amount;
      trafficFineItems.push(buildExpenseItem(entry, "Traffic Fine"));
    if (
      (entry.type as EntryType) === "fuel" ||
      isParkingExpense(entry) ||
      isFastagRecharge(entry) ||
      isFastagToll(entry) ||
      isTrafficFine(entry) ||
      entry.tripId // Exclude any expense that's part of a trip
    ) {
      continue;
    }

    const sectionKey = getOtherSectionKey(entry);
    if (!sectionKey || typeof entry.cost !== "number") {
      continue;
    }

    console.log("Entry incorrectly categorized in Others:", entry);
    console.log("Section Key:", sectionKey);
    const section = otherSections.get(sectionKey);
    if (section) {
      section.totalAmount += entry.cost;
      section.items.push(buildExpenseItem(entry, section.title));
    }

    const payer = usersById[entry.userId];
    if (payer) {
      payer.otherPaidAmount += entry.cost;
    }

    // For others expenses, always split 50-50 between Ayan and Sourav
    const halfShare = entry.cost / 2;
    usersById.ayan.otherShareAmount += halfShare;
    usersById.sourav.otherShareAmount += halfShare;
    totalOtherSharedAmount += entry.cost;
  }

  const totalFuelFilledBefore = calculateFuelFilledLiters(entriesBeforeRange);
  const totalFuelUsedBefore = calculateFuelUsedLiters(
    tripsBeforeRange,
    mileageByMonth,
  );
  const openingFuelLiters = clampNonNegative(
    totalFuelFilledBefore - totalFuelUsedBefore,
  );
  const closingFuelLiters = clampNonNegative(
    openingFuelLiters + totalFuelFilledLiters - totalFuelUsedLiters,
  );
  const openingFastagBalance = clampNonNegative(
    totalFastagRechargeBefore - totalFastagUsedBefore,
  );
  const closingFastagBalance = clampNonNegative(
    openingFastagBalance + totalFastagRecharge - totalFastagUsed,
  );
  const blendedCostPerLiter =
    totalFuelUsedLiters > 0 ? totalTripFuelCost / totalFuelUsedLiters : 0;
  const displayedFuelRates = monthKeysInRange
    .map((monthKey) => getAverageFuelRate(monthKey, fuelStatsByMonth))
    .filter((rate) => rate > 0);
  const displayedCostPerLiter =
    displayedFuelRates.length > 0
      ? displayedFuelRates.reduce((total, rate) => total + rate, 0) /
        displayedFuelRates.length
      : blendedCostPerLiter;
  const openingFuelRate = getLatestFuelRateAtOrBefore(
    range.startTs - 1,
    allFuelLogRows,
  );
  const closingMonthKey = getMonthKey(range.endTs);
  const closingFuelRate =
    getAverageFuelRate(closingMonthKey, fuelStatsByMonth) ||
    getLatestFuelRateAtOrBefore(range.endTs, allFuelLogRows);
  const openingFuelValue = openingFuelLiters * openingFuelRate;
  const closingFuelValue = closingFuelLiters * closingFuelRate;
  const fuelInventoryAdjustment = totalFuelPaidAmount - totalTripFuelCost;
  const fastagBalanceAdjustment = totalFastagRecharge - totalFastagUsed;

  for (const user of users) {
    usersById[user.id].fuelInventoryShareAmount =
      fuelInventoryAdjustment / users.length;
    usersById[user.id].fastagBalanceShareAmount =
      fastagBalanceAdjustment / users.length;
  }

  for (const user of users) {
    const summary = usersById[user.id];
    summary.distanceKm = roundMeasure(summary.distanceKm);
    summary.personalDistanceKm = roundMeasure(summary.personalDistanceKm);
    summary.sharedDistanceKm = roundMeasure(summary.sharedDistanceKm);
    summary.fuelFilledLiters = roundMeasure(summary.fuelFilledLiters);
    summary.fuelUsedLiters = roundMeasure(summary.fuelUsedLiters);
    summary.fuelPaidAmount = roundCurrency(summary.fuelPaidAmount);
    summary.fuelConsumptionCost = roundCurrency(summary.fuelConsumptionCost);
    summary.fuelInventoryShareAmount = roundCurrency(
      summary.fuelInventoryShareAmount,
    );
    summary.fuelNetBalance = roundCurrency(
      summary.fuelPaidAmount -
        summary.fuelConsumptionCost -
        summary.fuelInventoryShareAmount,
    );
    summary.fastagRechargeAmount = roundCurrency(summary.fastagRechargeAmount);
    summary.fastagUsedAmount = roundCurrency(summary.fastagUsedAmount);
    summary.fastagBalanceShareAmount = roundCurrency(
      summary.fastagBalanceShareAmount,
    );
    summary.fastagNetBalance = roundCurrency(
      summary.fastagRechargeAmount -
        summary.fastagUsedAmount -
        summary.fastagBalanceShareAmount,
    );
    summary.trafficFinePaidAmount = roundCurrency(
      summary.trafficFinePaidAmount,
    );
    summary.trafficFineShareAmount = roundCurrency(
      summary.trafficFineShareAmount,
    );
    summary.otherPaidAmount = roundCurrency(summary.otherPaidAmount);
    summary.otherShareAmount = roundCurrency(summary.otherShareAmount);
    summary.totalPaidAmount = roundCurrency(
      summary.fuelPaidAmount +
        summary.fastagRechargeAmount +
        summary.trafficFinePaidAmount +
        summary.otherPaidAmount,
    );
    summary.fairShareAmount = roundCurrency(
      summary.fuelConsumptionCost +
        summary.fastagUsedAmount +
        summary.trafficFineShareAmount +
        summary.otherShareAmount,
    );
    summary.netBalance = roundCurrency(
      summary.totalPaidAmount - summary.fairShareAmount,
    );
  }

  const monthlySummaries = monthKeysInRange.map((monthKey) => {
    const monthStartTs = Math.max(
      dayjs(`${monthKey}-01`).startOf("month").valueOf(),
      range.startTs,
    );
    const monthEndTs = Math.min(
      dayjs(`${monthKey}-01`).endOf("month").valueOf(),
      range.endTs,
    );
    const monthTrips = tripsInRange.filter(
      (trip) => getMonthKey(trip.end.createdAt) === monthKey,
    );
    const monthTripRows = tripRows.filter((row) => row.monthKey === monthKey);
    const monthEntries = entriesInRange.filter((entry) =>
      isWithinRange(entry.createdAt, monthStartTs, monthEndTs),
    );
    const fuelUsedLiters = calculateFuelUsedLiters(monthTrips, mileageByMonth);
    const fuelFilledLiters = calculateFuelFilledLiters(monthEntries);
    const usedUntilMonthEnd = calculateFuelUsedLiters(
      trips.filter((trip) => trip.end.createdAt <= monthEndTs),
      mileageByMonth,
    );
    const filledUntilMonthEnd = calculateFuelFilledLiters(
      sortedEntries.filter((entry) => entry.createdAt <= monthEndTs),
    );
    const closingLiters = clampNonNegative(
      filledUntilMonthEnd - usedUntilMonthEnd,
    );
    const avgFuelRate = getAverageFuelRate(monthKey, fuelStatsByMonth);
    const fuelRateForValue =
      avgFuelRate || getLatestFuelRateAtOrBefore(monthEndTs, allFuelLogRows);
    const totalKm = monthTrips.reduce(
      (total, trip) => total + trip.distanceKm,
      0,
    );
    const sharedKm = monthTrips
      .filter((trip) => trip.isShared)
      .reduce((total, trip) => total + trip.distanceKm, 0);
    const souravKm = monthTrips
      .filter((trip) => !trip.isShared && trip.end.userId === "sourav")
      .reduce((total, trip) => total + trip.distanceKm, 0);
    const ayanKm = monthTrips
      .filter((trip) => !trip.isShared && trip.end.userId === "ayan")
      .reduce((total, trip) => total + trip.distanceKm, 0);

    // Calculate fuel used based on mileage values
    const monthMileage = resolveMonthMileage(monthKey, mileageByMonth);
    const costPerKm =
      Number.isFinite(avgFuelRate) && avgFuelRate > 0 && monthMileage > 0
        ? avgFuelRate / monthMileage
        : 0;
    const totalFuelUsed =
      monthMileage > 0 && costPerKm > 0 ? totalKm / monthMileage : 0;
    const sharedFuelUsed =
      monthMileage > 0 && costPerKm > 0 ? sharedKm / monthMileage : 0;
    const souravFuelUsed =
      monthMileage > 0 && costPerKm > 0 ? souravKm / monthMileage : 0;
    const ayanFuelUsed =
      monthMileage > 0 && costPerKm > 0 ? ayanKm / monthMileage : 0;
    const fastagUsedAmount = monthEntries
      .filter(isFastagToll)
      .reduce((total, entry) => total + (entry.cost ?? 0), 0);
    const otherExpenseAmount = monthEntries
      .filter((entry) => {
        // Only include expenses that have an other section key and are not trip-related or fuel
        const hasOtherSectionKey = Boolean(getOtherSectionKey(entry));
        const isNotToll = !isFastagToll(entry);
        const isNotFuel = entry.type !== "fuel"; // Explicitly exclude fuel expenses
        const isNotTripRelated = !entry.tripId; // Exclude expenses that are part of trips
        return hasOtherSectionKey && isNotToll && isNotFuel && isNotTripRelated;
      })
      .reduce((total, entry) => total + (entry.cost ?? 0), 0);
    const trafficFineAmount = monthEntries
      .filter((entry) => isTrafficFine(entry) && typeof entry.cost === "number")
      .reduce((total, entry) => total + (entry.cost ?? 0), 0);
    // Calculate fuel cost using the same logic as totalFuelUsed calculation
    const tripFuelCost =
      monthMileage > 0 && totalKm > 0
        ? (totalKm / monthMileage) * fuelRateForValue
        : 0;

    return {
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      totalKm: roundMeasure(totalKm),
      souravKm: roundMeasure(souravKm),
      ayanKm: roundMeasure(ayanKm),
      sharedKm: roundMeasure(sharedKm),
      avgFuelRate: roundCurrency(avgFuelRate),
      mileage: roundMeasure(resolveMonthMileage(monthKey, mileageByMonth)),
      tripFuelCost: roundCurrency(tripFuelCost),
      souravTripCost: roundCurrency(
        monthTripRows.reduce((total, row) => total + row.souravCost, 0),
      ),
      ayanTripCost: roundCurrency(
        monthTripRows.reduce((total, row) => total + row.ayanCost, 0),
      ),
      fuelFilledLiters: roundMeasure(fuelFilledLiters),
      fuelUsedLiters: roundMeasure(fuelUsedLiters),
      totalFuelUsed: roundMeasure(totalFuelUsed),
      sharedFuelUsed: roundMeasure(sharedFuelUsed),
      souravFuelUsed: roundMeasure(souravFuelUsed),
      ayanFuelUsed: roundMeasure(ayanFuelUsed),
      costPerKm: roundCurrency(costPerKm),
      closingFuelLiters: roundMeasure(closingLiters),
      closingFuelValue: roundCurrency(closingLiters * fuelRateForValue),
      fastagUsedAmount: roundCurrency(fastagUsedAmount),
      otherExpenseAmount: roundCurrency(otherExpenseAmount),
      trafficFineAmount: roundCurrency(trafficFineAmount),
      totalExpense: roundCurrency(
        tripFuelCost +
          fastagUsedAmount +
          otherExpenseAmount +
          trafficFineAmount,
      ),
    };
  });

  const totalDistanceKm = tripsInRange.reduce(
    (total, trip) => total + trip.distanceKm,
    0,
  );
  const sharedDistanceKm = tripsInRange
    .filter((trip) => trip.isShared)
    .reduce((total, trip) => total + trip.distanceKm, 0);

  // Calculate total trip cost by summing monthly trip costs (same as Trip Summary calculation)
  const totalTripCost = monthlySummaries.reduce(
    (total, month) => total + month.totalKm * month.costPerKm,
    0,
  );

  const totalExpense = roundCurrency(
    totalTripCost +
      totalFastagUsed +
      totalParkingAmount +
      totalTrafficFineAmount +
      totalOtherSharedAmount,
  );

  const ayanShare = usersById.ayan?.fairShareAmount ?? 0;
  const souravShare = usersById.sourav?.fairShareAmount ?? 0;
  const ayanNet = usersById.ayan?.netBalance ?? 0;
  const souravNet = usersById.sourav?.netBalance ?? 0;

  const activeUserId =
    currentUserId && usersById[currentUserId] ? currentUserId : "sourav";
  const activeUser = usersById[activeUserId];
  const receiveUser = ayanNet >= souravNet ? usersById.ayan : usersById.sourav;
  const payUser = receiveUser.id === "ayan" ? usersById.sourav : usersById.ayan;
  const settlementAmount = roundCurrency(
    Math.min(Math.abs(payUser.netBalance), Math.abs(receiveUser.netBalance)),
  );
  const monthIsSettled = Boolean(
    range.monthKey && settledMonths[range.monthKey],
  );

  let settlementStatus: ExpenseReport["settlement"]["status"] = "settled";
  let title = "Settled";
  let directionMessage = "No payment pending";
  let currentUserMessage = "Settled for this month";
  let toneIndex = 2;

  if (!monthIsSettled && settlementAmount >= SETTLEMENT_EPSILON) {
    const isActiveUserReceiver = activeUser.id === receiveUser.id;
    settlementStatus = isActiveUserReceiver ? "receive" : "pay";
    title = "Pending settlement";
    directionMessage = `${payUser.name} pays ${receiveUser.name}`;
    currentUserMessage = isActiveUserReceiver
      ? `You receive ${formatSettlementAmount(settlementAmount)} from ${payUser.name}`
      : `You pay ${formatSettlementAmount(settlementAmount)} to ${receiveUser.name}`;
    toneIndex = isActiveUserReceiver ? 1 : 0;
  }

  const settlementRows = users.map((user) => ({
    userId: user.id,
    userName: user.name,
    paidAmount: usersById[user.id].totalPaidAmount,
    shareAmount: usersById[user.id].fairShareAmount,
    netBalance: usersById[user.id].netBalance,
  }));

  const csv = {
    fileName: buildCsvFileName(range),
    content: buildCsvContent({
      rangeLabel,
      tripRows: tripRows.map((row) => ({
        ...row,
        avgFuelRate: roundCurrency(row.avgFuelRate),
        costPerKm: roundCurrency(row.costPerKm),
        totalCost: roundCurrency(row.totalCost),
        souravCost: roundCurrency(row.souravCost),
        ayanCost: roundCurrency(row.ayanCost),
      })),
      fuelLogRows: fuelLogRows.map((row) => ({
        ...row,
        amount: roundCurrency(row.amount),
        liters: roundMeasure(row.liters),
        rate: roundCurrency(row.rate),
      })),
      mileageRows,
      monthlySummaries,
      settlementRows,
    }),
  };

  const fuelCalculationBlocked = warnings.size > 0;
  const hasFuelData = fuelLogRows.some(
    (row) => row.amount > 0 && row.liters > 0,
  );

  return {
    users,
    usersById,
    rangeLabel,
    monthKeysInRange,
    mileageByMonth: mileageSnapshot,
    mileageEditorMonthKey:
      range.filterMode === "month" ? (range.monthKey ?? null) : null,
    mileageEditorValue:
      range.filterMode === "month" && range.monthKey
        ? resolveMonthMileage(range.monthKey, mileageByMonth)
        : DEFAULT_MONTHLY_MILEAGE,
    isSettled: monthIsSettled,
    canEditMileage:
      range.filterMode === "month" &&
      Boolean(range.monthKey) &&
      !monthIsSettled,
    hasTrips: tripsInRange.length > 0,
    hasFuelData,
    fuelCalculationBlocked,
    warnings: Array.from(warnings),
    summary: {
      totalExpense,
      totalTrips: tripsInRange.length,
      totalDistanceKm: roundMeasure(totalDistanceKm),
      sharedDistanceKm: roundMeasure(sharedDistanceKm),
      ayanShare,
      souravShare,
    },
    fuel: {
      openingLiters: roundMeasure(openingFuelLiters),
      openingValue: roundCurrency(openingFuelValue),
      filledLiters: roundMeasure(totalFuelFilledLiters),
      filledAmount: roundCurrency(totalFuelPaidAmount),
      usedLiters: roundMeasure(totalFuelUsedLiters),
      closingLiters: roundMeasure(closingFuelLiters),
      closingValue: roundCurrency(closingFuelValue),
      costPerLiter: roundCurrency(displayedCostPerLiter),
      totalFuelCost: roundCurrency(totalTripFuelCost),
      inventoryAdjustmentAmount: roundCurrency(fuelInventoryAdjustment),
    },
    fastag: {
      openingBalance: roundCurrency(openingFastagBalance),
      rechargeAmount: roundCurrency(totalFastagRecharge),
      usedAmount: roundCurrency(totalFastagUsed),
      closingBalance: roundCurrency(closingFastagBalance),
      balanceAdjustmentAmount: roundCurrency(fastagBalanceAdjustment),
      sharedTripTolls: roundCurrency(totalSharedTripTolls),
    },
    trafficFine: {
      totalAmount: roundCurrency(totalTrafficFineAmount),
      totalCount: trafficFineItems.length,
      byUser: Object.fromEntries(
        Object.entries(trafficFineByUser).map(([userId, value]) => [
          userId,
          roundCurrency(value),
        ]),
      ),
      sharedTripFines: roundCurrency(totalSharedTripFines),
      items: [...trafficFineItems].sort(
        (left, right) => right.createdAt - left.createdAt,
      ),
    },
    parking: {
      totalAmount: roundCurrency(totalParkingAmount),
      totalCount: parkingItems.length,
      byUser: Object.fromEntries(
        Object.entries(parkingByUser).map(([userId, value]) => [
          userId,
          roundCurrency(value),
        ]),
      ),
      sharedTripParking: roundCurrency(totalSharedTripParking),
      items: [...parkingItems].sort(
        (left, right) => right.createdAt - left.createdAt,
      ),
    },
    others: {
      totalSharedAmount: roundCurrency(totalOtherSharedAmount),
      sections: Array.from(otherSections.values())
        .map((section) => ({
          ...section,
          totalAmount: roundCurrency(section.totalAmount),
          items: [...section.items].sort(
            (left, right) => right.createdAt - left.createdAt,
          ),
        }))
        .filter((section) => section.totalAmount > 0),
    },
    audit: {
      tripRows: tripRows.map((row) => ({
        ...row,
        avgFuelRate: roundCurrency(row.avgFuelRate),
        mileage: roundMeasure(row.mileage),
        costPerKm: roundCurrency(row.costPerKm),
        totalCost: roundCurrency(row.totalCost),
        souravCost: roundCurrency(row.souravCost),
        ayanCost: roundCurrency(row.ayanCost),
      })),
      fuelLogRows: fuelLogRows.map((row) => ({
        ...row,
        amount: roundCurrency(row.amount),
        liters: roundMeasure(row.liters),
        rate: roundCurrency(row.rate),
      })),
      mileageRows,
      monthlySummaries,
      settlementRows,
      formulaNotes: [
        "Monthly fuel rate = average of each refill rate (amount / liters) in that month.",
        "Cost per km = monthly fuel rate / monthly mileage.",
        "Trip fuel cost = trip distance x cost per km.",
        "Shared trips split trip fuel cost and FASTag tolls equally between Sourav and Ayan.",
        "Trip row user columns mirror the workbook split; settlement rows are the final balanced payable view.",
        "Other running expenses are split 50-50. Traffic fines are charged to the payer unless marked shared.",
        "Fuel and FASTag closing balances are treated as shared prepaid value so settlement stays balanced.",
      ],
    },
    csv,
    settlement: {
      status: settlementStatus,
      toneIndex,
      amount: settlementAmount,
      title,
      directionMessage,
      currentUserMessage,
    },
  };
}
