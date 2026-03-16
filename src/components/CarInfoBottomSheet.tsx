import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, PanResponder } from 'react-native';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
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

type CarSpecTab = 'health' | 'on_road' | 'identity';
type LegalGalleryKey = 'pucc' | 'insurance' | 'rc' | 'fitness' | 'roadTax' | 'numberPlate';

type LegalGalleryItem = {
  key: LegalGalleryKey;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
};

const HEALTH_EDITABLE_CONFIG: { key: CarSpecEditableFieldKey; label: string }[] = [
  { key: 'lastMaintenanceDate', label: 'Last Maintenance' },
  { key: 'lastCoolantRefillOn', label: 'Coolant' },
  { key: 'lastEngineOilChangedOn', label: 'Engine Oil' },
  { key: 'lastBrakeFluidChangedOn', label: 'Brake Oil (Brake Fluid)' },
  { key: 'lastGearboxOilChangedOn', label: 'Gearbox Oil' },
  { key: 'lastAirFilterChangedOn', label: 'Air Filter (Engine)' },
  { key: 'lastOilFilterChangedOn', label: 'Oil Filter' },
  { key: 'lastAcFilterChangedOn', label: 'AC Filter (Cabin Filter)' },
  { key: 'lastSparkPlugsChangedOn', label: 'Spark Plugs' },
  { key: 'lastBatteryChangedOn', label: 'Battery' },
  { key: 'lastBrakePadsChangedOn', label: 'Brake Pads' },
  { key: 'lastTyresChangedOn', label: 'Tyres' },
];

const ON_ROAD_EDITABLE_CONFIG: { key: CarSpecEditableFieldKey; label: string }[] = [
  { key: 'puccExpireDate', label: 'PUCC' },
  { key: 'insuranceValidUpTo', label: 'Insurance' },
  { key: 'taxValidUpTo', label: 'Road Tax' },
  { key: 'fitnessValidUpTo', label: 'Fitness' },
];

const LEGAL_GALLERY_ITEMS: LegalGalleryItem[] = [
  { key: 'pucc', title: 'PUCC', subtitle: 'Pollution certificate', icon: 'eco', accent: '#2F7D32' },
  { key: 'insurance', title: 'Insurance', subtitle: 'Insurance policy document', icon: 'policy', accent: '#0A6B7A' },
  { key: 'rc', title: 'RC', subtitle: 'Registration certificate', icon: 'description', accent: '#0057B8' },
  { key: 'fitness', title: 'Fitness', subtitle: 'Fitness certificate', icon: 'verified', accent: '#8E5A00' },
  { key: 'roadTax', title: 'Road Tax', subtitle: 'Tax payment proof', icon: 'account-balance-wallet', accent: '#7A1FA2' },
  { key: 'numberPlate', title: 'Number Plate', subtitle: 'Registration plate photo', icon: 'directions-car', accent: '#455A64' },
];

function getGalleryKeyForSpecField(field: CarSpecEditableFieldKey): LegalGalleryKey | null {
  if (field === 'puccExpireDate') return 'pucc';
  if (field === 'insuranceValidUpTo') return 'insurance';
  if (field === 'fitnessValidUpTo') return 'fitness';
  if (field === 'taxValidUpTo') return 'roadTax';
  return null;
}

function parseExistingDate(value: string): Date {
  const parsed = dayjs(normalizeIndianDate(value), INDIA_DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return new Date();
  }
  return parsed.toDate();
}

const MAINTENANCE_INTERVALS_DAYS: Partial<Record<CarSpecEditableFieldKey, number>> = {
  lastMaintenanceDate: 180,
  lastEngineOilChangedOn: 180,
  lastCoolantRefillOn: 180,
  lastBrakeFluidChangedOn: 180,
  lastGearboxOilChangedOn: 180,
  lastAirFilterChangedOn: 180,
  lastOilFilterChangedOn: 180,
  lastAcFilterChangedOn: 180,
  lastSparkPlugsChangedOn: 180,
  lastBatteryChangedOn: 180,
  lastBrakePadsChangedOn: 180,
  lastTyresChangedOn: 180,
};

