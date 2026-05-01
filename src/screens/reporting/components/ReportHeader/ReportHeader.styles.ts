import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  pageHeader: {
    gap: 16, // Increased gap for better breathing room
    paddingTop: 8,
    paddingBottom: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44, // Slightly larger for better tap target
    height: 44,
    borderRadius: 999, // Perfectly circular
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleBlock: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5, // Increased tracking for premium feel
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 24, // Larger title
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 999, // Perfectly circular
    alignItems: "center",
    justifyContent: "center",
  },
  filterBlock: {
    gap: 12,
  },
  inlineRow: {
    gap: 10,
    paddingRight: 20, // ensure last item isn't flush with screen edge
  },
  filterChip: {
    borderRadius: 999, // Pill shape
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  monthChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rangeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  rangeCard: {
    flex: 1,
    borderRadius: 16, // Softer corners
    padding: 14,
    gap: 4,
    // Removing border in favor of pure surface color
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rangeValue: {
    fontSize: 15,
    fontWeight: "800",
  },
});
