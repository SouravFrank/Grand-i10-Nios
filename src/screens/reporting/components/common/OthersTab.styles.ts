import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  doubleMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyBlock: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  expenseSectionStack: {
    gap: 10,
  },
  expenseSectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  expenseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otherSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  otherSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  otherSectionValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
