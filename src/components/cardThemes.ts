import type { MaterialIcons } from "@expo/vector-icons";

export type EntryCategory =
  | "fuel"
  | "trip"
  | "odometer_start"
  | "odometer_end"
  | "odometer"
  | "expense_toll"
  | "expense_fasttag_recharge"
  | "expense_annual_pass_purchase"
  | "expense_annual_pass_deduction"
  | "expense_parking"
  | "expense_maintenance"
  | "expense_fine"
  | "expense_other"
  | "spec_update";

export interface CardTheme {
  accent: string;
  accentAlpha: (opacity: number) => string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  variant: "fuel" | "trip" | "odometer" | "expense" | "spec";
  cardTint: string;
  leftBorderWidth: number;
  motif: string | null;
}

function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const THEMES: Record<
  EntryCategory,
  Omit<CardTheme, "accent" | "accentAlpha"> & { accentHex: string }
> = {
  fuel: {
    accentHex: "#D97706",
    icon: "local-gas-station",
    label: "FUEL",
    variant: "fuel",
    cardTint: rgba("#F59E0B", 0.08),
    leftBorderWidth: 4,
    motif: "⛽",
  },
  trip: {
    accentHex: "#2563EB",
    icon: "route",
    label: "TRIP",
    variant: "trip",
    cardTint: rgba("#3B82F6", 0.07),
    leftBorderWidth: 4,
    motif: "🗺",
  },
  odometer_start: {
    accentHex: "#0284C7",
    icon: "play-circle-filled",
    label: "TRIP START",
    variant: "odometer",
    cardTint: rgba("#0284C7", 0.06),
    leftBorderWidth: 3,
    motif: null,
  },
  odometer_end: {
    accentHex: "#059669",
    icon: "flag",
    label: "TRIP END",
    variant: "odometer",
    cardTint: rgba("#059669", 0.06),
    leftBorderWidth: 3,
    motif: null,
  },
  odometer: {
    accentHex: "#475569",
    icon: "speed",
    label: "ODOMETER",
    variant: "odometer",
    cardTint: rgba("#64748B", 0.05),
    leftBorderWidth: 3,
    motif: null,
  },
  expense_toll: {
    accentHex: "#C2410C",
    icon: "toll",
    label: "FASTAG TOLL",
    variant: "expense",
    cardTint: rgba("#EA580C", 0.06),
    leftBorderWidth: 4,
    motif: "🛣",
  },
  expense_fasttag_recharge: {
    accentHex: "#2563EB",
    icon: "account-balance-wallet",
    label: "FASTAG RECHARGE",
    variant: "expense",
    cardTint: rgba("#3B82F6", 0.06),
    leftBorderWidth: 4,
    motif: "💳",
  },
  expense_parking: {
    accentHex: "#7C3AED",
    icon: "garage",
    label: "PARKING",
    variant: "expense",
    cardTint: rgba("#8B5CF6", 0.06),
    leftBorderWidth: 4,
    motif: "🅿️",
  },
  expense_maintenance: {
    accentHex: "#0F766E",
    icon: "build",
    label: "MAINTENANCE",
    variant: "expense",
    cardTint: rgba("#0D9488", 0.06),
    leftBorderWidth: 4,
    motif: "🔧",
  },
  expense_fine: {
    accentHex: "#DC2626",
    icon: "gavel",
    label: "FINE",
    variant: "expense",
    cardTint: rgba("#DC2626", 0.06),
    leftBorderWidth: 4,
    motif: "⚠️",
  },
  expense_annual_pass_purchase: {
    accentHex: "#4F46E5",
    icon: "card-membership",
    label: "ANNUAL PASS",
    variant: "expense",
    cardTint: rgba("#6366F1", 0.06),
    leftBorderWidth: 4,
    motif: "🛣️",
  },
  expense_annual_pass_deduction: {
    accentHex: "#B45309",
    icon: "toll",
    label: "PASS TOLL",
    variant: "expense",
    cardTint: rgba("#D97706", 0.06),
    leftBorderWidth: 4,
    motif: null,
  },
  expense_other: {
    accentHex: "#475569",
    icon: "receipt-long",
    label: "EXPENSE",
    variant: "expense",
    cardTint: rgba("#64748B", 0.06),
    leftBorderWidth: 4,
    motif: null,
  },
  spec_update: {
    accentHex: "#6D28D9",
    icon: "tune",
    label: "SPECS",
    variant: "spec",
    cardTint: rgba("#7C3AED", 0.06),
    leftBorderWidth: 4,
    motif: "⚙️",
  },
};

export function resolveCardTheme(
  type: string,
  expenseCategory?: string | null,
  expenseTitle?: string | null,
  isTripSummary?: boolean,
  tripStage?: string | null,
): CardTheme {
  let category: EntryCategory;

  if (type === "fuel") {
    category = "fuel";
  } else if (type === "odometer") {
    if (isTripSummary) {
      category = "trip";
    } else if (tripStage === "start") {
      category = "odometer_start";
    } else if (tripStage === "end") {
      category = "odometer_end";
    } else {
      category = "odometer";
    }
  } else if (type === "expense") {
    if (expenseCategory === "fasttag_toll_paid") {
      category = "expense_toll";
    } else if (
      expenseCategory === "utility_addon" &&
      expenseTitle?.toLowerCase().includes("fast") &&
      expenseTitle?.toLowerCase().includes("recharge")
    ) {
      category = "expense_fasttag_recharge";
    } else if (expenseCategory === "annual_pass_purchase") {
      category = "expense_annual_pass_purchase";
    } else if (expenseCategory === "annual_pass_deduction") {
      category = "expense_annual_pass_deduction";
    } else if (expenseCategory === "parking") {
      category = "expense_parking";
    } else if (expenseCategory === "maintenance_lab") {
      category = "expense_maintenance";
    } else if (expenseCategory === "traffic_violation_fine") {
      category = "expense_fine";
    } else {
      category = "expense_other";
    }
  } else if (type === "spec_update") {
    category = "spec_update";
  } else {
    category = "odometer";
  }

  const { accentHex, ...rest } = THEMES[category];

  return {
    ...rest,
    accent: accentHex,
    accentAlpha: (opacity: number) => {
      const h = accentHex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    },
  };
}
