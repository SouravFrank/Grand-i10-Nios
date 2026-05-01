import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // Outer Section Container - Flat & Clean
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    // Removed all drop shadows for a minimalist, modern aesthetic
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5, // Modern tight tracking for headings
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoButton: {
    padding: 4,
  },

  // Inner Cards (Fastag, Fuel, Trip, etc.) - No borders, just surface contrast
  gridBlockHalf: {
    width: "48%",
  },
  flowGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  innerSummaryCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    flex: 1,
    minWidth: "45%",
  },
  highlightedCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    // Highlighted cards use the accent color strictly
  },

  // Unified Card Headers & Content
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8, // Wide tracking for professional dashboard labels
  },
  cardContent: {
    gap: 4,
    marginTop: 4,
  },
  primaryAmount: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  secondaryAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  tertiaryLabel: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Specific Layouts (User Splits, Mileage, etc.)
  userSplitSection: {
    // marginTop: 8,
    gap: 12,
  },
  userCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  userCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
  },
  userStatBlock: {
    gap: 2,
  },

  // Mileage & Info Blocks
  infoBubble: {
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3, // Clean left-accent border instead of full box
  },
  infoBubbleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  mileageStack: {
    gap: 12,
  },
  mileageEditorRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  mileageInputWrap: {
    flex: 1,
  },
  mileageInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  mileageSaveButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Inline Stats & Helpers
  inlineStatPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineStatText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  helperTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    fontWeight: "500",
  },
  threeColumnRow: {
    flexDirection: "row",
    gap: 4,
  },
  compactCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    // gap: 6,
  },
  compactTitle: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
});
