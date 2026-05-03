import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  tabShell: {
    borderRadius: 20, // Smooth outer pill
    padding: 6, // More padding to hold the inner buttons
    flexDirection: "row",
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14, // Matches the shell radius minus padding
    paddingVertical: 12, // Taller for better tap target
    alignItems: "center",
  },
  // Added an active state specifically for the shadow effect
  tabButtonActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 14, // Slightly larger
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
