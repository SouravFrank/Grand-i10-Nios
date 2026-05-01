import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { AppStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/useAppTheme';

import { AuditData } from '../../reportCalculations';
import { formatINR, formatKm, formatLiters } from '../../reportUtils';
import { styles } from './Modals.styles';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

interface CalculationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onExportCsv: () => void;
  isExportingCsv: boolean;
  rangeLabel: string;
  audit: AuditData;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function CalculationModal({
  isVisible,
  onClose,
  onExportCsv,
  isExportingCsv,
  rangeLabel,
  audit,
  surfaceColor,
  secondarySurfaceColor,
}: CalculationModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.calculationModalCard,
            {
              borderColor: colors.border,
              backgroundColor: surfaceColor,
            },
          ]}
        >
          <View style={styles.calculationModalHeader}>
            <View style={styles.modalTitleBlock}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Calculation details</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>{rangeLabel}</Text>
            </View>

            <View style={styles.heroActionRow}>
              <Pressable
                onPress={onExportCsv}
                disabled={isExportingCsv}
                style={[
                  styles.headerIconButton,
                  {
                    opacity: isExportingCsv ? 0.55 : 1,
                    borderColor: colors.border,
                    backgroundColor: secondarySurfaceColor,
                  },
                ]}
              >
                <MaterialIcons name={isExportingCsv ? 'hourglass-empty' : 'file-download'} size={18} color={colors.textPrimary} />
              </Pressable>

              <Pressable
                onPress={onClose}
                style={[
                  styles.headerIconButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: secondarySurfaceColor,
                  },
                ]}
              >
                <MaterialIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.calculationScrollContent}>
            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textPrimary }]}>Formula</Text>
              {audit.formulaNotes.map((note) => (
                <View key={note} style={styles.auditNoteRow}>
                  <MaterialIcons name="check-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.auditNoteText, { color: colors.textSecondary }]}>{note}</Text>
                </View>
              ))}
            </View>

            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textPrimary }]}>Settlement</Text>
              {audit.settlementRows.map((row) => (
                <View
                  key={row.userId}
                  style={[
                    styles.auditRowCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: secondarySurfaceColor,
                    },
                  ]}
                >
                  <View style={styles.otherSectionHeader}>
                    <Text style={[styles.auditRowTitle, { color: colors.textPrimary }]}>{row.userName}</Text>
                    <Text style={[styles.auditRowValue, { color: colors.textPrimary }]}>{formatINR(row.netBalance)}</Text>
                  </View>
                  <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                    Paid {formatINR(row.paidAmount)} - Share {formatINR(row.shareAmount)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textPrimary }]}>Month summary</Text>
              {audit.monthlySummaries.map((month) => (
                <View
                  key={month.monthKey}
                  style={[
                    styles.auditRowCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: secondarySurfaceColor,
                    },
                  ]}
                >
                  <View style={styles.otherSectionHeader}>
                    <Text style={[styles.auditRowTitle, { color: colors.textPrimary }]}>{month.monthLabel}</Text>
                    <Text style={[styles.auditRowValue, { color: colors.textPrimary }]}>{formatKm(month.totalKm)}</Text>
                  </View>
                  <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                    Sourav {formatKm(month.souravKm)} - Ayan {formatKm(month.ayanKm)} - Shared {formatKm(month.sharedKm)}
                  </Text>
                  <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                    Fuel left {formatLiters(month.closingFuelLiters)} - Value {formatINR(month.closingFuelValue)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textPrimary }]}>Trip rows</Text>
              {audit.tripRows.length === 0 ? (
                <Text style={[styles.auditEmptyText, { color: colors.textSecondary }]}>No trip rows in this period.</Text>
              ) : (
                audit.tripRows.map((row) => (
                  <View
                    key={row.id}
                    style={[
                      styles.auditRowCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: secondarySurfaceColor,
                      },
                    ]}
                  >
                    <View style={styles.otherSectionHeader}>
                      <Text style={[styles.auditRowTitle, { color: colors.textPrimary }]}>
                        {row.monthLabel} - {row.drivenBy}
                      </Text>
                      <Text style={[styles.auditRowValue, { color: colors.textPrimary }]}>{formatINR(row.totalCost)}</Text>
                    </View>
                    <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                      {row.startOdometer} to {row.endOdometer} - {formatKm(row.distanceKm)} - {formatINR(row.costPerKm)}/km
                    </Text>
                    <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                      Sourav {formatINR(row.souravCost)} - Ayan {formatINR(row.ayanCost)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textPrimary }]}>Fuel log</Text>
              {audit.fuelLogRows.length === 0 ? (
                <Text style={[styles.auditEmptyText, { color: colors.textSecondary }]}>
                  No fuel refills in the selected month range.
                </Text>
              ) : (
                audit.fuelLogRows.map((row) => (
                  <View
                    key={row.id}
                    style={[
                      styles.auditRowCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: secondarySurfaceColor,
                      },
                    ]}
                  >
                    <View style={styles.otherSectionHeader}>
                      <Text style={[styles.auditRowTitle, { color: colors.textPrimary }]}>
                        {row.monthLabel} - {row.paidByUserName}
                      </Text>
                      <Text style={[styles.auditRowValue, { color: colors.textPrimary }]}>{formatINR(row.amount)}</Text>
                    </View>
                    <Text style={[styles.auditRowMeta, { color: colors.textSecondary }]}>
                      {formatLiters(row.liters)} - {formatINR(row.rate)}/L
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
