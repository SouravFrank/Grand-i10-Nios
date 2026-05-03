import { useAppTheme } from '@/theme/useAppTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { ReportData } from '../../reportCalculations';
import { formatMileage } from '../../reportUtils';
import { styles } from '../common/TripTab.styles';

interface MileageSectionProps {
  report: ReportData;
  mileageDraft: string;
  setMileageDraft: (value: string) => void;
  isMileageEditorVisible: boolean;
  setIsMileageEditorVisible: (visible: boolean) => void;
  onSaveMileage: () => void;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function MileageSection({
  report, mileageDraft, setMileageDraft, isMileageEditorVisible, setIsMileageEditorVisible,
  onSaveMileage, surfaceColor, secondarySurfaceColor,
}: MileageSectionProps) {
  const { colors } = useAppTheme();

  // Animation values for a pulsing eco icon and moving car
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const driveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Infinite driving animation across the card
    Animated.loop(
      Animated.timing(driveAnim, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, driveAnim]);

  // Interpolate the car movement from left to right
  const carTranslateX = driveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 200] // Adjusts for the width of the card
  });

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={{
            backgroundColor: colors.textPrimary,
            padding: 6,
            borderRadius: 8,
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            transform: [{ rotate: '-5deg' }],
          }}>
            <MaterialIcons name="speed" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Mileage</Text>
        </View>

        <View style={styles.headerActions}>
          {report.canEditMileage && (
            <Pressable onPress={() => setIsMileageEditorVisible(!isMileageEditorVisible)} style={styles.infoButton}>
              <MaterialIcons name={isMileageEditorVisible ? 'close' : 'edit'} size={20} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.mileageStack}>
        {/* Animated Active Readout Card */}
        <View style={[styles.innerSummaryCard, { backgroundColor: secondarySurfaceColor, alignItems: 'center', overflow: 'hidden' }]}>
          
          {/* Subtle Watermark Icon in background */}
          <MaterialIcons name="eco" size={100} color={`${colors.primary}08`} style={{ position: 'absolute', right: -20, top: -10 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialIcons name="ev-station" size={20} color={colors.primary} />
            </Animated.View>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Active Efficiency</Text>
          </View>
          
          <Text style={[styles.primaryAmount, { color: colors.textPrimary, marginTop: 4, fontSize: 32 }]}>
            {formatMileage(report.mileageEditorValue).toUpperCase()}
          </Text>

          {/* Animated Road & Car Element */}
          <View style={{ width: '100%', height: 16, marginTop: 12, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: '100%', height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }} />
            <Animated.View style={{ transform: [{ translateX: carTranslateX }] }}>
              <MaterialIcons name="directions-car" size={14} color={colors.textSecondary} />
            </Animated.View>
          </View>
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