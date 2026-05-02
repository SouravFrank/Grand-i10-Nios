import { StyleSheet } from "react-native";

// Main ReportScreen styles - only styles needed by the main screen itself
// Component-specific styles have been moved to individual component style files
export const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 10,
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-start",
  },
  gridSpanFull: {
    width: "100%",
  },
  gridSpanHalf: {
    width: "48%",
  },
  gridBlockHalf: {
    width: "48%",
  },
  glassCard: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  datePickerCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  datePickerTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  // Add or update these inside ReportScreen.styles.ts
  expenseList: {
    // Container for the list of items
    width: "100%",
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  expenseRowLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    marginRight: 16, // Prevents long text from hitting the price
  },
  expenseRowValue: {
    fontSize: 14,
    fontWeight: "700", // Bold price for the ledger look
  },
});
