import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridSpanFull: {
    width: "100%",
  },
  gridSpanHalf: {
    width: "47.5%",
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    overflow: "hidden", // Crucial for the shimmer effect to stay inside the borders
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.06)", // Very subtle white wash
    transform: [{ skewX: "-20deg" }], // Classic angled shimmer look
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryFrame: {
    gap: 4,
    marginTop: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineStatPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineStatText: {
    fontSize: 12,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  settlementCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginTop: 8,
  },
  settlementHeader: {
    gap: 12,
  },
  settlementAmountWrapper: {
    gap: 4,
  },
  settlementAmount: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  settlementDirection: {
    fontSize: 14,
    fontWeight: "600",
  },
  settlementBadgePressable: {
    width: "100%",
  },
  settlementBadge: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  settlementBadgeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  settlementLockHint: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: -8,
  },
  inlineInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readOnlyBanner: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginTop: 8,
  },
  warningCopy: {
    flex: 1,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});
