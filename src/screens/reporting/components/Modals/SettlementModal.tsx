import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { styles } from './Modals.styles';

interface SettlementModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  canConfirmSettlement: boolean;
  isSettled: boolean;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function SettlementModal({
  isVisible,
  onClose,
  onConfirm,
  canConfirmSettlement,
  isSettled,
  surfaceColor,
  secondarySurfaceColor,
}: SettlementModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              borderColor: colors.border,
              backgroundColor: surfaceColor,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Settlement confirmation</Text>
          <Text style={[styles.modalText, { color: colors.textSecondary }]}>
            {canConfirmSettlement
              ? 'Have you settled the amount between yourselves?'
              : isSettled
                ? 'This month is already marked as settled and locked.'
                : 'Select a completed month first if you want to confirm settlement and lock editing.'}
          </Text>

          <View style={styles.modalActions}>
            {canConfirmSettlement ? (
              <Pressable onPress={onConfirm} style={[styles.modalPrimaryButton, { backgroundColor: colors.textPrimary }]}>
                <Text style={[styles.modalPrimaryText, { color: colors.invertedText }]}>Confirm</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              style={[
                styles.modalSecondaryButton,
                {
                  borderColor: colors.border,
                  backgroundColor: secondarySurfaceColor,
                },
              ]}
            >
              <Text style={[styles.modalSecondaryText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
