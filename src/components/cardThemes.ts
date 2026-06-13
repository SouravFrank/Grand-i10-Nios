import type { MaterialIcons } from "@expo/vector-icons";

export type EntryCategory =
  | "fuel"
  | "trip"
  | "odometer_start"
  | "odometer_end"
  | "odometer"
  | "expense_toll"
  | "expense_fasttag_recharge"
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
    accentHex: "#F59E0B",
    icon: "local-gas-station",
    label: "FUEL",
    variant: "fuel",
    cardTint: rgba("#F59E0B", 0.06),
    leftBorderWidth: 5,
    motif: "⛽",
  },
  trip: {
    accentHex: "#6366F1",
    icon: "route",
    label: "TRIP",
    variant: "trip",
    cardTint: rgba("#6366F1", 0.07),
    leftBorderWidth: 5,
    motif: "🗺",
  },
  odometer_start: {
    accentHex: "#0EA5E9",
    icon: "play-circle-filled",
    label: "TRIP START",
    variant: "odometer",
    cardTint: rgba("#0EA5E9", 0.05),
    leftBorderWidth: 3,
    motif: null,
  },
  odometer_end: {
    accentHex: "#10B981",
    icon: "flag",
    label: "TRIP END",
    variant: "odometer",
    cardTint: rgba("#10B981", 0.05),
    leftBorderWidth: 3,
    motif: null,
  },
  odometer: {
    accentHex: "#0EA5E9",
    icon: "speed",
    label: "ODOMETER",
    variant: "odometer",
    cardTint: rgba("#0EA5E9", 0.04),
    leftBorderWidth: 3,
    motif: null,
  },
  expense_toll: {
    accentHex: "#EF4444",
    icon: "toll",
    label: "FASTAG TOLL",
    variant: "expense",
    cardTint: rgba("#EF4444", 0.05),
    leftBorderWidth: 4,
    motif: "🛣",
  },
  expense_fasttag_recharge: {
    accentHex: "#3B82F6",
    icon: "account-balance-wallet",
    label: "FASTAG RECHARGE",
    variant: "expense",
    cardTint: rgba("#3B82F6", 0.05),
    leftBorderWidth: 4,
    motif: "💳",
  },
  expense_parking: {
    accentHex: "#8B5CF6",
    icon: "garage", // Updated to a better, modern parking icon
    label: "PARKING",
    variant: "expense",
    cardTint: rgba("#8B5CF6", 0.05),
    leftBorderWidth: 4,
    motif: "🅿️",
  },
  expense_maintenance: {
    accentHex: "#F97316",
    icon: "build",
    label: "MAINTENANCE",
    variant: "expense",
    cardTint: rgba("#F97316", 0.05),
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
  expense_other: {
    accentHex: "#22C55E",
    icon: "receipt-long",
    label: "EXPENSE",
    variant: "expense",
    cardTint: rgba("#22C55E", 0.05),
    leftBorderWidth: 4,
    motif: null,
  },
  spec_update: {
    accentHex: "#A855F7",
    icon: "tune",
    label: "SPECS",
    variant: "spec",
    cardTint: rgba("#A855F7", 0.05),
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