type TrafficLightColor = 'green' | 'yellow' | 'orange' | 'red';

function getTrafficLightStatus(value: string, fieldKey: CarSpecEditableFieldKey, isExpiryDate: boolean): { color: TrafficLightColor, hex: string, rgba: string, text: string, remainingDays: number } | null {
  if (value === 'Not set' || !value) {
    return null;
  }
  const parsed = dayjs(normalizeIndianDate(value), INDIA_DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return null;
  }

  let dueDate = parsed;
  if (!isExpiryDate) {
    const intervalDays = MAINTENANCE_INTERVALS_DAYS[fieldKey] ?? 365;
    dueDate = parsed.add(intervalDays, 'day').startOf('day');
  } else {
    dueDate = parsed.startOf('day');
  }

  const today = dayjs().startOf('day');
  const remainingDays = dueDate.diff(today, 'day');

  let color: TrafficLightColor = 'green';
  let hex = '#10B981'; // Green
  let rgba = 'rgba(16, 185, 129, 0.15)';

  if (remainingDays <= 0) {
    color = 'red';
    hex = '#EF4444';
    rgba = 'rgba(239, 68, 68, 0.15)';
  } else if (remainingDays <= 15) {
    color = 'orange';
    hex = '#F97316';
    rgba = 'rgba(249, 115, 22, 0.15)';
  } else if (remainingDays <= 60) {
    color = 'yellow';
    hex = '#EAB308';
    rgba = 'rgba(234, 179, 8, 0.15)';
  }

  let text = '';
  if (remainingDays < 0) {
    text = `Overdue by ${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? '' : 's'}`;
  } else if (remainingDays === 0) {
    text = 'Due today';
  } else {
    text = `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`;
  }

  return { color, hex, rgba, text, remainingDays };
}

