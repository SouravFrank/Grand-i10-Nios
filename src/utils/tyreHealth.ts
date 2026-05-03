import type { TyrePosition, TyreRecord } from "@/types/models";
import { normalizeIndianDate } from "@/utils/day";

export const TYRE_SIZE = "175/60R15";
export const NEW_TREAD_DEPTH_MM = 8.0;
export const MIN_SAFE_TREAD_MM = 1.6;
export const USABLE_TREAD_MM = NEW_TREAD_DEPTH_MM - MIN_SAFE_TREAD_MM;
export const AVERAGE_TOTAL_TYRE_LIFE_KM = 50000;

export const POSITION_ORDER: TyrePosition[] = ["pf", "df", "pb", "db", "s"];
export const ACTIVE_TYRE_POSITIONS: TyrePosition[] = ["pf", "df", "pb", "db"];

export const POSITION_LABELS: Record<TyrePosition, string> = {
  pf: "Passenger Front",
  df: "Driver Front",
  pb: "Passenger Back",
  db: "Driver Back",
  s: "Stepney (Spare)",
};

export const POSITION_SHORT: Record<TyrePosition, string> = {
  pf: "PF",
  df: "DF",
  pb: "PB",
  db: "DB",
  s: "SP",
};

const INITIAL_INSPECTION_DATE = "2026-02-21";
const INITIAL_INSPECTION_ODOMETER = 29703;

const DEFAULT_TYRE_SETUP: TyreRecord[] = [
  {
    id: "pf",
    currentPosition: "pf",
    treadDepthAtInspection: 6.1,
    inspectionOdometer: INITIAL_INSPECTION_ODOMETER,
    inspectionDate: INITIAL_INSPECTION_DATE,
    accumulatedActiveKm: 0,
    positionAssignedAtOdometer: INITIAL_INSPECTION_ODOMETER,
    isNew: false,
  },
  {
    id: "df",
    currentPosition: "df",
    treadDepthAtInspection: 4.8,
    inspectionOdometer: INITIAL_INSPECTION_ODOMETER,
    inspectionDate: INITIAL_INSPECTION_DATE,
    accumulatedActiveKm: 0,
    positionAssignedAtOdometer: INITIAL_INSPECTION_ODOMETER,
    isNew: false,
  },
  {
    id: "pb",
    currentPosition: "pb",
    treadDepthAtInspection: 4.7,
    inspectionOdometer: INITIAL_INSPECTION_ODOMETER,
    inspectionDate: INITIAL_INSPECTION_DATE,
    accumulatedActiveKm: 0,
    positionAssignedAtOdometer: INITIAL_INSPECTION_ODOMETER,
    isNew: false,
  },
  {
    id: "db",
    currentPosition: "db",
    treadDepthAtInspection: 6.0,
    inspectionOdometer: INITIAL_INSPECTION_ODOMETER,
    inspectionDate: INITIAL_INSPECTION_DATE,
    accumulatedActiveKm: 0,
    positionAssignedAtOdometer: INITIAL_INSPECTION_ODOMETER,
    isNew: false,
  },
  {
    id: "s",
    currentPosition: "s",
    treadDepthAtInspection: 5.2,
    inspectionOdometer: INITIAL_INSPECTION_ODOMETER,
    inspectionDate: INITIAL_INSPECTION_DATE,
    accumulatedActiveKm: 0,
    positionAssignedAtOdometer: INITIAL_INSPECTION_ODOMETER,
    isNew: false,
  },
];

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTyrePosition(value: unknown): value is TyrePosition {
  return (
    typeof value === "string" && POSITION_ORDER.includes(value as TyrePosition)
  );
}

function clampTreadDepth(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(NEW_TREAD_DEPTH_MM, Math.max(MIN_SAFE_TREAD_MM, value));
}

export function isActiveTyrePosition(position: TyrePosition) {
  return ACTIVE_TYRE_POSITIONS.includes(position);
}

export function getTyreDisplayName(tyreId: TyrePosition) {
  return `Tyre ${POSITION_SHORT[tyreId]}`;
}

export function getTyreLocationName(position: TyrePosition) {
  return POSITION_LABELS[position];
}

export function buildDefaultTyreSetup(): TyreRecord[] {
  return DEFAULT_TYRE_SETUP.map((tyre) => ({ ...tyre }));
}

