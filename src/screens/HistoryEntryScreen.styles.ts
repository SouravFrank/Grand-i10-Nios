import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    gap: 16,
    paddingBottom: 32,
    position: "relative",
  },
  orbTop: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
    right: -60,
  },
  headerCard: {
    borderRadius: 24,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-5deg" }],
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    gap: 24,
  },
  fieldsGroup: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  categoryCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  dateButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateCopy: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  odoPanel: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  odoHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  odoPanelLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  odoPanelHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  payerGrid: {
    flexDirection: "row",
    gap: 12,
  },
  payerOption: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  payerOptionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  payerName: {
    fontSize: 16,
    fontWeight: "900",
  },
  payerMeta: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  selectionError: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  metricField: {
    flex: 1,
    minWidth: 0,
  },
  switchRow: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  switchHint: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  actionRow: {
    gap: 12,
    marginTop: 8,
  },
  primaryAction: {
    flex: 1,
    height: 56,
    borderRadius: 16,
  },
});