export function CarInfoBottomSheet({ visible, carSpec, lastOdometer, onClose, onSaveFieldEdit }: CarInfoBottomSheetProps) {
  const { colors, isDark } = useAppTheme();
  const [rendered, setRendered] = useState(visible);
  const [activeTab, setActiveTab] = useState<CarSpecTab>('health');
  const [activeField, setActiveField] = useState<CarSpecEditableFieldKey | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<LegalGalleryKey | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const [draftCost, setDraftCost] = useState('');
  const [draftOdometer, setDraftOdometer] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const translateY = useRef(new Animated.Value(420)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.5) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 420,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

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
      setActiveTab('health');
      setSelectedGalleryItem(null);
      setDraftCost('');
      setDraftOdometer('');
      setShowDatePicker(false);
    });
  }, [overlayOpacity, translateY, visible]);

  const healthRows = useMemo<SpecRow[]>(() => {
    const editableRows: SpecRow[] = HEALTH_EDITABLE_CONFIG.map((item) => ({
      key: item.key,
      label: item.label,
      value: carSpec[item.key],
      editable: true,
    }));

    return editableRows;
  }, [carSpec]);

  const onRoadRows = useMemo<SpecRow[]>(() => {
    const editableRows: SpecRow[] = ON_ROAD_EDITABLE_CONFIG.map((item) => ({
      key: item.key,
      label: item.label,
      value: carSpec[item.key],
      editable: true,
    }));
    return editableRows;
  }, [carSpec]);

  const identityRows = useMemo<SpecRow[]>(
    () => [
      { key: 'purchasedOn', label: 'We Purchased on', value: carSpec.purchasedOn, editable: false },
      { key: 'registrationNumber', label: 'Registration No', value: carSpec.registrationNumber, editable: false, canCopy: true },
      { key: 'chassisNumber', label: 'Chassis No', value: carSpec.chassisNumber, editable: false, canCopy: true },
      { key: 'engineNumber', label: 'Engine No', value: carSpec.engineNumber, editable: false, canCopy: true },
      { key: 'registrationDate', label: 'Reg Date', value: carSpec.registrationDate, editable: false },
      { key: 'manufacturingYear', label: 'Manufacturing Yr', value: carSpec.manufacturingYear, editable: false },
      { key: 'model', label: 'Model', value: carSpec.model, editable: false },
      { key: 'variant', label: 'Variant', value: carSpec.variant, editable: false },
      { key: 'carColor', label: 'Colour', value: carSpec.carColor, editable: false },
      { key: 'fuelType', label: 'Fuel Type', value: carSpec.fuelType, editable: false },
      { key: 'registrationYear', label: 'Registration Yr', value: carSpec.registrationYear, editable: false },
      { key: 'initialOdometer', label: 'Initial Odometer', value: `${carSpec.initialOdometer} km`, editable: false },
    ],
    [carSpec],
  );

  const activeRows =
    activeTab === 'health' ? healthRows : activeTab === 'on_road' ? onRoadRows : identityRows;
  const selectedGalleryCard = useMemo(
    () => LEGAL_GALLERY_ITEMS.find((item) => item.key === selectedGalleryItem) ?? null,
    [selectedGalleryItem],
  );
  const editableRows = useMemo(() => activeRows.filter((row) => row.editable), [activeRows]);
  const nonEditableRows = useMemo(() => activeRows.filter((row) => !row.editable), [activeRows]);
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
    const config = [...HEALTH_EDITABLE_CONFIG, ...ON_ROAD_EDITABLE_CONFIG].find((item) => item.key === activeField);
    if (!config) {
      return;
    }

    if (carSpec[activeField] === nextValue) {
      cancelEdit();
      return;
    }

    const parsedCost = draftCost.trim() ? Number(draftCost) : NaN;
    const parsedOdometer = Number(draftOdometer);

    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      Alert.alert('Invalid cost', 'Cost must be provided for spec update entries.');
      return;
    }

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
          <View {...panResponder.panHandlers}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>CAR SPECS</Text>
              <Pressable onPress={onClose} style={styles.iconBtn}>
                <MaterialIcons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
            <View style={[styles.tabRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {([
                { key: 'health', label: 'Car Health' },
                { key: 'on_road', label: 'On Road' },
                { key: 'identity', label: 'Car Identity' },
              ] as { key: CarSpecTab; label: string }[]).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setActiveTab(tab.key);
                      setActiveField(null);
                      setShowDatePicker(false);
                    }}
                    style={[
                      styles.tabButton,
                      {
                        borderColor: active ? colors.textPrimary : colors.border,
                        backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}>
                    <Text style={[styles.tabButtonText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {editableRows.map((row) => {
              const isActive = row.editable && row.key === activeField;
              const status = row.editable ? getTrafficLightStatus(row.value, row.key as CarSpecEditableFieldKey, activeTab === 'on_road') : null;
              const viewKey =
                row.editable && activeTab === 'on_road'
                  ? getGalleryKeyForSpecField(row.key as CarSpecEditableFieldKey)
                  : null;

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
                      <View style={styles.valueRow}>
                          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.value}</Text>
                      </View>
                      {status ? (
                        <View style={[styles.statusPill, { backgroundColor: status.rgba }]}>
                           <Text style={[styles.statusPillText, { color: status.hex }]}>{status.text}</Text>
                        </View>
                      ) : null}
                    </View>
                    {row.editable ? (
                      <View style={styles.rowActions}>
                        {viewKey ? (
                          <Pressable
                            onPress={() => setSelectedGalleryItem(viewKey)}
                            style={[
                              styles.editIconBtn,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.backgroundSecondary,
                              },
                            ]}>
                            <MaterialIcons name="image" size={18} color={colors.textPrimary} />
                          </Pressable>
                        ) : null}
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
                      </View>
                    ) : null}
                  </View>

                  {isActive ? (
                    <View style={[styles.inlineEditor, { borderTopColor: colors.border }]}>
                      <View style={[styles.editCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
                              accentColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                              display={Platform.OS === 'ios' ? 'inline' : undefined}
                              onChange={handleDatePickerChange}
                              positiveButton={Platform.OS === 'android' ? { label: 'Save', textColor: colors.textPrimary } : undefined}
                              negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: colors.textSecondary } : undefined}
                              textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                              themeVariant={Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined}
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

                        <View style={{ marginTop: 6 }}>
                          <OdometerDigitInput
                            label="Odometer Snapshot (km)"
                            value={draftOdometer}
                            onChangeText={setDraftOdometer}
                            error={draftOdometer && Number(draftOdometer) < lastOdometer ? `Must be >= ${lastOdometer}` : undefined}
                          />
                        </View>

                        <AppTextField
                          label="Cost (₹)"
                          value={draftCost}
                          onChangeText={setDraftCost}
                          keyboardType="decimal-pad"
                          placeholder="e.g. 1200"
                        />

                        <View style={styles.editorActions}>
                          <Pressable
                            onPress={cancelEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                            ]}>
                            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                            <Text style={[styles.coolActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
                          </Pressable>
                          
                          <Pressable
                            onPress={saveEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary, opacity: pressed ? 0.8 : 1 },
                            ]}>
                            <MaterialIcons name="check" size={18} color={colors.invertedText} />
                            <Text style={[styles.coolActionBtnText, { color: colors.invertedText }]}>SAVE</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {nonEditableRows.length > 0 ? (
              <View style={[styles.nonEditablePanel, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.nonEditableTitle, { color: colors.textPrimary }]}>
                  {activeTab === 'health'
                    ? 'Health Snapshot'
                    : activeTab === 'on_road'
                      ? 'On Road Snapshot'
                      : 'Car Identity Snapshot'}
                </Text>
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
            ) : null}

            {activeTab === 'on_road' ? (
              <View style={[styles.galleryPanel, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.galleryHeader}>
                  <View style={styles.galleryCopy}>
                    <Text style={[styles.nonEditableTitle, { color: colors.textPrimary }]}>Photo Gallery</Text>
                    <Text style={[styles.galleryHint, { color: colors.textSecondary }]}>
                      Open quick previews for PUCC, RC, Fitness, Road Tax, and Number Plate.
                    </Text>
                  </View>
                </View>

                <View style={styles.galleryGrid}>
                  {LEGAL_GALLERY_ITEMS.map((item) => (
                    <Pressable
                      key={item.key}
                      onPress={() => setSelectedGalleryItem(item.key)}
                      style={[
                        styles.galleryCard,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundSecondary,
                        },
                      ]}>
                      <View style={[styles.galleryIconWrap, { backgroundColor: item.accent }]}>
                        <MaterialIcons name={item.icon} size={18} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.gallerySubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>

      {selectedGalleryCard ? (
        <View style={styles.viewerOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedGalleryItem(null)} />
          <View style={[styles.viewerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.viewerHeader}>
              <View>
                <Text style={[styles.viewerTitle, { color: colors.textPrimary }]}>{selectedGalleryCard.title}</Text>
                <Text style={[styles.viewerSubtitle, { color: colors.textSecondary }]}>{selectedGalleryCard.subtitle}</Text>
              </View>
              <Pressable
                onPress={() => setSelectedGalleryItem(null)}
                style={[styles.viewerCloseBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <MaterialIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={[styles.viewerPreview, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={[styles.viewerBadge, { backgroundColor: selectedGalleryCard.accent }]}>
                <MaterialIcons name={selectedGalleryCard.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.viewerDocTitle, { color: colors.textPrimary }]}>{selectedGalleryCard.title}</Text>
              <Text style={[styles.viewerDocMeta, { color: colors.textSecondary }]}>
                Preview slot ready for document image asset.
              </Text>
              <Text style={[styles.viewerDocMeta, { color: colors.textSecondary }]}>
                Replace this card with a scanned image when the final files are available.
              </Text>
            </View>
          </View>
        </View>
      ) : null}
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
  tabRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  nonEditablePanel: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    gap: 8,
  },
  galleryPanel: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    gap: 10,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  galleryCopy: {
    flex: 1,
    gap: 3,
  },
  galleryHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  galleryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gallerySubtitle: {
    fontSize: 11,
    lineHeight: 16,
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
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
  editCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  inlineEditor: {
    borderTopWidth: 1,
    paddingTop: 14,
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
    gap: 12,
    marginTop: 8,
  },
  coolActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  coolActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  customDatePicker: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewerCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  viewerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  viewerSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  viewerCloseBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerPreview: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  viewerBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerDocTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  viewerDocMeta: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
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