export function sortTyresByCurrentPosition(tyres: TyreRecord[]) {
  return [...tyres].sort(
    (left, right) =>
      POSITION_ORDER.indexOf(left.currentPosition) -
      POSITION_ORDER.indexOf(right.currentPosition),
  );
}

export function buildTyrePositionAssignments(tyres: TyreRecord[]) {
  const assignments = {} as Record<TyrePosition, TyrePosition>;

  for (const position of POSITION_ORDER) {
    const tyre = tyres.find((item) => item.currentPosition === position);
    assignments[position] = tyre?.id ?? position;
  }

  return assignments;
}

export function normalizeTyreSetup(
  tyreSetup?: TyreRecord[] | null,
): TyreRecord[] {
  if (!Array.isArray(tyreSetup) || tyreSetup.length !== POSITION_ORDER.length) {
    return buildDefaultTyreSetup();
  }

  const byId = new Map<TyrePosition, TyreRecord>();
  for (const rawTyre of tyreSetup) {
    if (!rawTyre || !isTyrePosition(rawTyre.id) || byId.has(rawTyre.id)) {
      return buildDefaultTyreSetup();
    }
    byId.set(rawTyre.id, rawTyre);
  }

  const normalized = POSITION_ORDER.map((id) => {
    const fallback = DEFAULT_TYRE_SETUP.find((tyre) => tyre.id === id)!;
    const rawTyre = byId.get(id);

    if (!rawTyre || !isTyrePosition(rawTyre.currentPosition)) {
      return fallback;
    }

    const inspectionOdometer = isFinitePositiveNumber(
      rawTyre.inspectionOdometer,
    )
      ? rawTyre.inspectionOdometer
      : fallback.inspectionOdometer;
    const accumulatedActiveKm = isFiniteNonNegativeNumber(
      rawTyre.accumulatedActiveKm,
    )
      ? rawTyre.accumulatedActiveKm
      : 0;
    const positionAssignedAtOdometer = isFinitePositiveNumber(
      rawTyre.positionAssignedAtOdometer,
    )
      ? rawTyre.positionAssignedAtOdometer
      : inspectionOdometer;

    return {
      id,
      currentPosition: rawTyre.currentPosition,
      treadDepthAtInspection: clampTreadDepth(
        rawTyre.treadDepthAtInspection,
        fallback.treadDepthAtInspection,
      ),
      inspectionOdometer,
      inspectionDate: normalizeIndianDate(
        rawTyre.inspectionDate ?? fallback.inspectionDate,
      ),
      accumulatedActiveKm,
      positionAssignedAtOdometer,
      isNew: Boolean(rawTyre.isNew),
      movedFromPosition: isTyrePosition(rawTyre.movedFromPosition)
        ? rawTyre.movedFromPosition
        : undefined,
    };
  });

  const usedPositions = new Set(normalized.map((tyre) => tyre.currentPosition));
  if (usedPositions.size !== POSITION_ORDER.length) {
    return buildDefaultTyreSetup();
  }

  return sortTyresByCurrentPosition(normalized);
}

export function calcHealthFromTread(treadMm: number): number {
  if (treadMm >= NEW_TREAD_DEPTH_MM) return 100;
  if (treadMm <= MIN_SAFE_TREAD_MM) return 0;
  return Math.round(((treadMm - MIN_SAFE_TREAD_MM) / USABLE_TREAD_MM) * 100);
}

export function calcRemainingKmFromHealth(healthPercent: number): number {
  return Math.round((healthPercent / 100) * AVERAGE_TOTAL_TYRE_LIFE_KM);
}

export function getTyreDrivenKmSinceInspection(
  tyre: TyreRecord,
  currentOdometer: number,
) {
  const liveActiveKm = isActiveTyrePosition(tyre.currentPosition)
    ? Math.max(0, currentOdometer - tyre.positionAssignedAtOdometer)
    : 0;

  return tyre.accumulatedActiveKm + liveActiveKm;
}

export function calcCurrentHealth(tyre: TyreRecord, currentOdometer: number) {
  const kmDriven = getTyreDrivenKmSinceInspection(tyre, currentOdometer);
  const wearRateKmPerMm = AVERAGE_TOTAL_TYRE_LIFE_KM / USABLE_TREAD_MM;
  const treadWorn = kmDriven / wearRateKmPerMm;
  const startingTread = tyre.isNew
    ? NEW_TREAD_DEPTH_MM
    : tyre.treadDepthAtInspection;
  const currentTread = Math.max(MIN_SAFE_TREAD_MM, startingTread - treadWorn);
  const healthPercent = calcHealthFromTread(currentTread);

  return {
    healthPercent,
    estimatedRemainingKm: calcRemainingKmFromHealth(healthPercent),
    currentTreadMm: Math.round(currentTread * 10) / 10,
  };
}

