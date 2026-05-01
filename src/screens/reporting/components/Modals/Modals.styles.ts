import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  calculationModalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 14,
    maxHeight: '88%',
  },
  calculationModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitleBlock: {
    flex: 1,
    gap: 4,
  },
  calculationScrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  auditSection: {
    gap: 8,
  },
  auditSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  auditNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  auditNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  auditRowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 5,
  },
  auditRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  auditRowValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  auditRowMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  auditEmptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    gap: 10,
  },
  modalPrimaryButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '900',
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
