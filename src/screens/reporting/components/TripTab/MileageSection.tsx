import { useAppTheme } from '@/theme/useAppTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ReportData } from '../../reportCalculations';
import { formatMileage } from '../../reportUtils';
import { styles } from '../common/TripTab.styles';

interface MileageSectionProps {
  report: ReportData;
  mileageDraft: string;
  setMileageDraft: (value: string) => void;
  isMileageEditorVisible: boolean;
  setIsMileageEditorVisible: (visible: boolean) => void;
  showFuelInfo: boolean;
  setShowFuelInfo: (show: boolean) => void;
  onSaveMileage: () => void;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function MileageSection({
  report, mileageDraft, setMileageDraft, isMileageEditorVisible, setIsMileageEditorVisible,
  showFuelInfo, setShowFuelInfo, onSaveMileage, surfaceColor, secondarySurfaceColor,
}: MileageSectionProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="speed" size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mileage</Text>
        </View>

        <View style={styles.headerActions}>
          {report.canEditMileage && (
            <Pressable onPress={() => setIsMileageEditorVisible(!isMileageEditorVisible)} style={styles.infoButton}>
              <MaterialIcons name={isMileageEditorVisible ? 'close' : 'edit'} size={20} color={colors.textPrimary} />
            </Pressable>
          )}
          <Pressable onPress={() => setShowFuelInfo(!showFuelInfo)} style={styles.infoButton}>
            <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {showFuelInfo && (
        <View style={[styles.infoBubble, { backgroundColor: secondarySurfaceColor, borderLeftColor: colors.primary }]}>
          <Text style={[styles.infoBubbleText, { color: colors.textPrimary }]}>Fuel used = distance / mileage</Text>
        </View>
      )}

      <View style={styles.mileageStack}>
        <View style={[styles.innerSummaryCard, { backgroundColor: secondarySurfaceColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Current Active</Text>
          </View>
          <Text style={[styles.primaryAmount, { color: colors.textPrimary, marginTop: 4 }]}>
            {formatMileage(report.mileageEditorValue)}
          </Text>
        </View>

        {isMileageEditorVisible && report.canEditMileage && (
          <View style={styles.mileageEditorRow}>
            <View style={styles.mileageInputWrap}>
              <TextInput
                value={mileageDraft}
                onChangeText={setMileageDraft}
                editable={report.canEditMileage}
                keyboardType="decimal-pad"
                style={[
                  styles.mileageInput,
                  { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                placeholder="13.5"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <Pressable
              onPress={onSaveMileage}
              disabled={!report.canEditMileage}
              style={[styles.mileageSaveButton, { opacity: report.canEditMileage ? 1 : 0.4, backgroundColor: colors.textPrimary }]}
            >
              <MaterialIcons name="check" size={20} color={colors.invertedText ?? '#fff'} />
            </Pressable>
          </View>
        )}
      </View>

      {!report.canEditMileage && (
        <View style={styles.helperTextRow}>
          <MaterialIcons name={report.isSettled ? 'lock' : 'history'} size={14} color={colors.textSecondary} />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {report.isSettled ? 'Mileage is locked for this settled report' : 'Using historical monthly values'}
          </Text>
        </View>
      )}
    </View>
  );
}