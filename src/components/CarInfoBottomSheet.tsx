import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppTheme } from '@/theme/useAppTheme';
import type {
  CarSpec,
  CarSpecEditableFieldKey,
  CarSpecFieldUpdateSubmission,
} from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, normalizeIndianDate } from '@/utils/day';

type CarInfoBottomSheetProps = {
  visible: boolean;
  carSpec: CarSpec;
  lastOdometer: number;
  onClose: () => void;
  onSaveFieldEdit: (submission: CarSpecFieldUpdateSubmission) => void;
};

type SpecRow = {
  key: string;
  label: string;
  value: string;
  editable: boolean;
  canCopy?: boolean;
};

const EDITABLE_CONFIG: { key: CarSpecEditableFieldKey; label: string }[] = [
  { key: 'lastMaintenanceDate', label: 'Last Maintenance Date' },
  { key: 'lastEngineOilChangedOn', label: 'Last Engine Oil Changed' },
  { key: 'lastCoolantRefillOn', label: 'Last Coolant Refill' },
  { key: 'puccExpireDate', label: 'PUCC Expire Date' },
  { key: 'insuranceValidUpTo', label: 'Insurance Valid UpTo' },
  { key: 'fitnessValidUpTo', label: 'Fitness Valid UpTo' },
  { key: 'taxValidUpTo', label: 'Tax Valid UpTo' },
];

function parseExistingDate(value: string): Date {
  const parsed = dayjs(normalizeIndianDate(value), INDIA_DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return new Date();
  }
  return parsed.toDate();
}

