import { Platform, StyleSheet } from "react-native";

export const baseStyles = StyleSheet.create({
  animatedWrapper: {},
  swipeActionWrap: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    height: "100%",
    paddingBottom: 8,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "nowrap",
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dot: {
    fontSize: 8,
    opacity: 0.35,
  },
  dateText: {
    fontSize: 11, // Increased from 10 for better readability
    fontWeight: "600",
  },
  userText: {
    fontSize: 11, // Increased from 10 for better readability
    fontWeight: "700",
    textTransform: "uppercase",
  },
  // New highlighted shared badge at top right
  sharedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    flexShrink: 0,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricPillText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
  },
  odometerChip: {
    gap: 4,
  },
  odometerDigitText: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontVariant: ["tabular-nums"],
    letterSpacing: 0,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export const fuelStyles = StyleSheet.create({
  inner: { padding: 11, gap: 7 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    paddingLeft: 31,
    marginTop: -10,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    paddingLeft: 41,
  },
});

export const tripStyles = StyleSheet.create({
  inner: { padding: 11, gap: 7 },
  journeyBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
  },
  odomLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.5,
    marginBottom: 1,
  },
  odomVal: { fontSize: 17, fontWeight: "900", letterSpacing: -0.5 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 41,
  },
});

export const odometerStyles = StyleSheet.create({
  inner: { paddingVertical: 10, paddingHorizontal: 11 },
  readingInline: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  readingVal: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
  },
  readingUnit: { fontSize: 10, fontWeight: "700", opacity: 0.45 },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
});

export const expenseStyles = StyleSheet.create({
  inner: { padding: 11, gap: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 42,
    marginTop: -10,
    marginBottom: 3,
  },
  title: { fontSize: 13, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    paddingLeft: 31,
    marginTop: -10,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 41,
  },
});

export const specStyles = StyleSheet.create({
  inner: { padding: 11, gap: 7 },
  diffBox: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    gap: 4,
  },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  diffField: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    opacity: 0.5,
    minWidth: 80,
  },
  diffFrom: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.55,
    textDecorationLine: "line-through",
  },
  diffArrow: { fontSize: 10, opacity: 0.35 },
  diffTo: { fontSize: 11, fontWeight: "800" },
});