function finalizeTyreWearAtOdometer(
  tyre: TyreRecord,
  odometer: number,
): TyreRecord {
  const liveActiveKm = isActiveTyrePosition(tyre.currentPosition)
    ? Math.max(0, odometer - tyre.positionAssignedAtOdometer)
    : 0;

  return {
    ...tyre,
    accumulatedActiveKm: tyre.accumulatedActiveKm + liveActiveKm,
    positionAssignedAtOdometer: odometer,
  };
}

export function applyTyrePositionUpdate(
  tyreSetup: TyreRecord[],
  nextAssignments: Record<TyrePosition, TyrePosition>,
  odometer: number,
) {
  const currentSetup = normalizeTyreSetup(tyreSetup);
  const finalizedTyres = currentSetup.map((tyre) =>
    finalizeTyreWearAtOdometer(tyre, odometer),
  );

  console.log("[DEBUG] applyTyrePositionUpdate:", {
    nextAssignments,
    tyresBefore: finalizedTyres.map((t) => ({
      id: t.id,
      current: t.currentPosition,
      from: t.movedFromPosition,
    })),
  });

  const result = sortTyresByCurrentPosition(
    finalizedTyres.map((tyre) => {
      const nextPosition = POSITION_ORDER.find(
        (position) => nextAssignments[position] === tyre.id,
      );

      if (!nextPosition) {
        console.log(`[DEBUG] Tyre ${tyre.id}: no nextPosition found`);
        return tyre;
      }

      const hasMoved = tyre.currentPosition !== nextPosition;

      // Determine movedFromPosition:
      // - If tyre moved: track the old position (unless returning to original home)
      // - If tyre didn't move: preserve existing history
      let movedFromPosition: TyrePosition | undefined;
      if (hasMoved) {
        // If moving back to original home position, clear history
        if (tyre.movedFromPosition === nextPosition) {
          movedFromPosition = undefined;
        } else {
          movedFromPosition = tyre.currentPosition;
        }
      } else {
        // No movement - preserve history but ensure it differs from current
        movedFromPosition =
          tyre.movedFromPosition !== nextPosition
            ? tyre.movedFromPosition
            : undefined;
      }

      console.log(
        `[DEBUG] Tyre ${tyre.id}: ${tyre.currentPosition} -> ${nextPosition}, hasMoved=${hasMoved}, movedFrom=${movedFromPosition}`,
      );

      return {
        ...tyre,
        currentPosition: nextPosition,
        positionAssignedAtOdometer: odometer,
        movedFromPosition,
      };
    }),
  );

  console.log(
    "[DEBUG] Result:",
    result.map((t) => ({
      id: t.id,
      current: t.currentPosition,
      from: t.movedFromPosition,
    })),
  );
  return result;
}

export function applyTyreInspectionUpdate(
  tyreSetup: TyreRecord[],
  tyreId: TyrePosition,
  params: {
    odometer: number;
    inspectionDate: string;
    treadDepthAtInspection: number;
    isNew: boolean;
  },
) {
  const currentSetup = normalizeTyreSetup(tyreSetup);
  const finalizedTyres = currentSetup.map((tyre) =>
    tyre.id === tyreId
      ? finalizeTyreWearAtOdometer(tyre, params.odometer)
      : tyre,
  );

  return sortTyresByCurrentPosition(
    finalizedTyres.map((tyre) =>
      tyre.id === tyreId
        ? {
            ...tyre,
            treadDepthAtInspection: clampTreadDepth(
              params.treadDepthAtInspection,
              tyre.treadDepthAtInspection,
            ),
            inspectionOdometer: params.odometer,
            inspectionDate: normalizeIndianDate(params.inspectionDate),
            accumulatedActiveKm: 0,
            positionAssignedAtOdometer: params.odometer,
            isNew: params.isNew,
            movedFromPosition: params.isNew
              ? undefined
              : tyre.movedFromPosition,
          }
        : tyre,
    ),
  );
}
