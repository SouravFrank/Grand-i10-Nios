import { Platform, StyleSheet } from "react-native";

export const baseStyles = StyleSheet.create({
  animatedWrapper: {},
  swipeActionWrap: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    height: "100%",
    paddingBottom: 10,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    fontSize: 8,
    opacity: 0.35,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  userText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    flexShrink: 1,
  },
  sharedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricPillText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
  odometerChip: {
    gap: 5,
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
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stagePillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

export const fuelStyles = StyleSheet.create({
  inner: { padding: 12, gap: 9 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
});

export const tripStyles = StyleSheet.create({
  inner: { padding: 12, gap: 9 },
  journeyBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 13,
    gap: 8,
  },
  odomLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.5,
    marginBottom: 1,
  },
  odomVal: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  routeSegment: { flex: 1, flexDirection: "row", alignItems: "center" },
  routeLine: { flex: 1, borderTopWidth: 2, borderStyle: "dashed" },
  routeDotHollow: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 2,
  },
  routeDotSolid: { width: 7, height: 7, borderRadius: 4 },
  routeVehicle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statsRow: { flexDirection: "row", gap: 6 },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statDot: { fontSize: 12, fontWeight: "900", opacity: 0.45 },
  statValue: { fontSize: 14, fontWeight: "900", letterSpacing: -0.2 },
});

export const odometerStyles = StyleSheet.create({
  inner: { padding: 12, gap: 9 },
  readingVal: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
  },
});

export const expenseStyles = StyleSheet.create({
  inner: { padding: 12, gap: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
});

export const specStyles = StyleSheet.create({
  inner: { padding: 12, gap: 8 },
  diffBox: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    gap: 5,
  },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  diffField: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    opacity: 0.5,
    minWidth: 90,
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
