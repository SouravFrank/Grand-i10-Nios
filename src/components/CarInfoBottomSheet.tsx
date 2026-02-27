import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppTheme } from '@/theme/useAppTheme';
import type {
  CarSpec,
  CarSpecEditableFieldKey,
  CarSpecFieldUpdateSubmission,
} from '@/types/models';
import { dayjs } from '@/utils/day';

type CarInfoBottomSheetProps = {
  visible: boolean;
  carSpec: CarSpec;
  onClose: () => void;
  onSaveFieldEdit: (submission: CarSpecFieldUpdateSubmission) => void;
};

type SpecRow = {
  key: string;
  label: string;
  value: string;
  editable: boolean;
};

const EDITABLE_CONFIG: { key: CarSpecEditableFieldKey; label: string }[] = [
  { key: 'lastMaintenanceDate', label: 'Last Maintenance Date' },
  { key: 'lastEngineOilChangedOn', label: 'Last Engine Oil Changed' },
  { key: 'lastCoolantRefillOn', label: 'Last Coolant Refill' },
  { key: 'puccExpireDate', label: 'PUCC Expire Date' },
  { key: 'insuranceFirstPartyExpiry', label: 'Insurance First Party Expiry' },
  { key: 'insuranceThirdPartyExpiry', label: 'Insurance Third Party Expiry' },
];

function parseExistingDate(value: string): Date {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return new Date();
  }
  return parsed.toDate();
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CarInfoBottomSheet({ visible, carSpec, onClose, onSaveFieldEdit }: CarInfoBottomSheetProps) {
  const { colors } = useAppTheme();
  const [rendered, setRendered] = useState(visible);
  const [activeField, setActiveField] = useState<CarSpecEditableFieldKey | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const [draftCost, setDraftCost] = useState('');
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
      { key: 'registrationNumber', label: 'Registration Number', value: carSpec.registrationNumber, editable: false },
      { key: 'registrationYear', label: 'Registration Year', value: carSpec.registrationYear, editable: false },
      { key: 'manufacturingYear', label: 'Manufacturing Year', value: carSpec.manufacturingYear, editable: false },
      { key: 'initialOdometer', label: 'Initial Odometer', value: `${carSpec.initialOdometer} km`, editable: false },
      { key: 'fuelType', label: 'Fuel Type', value: carSpec.fuelType, editable: false },
      { key: 'model', label: 'Model', value: carSpec.model, editable: false },
      { key: 'variant', label: 'Variant', value: carSpec.variant, editable: false },
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
    setActiveField(field);
    setDraftDate(parseExistingDate(carSpec[field]));
    setDraftCost('');
    setShowDatePicker(false);
  };

  const cancelEdit = () => {
    setActiveField(null);
    setDraftCost('');
    setShowDatePicker(false);
  };

  const saveEdit = () => {
    if (!activeField) {
      return;
    }

    const parsedCost = draftCost.trim() ? Number(draftCost) : undefined;

    onSaveFieldEdit({
      field: activeField,
      value: dayjs(draftDate).format('DD MMM YYYY'),
      cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
    });

    setActiveField(null);
    setDraftCost('');
    setShowDatePicker(false);
  };

  const changeDraftDate = (unit: 'day' | 'month' | 'year', delta: number) => {
    const next = dayjs(draftDate).add(delta, unit);
    setDraftDate(next.toDate());
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
                <View key={row.key} style={[styles.rowCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                  <View style={styles.rowTop}>
                    <View style={styles.rowTitleWrap}>
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.value}</Text>
                    </View>
                    {row.editable ? (
                      <Pressable onPress={() => beginEdit(row.key as CarSpecEditableFieldKey)} style={styles.editIconBtn}>
                        <MaterialIcons name="edit" size={18} color={colors.textPrimary} />
                      </Pressable>
                    ) : null}
                  </View>

                  {isActive ? (
                    <View style={[styles.inlineEditor, { borderTopColor: colors.border }]}> 
                      <Pressable
                        style={[styles.dateSelect, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setShowDatePicker((prev) => !prev)}>
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date</Text>
                        <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dayjs(draftDate).format('DD MMM YYYY')}</Text>
                      </Pressable>

                      {showDatePicker ? (
                        <View style={[styles.customDatePicker, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <View style={styles.datePickerPreview}>
                            <Text style={[styles.datePickerPreviewText, { color: colors.textPrimary }]}>
                              {dayjs(draftDate).format('DD MMM YYYY')}
                            </Text>
                          </View>

                          <View style={styles.pickerControlRow}>
                            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>DAY</Text>
                            <View style={styles.pickerButtons}>
                              <Pressable onPress={() => changeDraftDate('day', -1)} style={styles.pickerBtn}>
                                <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                              </Pressable>
                              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                                {dayjs(draftDate).date()}
                              </Text>
                              <Pressable onPress={() => changeDraftDate('day', 1)} style={styles.pickerBtn}>
                                <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.pickerControlRow}>
                            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>MONTH</Text>
                            <View style={styles.pickerButtons}>
                              <Pressable onPress={() => changeDraftDate('month', -1)} style={styles.pickerBtn}>
                                <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                              </Pressable>
                              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                                {MONTH_NAMES[dayjs(draftDate).month()]}
                              </Text>
                              <Pressable onPress={() => changeDraftDate('month', 1)} style={styles.pickerBtn}>
                                <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.pickerControlRow}>
                            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>YEAR</Text>
                            <View style={styles.pickerButtons}>
                              <Pressable onPress={() => changeDraftDate('year', -1)} style={styles.pickerBtn}>
                                <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                              </Pressable>
                              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                                {dayjs(draftDate).year()}
                              </Text>
                              <Pressable onPress={() => changeDraftDate('year', 1)} style={styles.pickerBtn}>
                                <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ) : null}

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
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
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
  nonEditableCellSpacer: {
    flex: 1,
    marginLeft: 4,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditor: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 10,
  },
  dateSelect: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 9,
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
    borderRadius: 2,
    padding: 10,
    gap: 8,
  },
  datePickerPreview: {
    alignItems: 'center',
  },
  datePickerPreviewText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pickerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  pickerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerValue: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
});