export function CarInfoBottomSheet({ visible, carSpec, lastOdometer, onClose, onSaveFieldEdit }: CarInfoBottomSheetProps) {
  const { colors } = useAppTheme();
  const [rendered, setRendered] = useState(visible);
  const [activeField, setActiveField] = useState<CarSpecEditableFieldKey | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const [draftCost, setDraftCost] = useState('');
  const [draftOdometer, setDraftOdometer] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const translateY = useRef(new Animated.Value(420)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 420,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRendered(false);
      setActiveField(null);
      setDraftCost('');
      setDraftOdometer('');
      setShowDatePicker(false);
    });
  }, [overlayOpacity, translateY, visible]);

  const rows = useMemo<SpecRow[]>(() => {
    const editableRows: SpecRow[] = EDITABLE_CONFIG.map((item) => ({
      key: item.key,
      label: item.label,
      value: carSpec[item.key],
      editable: true,
    }));

    const staticRows: SpecRow[] = [
      { key: 'registrationNumber', label: 'Registration Number', value: carSpec.registrationNumber, editable: false, canCopy: true },
      { key: 'engineNumber', label: 'Engine No', value: carSpec.engineNumber, editable: false, canCopy: true },
      { key: 'chassisNumber', label: 'Chassis No', value: carSpec.chassisNumber, editable: false, canCopy: true },
      { key: 'registrationDate', label: 'Registration Date', value: carSpec.registrationDate, editable: false },
      { key: 'manufacturingYear', label: 'Manufacturing Year', value: carSpec.manufacturingYear, editable: false },
      { key: 'initialOdometer', label: 'Initial Odometer', value: `${carSpec.initialOdometer} km`, editable: false },
      { key: 'fuelType', label: 'Fuel Type', value: carSpec.fuelType, editable: false },
      { key: 'model', label: 'Model', value: carSpec.model, editable: false },
      { key: 'variant', label: 'Variant', value: carSpec.variant, editable: false },
      { key: 'carColor', label: 'Car Color', value: carSpec.carColor, editable: false },
    ];

    return [...editableRows, ...staticRows];
  }, [carSpec]);

  const editableRows = useMemo(() => rows.filter((row) => row.editable), [rows]);
  const nonEditableRows = useMemo(() => rows.filter((row) => !row.editable), [rows]);
  const nonEditableGridRows = useMemo(() => {
    const pairs: SpecRow[][] = [];
    for (let index = 0; index < nonEditableRows.length; index += 2) {
      pairs.push(nonEditableRows.slice(index, index + 2));
    }
    return pairs;
  }, [nonEditableRows]);

  const beginEdit = (field: CarSpecEditableFieldKey) => {
    if (activeField === field) {
      cancelEdit();
      return;
    }

    setActiveField(field);
    setDraftDate(parseExistingDate(carSpec[field]));
    setDraftCost('');
    setDraftOdometer(String(lastOdometer));
    setShowDatePicker(false);
  };

  const cancelEdit = () => {
    setActiveField(null);
    setDraftCost('');
    setDraftOdometer('');
    setShowDatePicker(false);
  };

  const saveEdit = () => {
    if (!activeField) {
      return;
    }

    const nextValue = dayjs(draftDate).format(INDIA_DATE_FORMAT);
    const config = EDITABLE_CONFIG.find((item) => item.key === activeField);
    if (!config) {
      return;
    }

    if (carSpec[activeField] === nextValue) {
      cancelEdit();
      return;
    }

    const parsedCost = draftCost.trim() ? Number(draftCost) : undefined;
    const parsedOdometer = Number(draftOdometer);

    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) {
      Alert.alert('Invalid odometer', 'Enter a valid odometer reading.');
      return;
    }
    if (parsedOdometer < lastOdometer) {
      Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.');
      return;
    }
    if (parsedOdometer - lastOdometer > 500) {
      Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.');
      return;
    }

    onSaveFieldEdit({
      field: activeField,
      label: config.label,
      previousValue: carSpec[activeField],
      value: nextValue,
      odometer: parsedOdometer,
      cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
    });

    setActiveField(null);
    setDraftCost('');
    setDraftOdometer('');
    setShowDatePicker(false);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDraftDate(selectedDate);
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Copied', `${label} copied to clipboard.`);
    } catch {
      Alert.alert('Copy failed', `Could not copy ${label.toLowerCase()}.`);
    }
  };

  if (!rendered) {
    return null;
  }

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible={rendered} onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <View style={styles.sheetAnchor}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              transform: [{ translateY }],
            },
          ]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>CAR SPEC SHEET</Text>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <MaterialIcons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
            {editableRows.map((row) => {
              const isActive = row.editable && row.key === activeField;

              return (
                <View
                  key={row.key}
                  style={[
                    styles.rowCard,
                    styles.rowShell,
                    {
                      borderColor: isActive ? colors.textPrimary : colors.border,
                      backgroundColor: isActive ? colors.background : colors.card,
                    },
                  ]}>
                  <View
                    style={styles.rowTop}>
                    <View style={styles.rowTitleWrap}>
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.value}</Text>
                    </View>
                    {row.editable ? (
                      <Pressable
                        onPress={() => beginEdit(row.key as CarSpecEditableFieldKey)}
                        style={[
                          styles.editIconBtn,
                          {
                            borderColor: isActive ? colors.textPrimary : colors.border,
                            backgroundColor: isActive ? colors.textPrimary : colors.backgroundSecondary,
                          },
                        ]}>
                        <MaterialIcons
                          name={isActive ? 'expand-less' : 'edit'}
                          size={18}
                          color={isActive ? colors.invertedText : colors.textPrimary}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  {isActive ? (
                    <View style={[styles.inlineEditor, { borderTopColor: colors.border }]}>
                      <View style={[styles.editorBadgeRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Text style={[styles.editorBadgeText, { color: colors.textPrimary }]}>SPEC UPDATE ENTRY</Text>
                        <Text style={[styles.editorHintText, { color: colors.textSecondary }]}>
                          Previous odometer {lastOdometer} km
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.dateSelect, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setShowDatePicker((prev) => !prev)}>
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date</Text>
                        <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                          {dayjs(draftDate).format(INDIA_DATE_FORMAT)}
                        </Text>
                      </Pressable>

                      {showDatePicker ? (
                        <View style={[styles.customDatePicker, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <DateTimePicker
                            mode="date"
                            value={draftDate}
                            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                            onChange={handleDatePickerChange}
                          />
                          {Platform.OS === 'ios' ? (
                            <Pressable
                              onPress={() => setShowDatePicker(false)}
                              style={[styles.datePickerDoneBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                              <Text style={[styles.datePickerDoneText, { color: colors.textPrimary }]}>Done</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}

                      <AppTextField
                        label="Odometer Reading"
                        value={draftOdometer}
                        onChangeText={setDraftOdometer}
                        keyboardType="numeric"
                        placeholder={`>= ${lastOdometer}`}
                      />

                      <AppTextField
                        label="Cost (Rs) - Optional"
                        value={draftCost}
                        onChangeText={setDraftCost}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 1200"
                      />

                      <View style={styles.editorActions}>
                        <PrimaryButton label="SAVE" onPress={saveEdit} style={styles.editorActionBtn} />
                        <PrimaryButton
                          label="CANCEL"
                          variant="secondary"
                          onPress={cancelEdit}
                          style={styles.editorActionBtn}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={[styles.nonEditablePanel, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.nonEditableTitle, { color: colors.textPrimary }]}>Vehicle Details</Text>
              {nonEditableGridRows.map((pair, rowIndex) => (
                <View key={`grid-${rowIndex}`} style={styles.nonEditableGridRow}>
                  {pair.map((row, cellIndex) => (
                    <View
                      key={row.key}
                      style={[
                        styles.nonEditableCell,
                        {
                          borderColor: colors.border,
                          borderWidth: 1,
                          backgroundColor: colors.backgroundSecondary,
                        },
                        cellIndex === 0 ? { marginRight: 4 } : { marginLeft: 4 },
                      ]}>
                      <View style={styles.staticCellHead}>
                        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                        {row.canCopy ? (
                          <Pressable onPress={() => void copyValue(row.label, row.value)} style={styles.copyIconBtn}>
                            <MaterialIcons name="content-copy" size={16} color={colors.textPrimary} />
                          </Pressable>
                        ) : null}
                      </View>
                      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.value}</Text>
                    </View>
                  ))}
                  {pair.length === 1 ? <View style={styles.nonEditableCellSpacer} /> : null}
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetAnchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  handle: {
    width: 44,
    height: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 2,
  },
  contentWrap: {
    gap: 10,
    paddingBottom: 10,
  },
  nonEditablePanel: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    gap: 8,
  },
  nonEditableTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nonEditableGridRow: {
    flexDirection: 'row',
  },
  nonEditableCell: {
    flex: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  staticCellHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  nonEditableCellSpacer: {
    flex: 1,
    marginLeft: 4,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowShell: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowTitleWrap: {
    flex: 1,
    gap: 5,
  },
  rowLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIconBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditor: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  editorBadgeRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  editorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  editorHintText: {
    fontSize: 12,
    lineHeight: 17,
  },
  dateSelect: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editorActionBtn: {
    flex: 1,
  },
  customDatePicker: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  datePickerDoneBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDoneText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
