import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { TyreHealthSection } from '@/components/TyreHealthSection';
import { pushDocumentToRealtimeDb } from '@/services/realtime/documentsRepository';
import { getLocalDocument, saveDocumentFromUri } from '@/services/storage/localDocuments';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type {
  CarDocumentKey,
  CarSpec,
  CarSpecEditableFieldKey,
  CarSpecFieldUpdateSubmission,
} from '@/types/models';
import { dayjs, INDIA_DATE_FORMAT, normalizeIndianDate } from '@/utils/day';

import insurancePdf from '../../assets/pdf/insurence.pdf';
import numberPlateJpg from '../../assets/pdf/number_plate.jpg';
import pdiReportPdf from '../../assets/pdf/pdi_report.pdf';
import rcPdf from '../../assets/pdf/RC.pdf';

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
type LegalGalleryKey = 'pucc' | 'insurance' | 'rc' | 'fitness' | 'roadTax' | 'numberPlate' | 'pdiReport';

type LegalGalleryItem = {
  key: LegalGalleryKey;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
};

const HEALTH_EDITABLE_CONFIG: { key: CarSpecEditableFieldKey; label: string; intervalKm?: number }[] = [
  { key: 'lastMaintenanceDate', label: 'Last Maintenance' },
  { key: 'lastCoolantRefillOn', label: 'Coolant' },
  { key: 'lastEngineOilChangedOn', label: 'Engine Oil' },
  { key: 'lastBrakeFluidChangedOn', label: 'Brake Fluid' },
  { key: 'lastGearboxOilChangedOn', label: 'Gearbox Oil' },
  { key: 'lastAirFilterChangedOn', label: 'Air Filter' },
  { key: 'lastOilFilterChangedOn', label: 'Oil Filter' },
  { key: 'lastAcFilterChangedOn', label: 'AC Filter' },
  { key: 'lastSparkPlugsChangedOn', label: 'Spark Plugs' },
  { key: 'lastBatteryChangedOn', label: 'Battery' },
  { key: 'lastBrakePadsChangedOn', label: 'Brake Pads' },
  { key: 'lastWheelAlignmentOn', label: 'Wheel Alignment', intervalKm: 5000 },
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
  { key: 'pdiReport', title: 'PDI Report', subtitle: 'Pre-delivery inspection report', icon: 'fact-check', accent: '#B71C1C' },
];

async function openFileByUri(localUri: string, mimeType: string, cacheFileName: string): Promise<void> {
  if (Platform.OS === 'android') {
    const cacheUri = (FileSystem.cacheDirectory ?? '') + cacheFileName;
    await FileSystem.copyAsync({ from: localUri, to: cacheUri });
    const contentUri = await FileSystem.getContentUriAsync(cacheUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, 
      type: mimeType,
    });
  } else {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Not supported', 'File sharing is not available on this device.');
      return;
    }
    const uti = mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined;
    await Sharing.shareAsync(localUri, { mimeType, ...(uti ? { UTI: uti } : {}) });
  }
}

const BUNDLED_ASSETS: Partial<Record<CarDocumentKey, { module: number; cacheFileName: string; mimeType: string }>> = {
  pdiReport: { module: pdiReportPdf, cacheFileName: 'pdi_report.pdf', mimeType: 'application/pdf' },
  insurance: { module: insurancePdf, cacheFileName: 'insurance.pdf', mimeType: 'application/pdf' },
  rc: { module: rcPdf, cacheFileName: 'rc.pdf', mimeType: 'application/pdf' },
  numberPlate: { module: numberPlateJpg, cacheFileName: 'number_plate.jpg', mimeType: 'image/jpeg' },
};

async function openDocument(docKey: CarDocumentKey, docTitle: string): Promise<void> {
  try {
    const localDoc = await getLocalDocument(docKey);
    if (localDoc) {
      const ext = localDoc.fileName.split('.').pop() ?? 'pdf';
      await openFileByUri(localDoc.localUri, localDoc.mimeType, `${docKey}_user.${ext}`);
      return;
    }

    const bundled = BUNDLED_ASSETS[docKey];
    if (bundled) {
      const asset = Asset.fromModule(bundled.module);
      await asset.downloadAsync();
      if (!asset.localUri) {
        Alert.alert('Error', `Could not load ${docTitle}.`);
        return;
      }
      await openFileByUri(asset.localUri, bundled.mimeType, bundled.cacheFileName);
      return;
    }

    Alert.alert('No document', `No ${docTitle} document is available yet. Attach one using the upload button in the gallery.`);
  } catch {
    Alert.alert('Error', `Failed to open ${docTitle}.`);
  }
}

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
  lastCoolantRefillOn: 730,       
  lastEngineOilChangedOn: 365,    
  lastBrakeFluidChangedOn: 730,   
  lastGearboxOilChangedOn: 1825,  
  lastAirFilterChangedOn: 365,    
  lastOilFilterChangedOn: 365,    
  lastAcFilterChangedOn: 365,     
  lastSparkPlugsChangedOn: 1095,  
  lastBatteryChangedOn: 1095,     
  lastBrakePadsChangedOn: 730,    
};

type TrafficLightColor = 'green' | 'yellow' | 'orange' | 'red';

function convertDaysToYMD(days: number): { years: number; months: number; days: number } {
  const years = Math.floor(days / 365);
  const remainingDaysAfterYears = days % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);
  const remainingDays = remainingDaysAfterYears % 30;
  
  return { years, months, days: remainingDays };
}

function formatYMD({ years, months, days }: { years: number; months: number; days: number }): string {
  const parts = [];
  if (years > 0) parts.push(`${years}Y`);
  if (months > 0) parts.push(`${months}M`);
  if (days > 0) parts.push(`${days}D`);
  return parts.length > 0 ? parts.join(' ') : '0D';
}

function getTrafficLightStatus(value: string, fieldKey: CarSpecEditableFieldKey, isExpiryDate: boolean): { color: TrafficLightColor, hex: string, rgba: string, text: string, remainingDays: number } | null {
  if (value === 'Not set' || !value) {
    return null;
  }
  const parsed = dayjs(normalizeIndianDate(value), INDIA_DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return null;
  }

  const today = dayjs().startOf('day');
  const dueDate = !isExpiryDate 
    ? parsed.add(MAINTENANCE_INTERVALS_DAYS[fieldKey] ?? 365, 'day').startOf('day')
    : parsed.startOf('day');
  const remainingDays = dueDate.diff(today, 'day');

  let color: TrafficLightColor = 'green';
  let hex = '#10B981'; 
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

  const statusText = remainingDays < 0
    ? `Overdue by ${formatYMD(convertDaysToYMD(Math.abs(remainingDays)))}`
    : remainingDays === 0
      ? 'Due today'
      : `${formatYMD(convertDaysToYMD(remainingDays))} left`;

  return { color, hex, rgba, text: statusText, remainingDays };
}

const WHEEL_ALIGNMENT_INTERVAL_KM = 5000;

function getWheelAlignmentStatus(lastAlignmentOdometer: number | undefined, currentOdometer: number): { color: TrafficLightColor; hex: string; rgba: string; text: string; remainingKm: number } | null {
  if (lastAlignmentOdometer === undefined || lastAlignmentOdometer <= 0) {
    return null;
  }
  const kmDriven = currentOdometer - lastAlignmentOdometer;
  const remainingKm = WHEEL_ALIGNMENT_INTERVAL_KM - kmDriven;

  let color: TrafficLightColor = 'green';
  let hex = '#10B981';
  let rgba = 'rgba(16, 185, 129, 0.15)';

  if (remainingKm <= 0) {
    color = 'red';
    hex = '#EF4444';
    rgba = 'rgba(239, 68, 68, 0.15)';
  } else if (remainingKm <= 500) {
    color = 'orange';
    hex = '#F97316';
    rgba = 'rgba(249, 115, 22, 0.15)';
  } else if (remainingKm <= 1500) {
    color = 'yellow';
    hex = '#EAB308';
    rgba = 'rgba(234, 179, 8, 0.15)';
  }

  const statusText = remainingKm < 0
    ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
    : remainingKm === 0
      ? 'Due now'
      : `${remainingKm.toLocaleString()} km left`;

  return { color, hex, rgba, text: statusText, remainingKm };
}

export function CarInfoBottomSheet({ visible, carSpec, lastOdometer, onClose, onSaveFieldEdit }: CarInfoBottomSheetProps) {
  const { colors, isDark } = useAppTheme();
  const secondarySurfaceColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const shellSurfaceColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  const entries = useAppStore((state) => state.entries);
  const currentUser = useAppStore((state) => state.currentUser);
  const [rendered, setRendered] = useState(visible);
  const [activeTab, setActiveTab] = useState<CarSpecTab>('health');
  const [activeField, setActiveField] = useState<CarSpecEditableFieldKey | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<LegalGalleryKey | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const [draftCost, setDraftCost] = useState('');
  const [draftOdometer, setDraftOdometer] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUploadDocument = useCallback(async (docKey: CarDocumentKey, docTitle: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const pickedFile = result.assets[0];
      if (!pickedFile.uri || !pickedFile.name) {
        Alert.alert('Error', 'Could not read the selected file.');
        return;
      }

      if (pickedFile.size && pickedFile.size > 5 * 1024 * 1024) {
        Alert.alert(
          'File too large',
          `The selected file is ${(pickedFile.size / (1024 * 1024)).toFixed(1)} MB. Please choose a file under 5 MB to ensure reliable sync.`,
        );
        return;
      }

      setIsUploading(true);
      const mimeType = pickedFile.mimeType ?? 'application/pdf';

      const { localDoc, base64Data } = await saveDocumentFromUri(docKey, pickedFile.uri, pickedFile.name, mimeType);

      try {
        await pushDocumentToRealtimeDb(docKey, {
          data: base64Data,
          fileName: localDoc.fileName,
          mimeType: localDoc.mimeType,
          uploadedAt: Date.now(),
          uploadedByUserId: currentUser?.id ?? 'unknown',
          uploadedByUserName: currentUser?.name ?? 'Unknown',
        });
        Alert.alert('Uploaded', `${docTitle} has been saved and will sync to other devices.`);
      } catch {
        Alert.alert('Saved locally', `${docTitle} was saved on this device but could not be synced. It will retry on next sync.`);
      }
    } catch {
      Alert.alert('Error', `Failed to upload ${docTitle}.`);
    } finally {
      setIsUploading(false);
    }
  }, [currentUser]);

  const translateY = useRef(new Animated.Value(420)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.5) {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 420, duration: 200, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onClose());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.setValue(420);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, { toValue: 420, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
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

  const healthRows = useMemo<SpecRow[]>(() => HEALTH_EDITABLE_CONFIG.map((item) => ({ key: item.key, label: item.label, value: carSpec[item.key], editable: true })), [carSpec]);
  const onRoadRows = useMemo<SpecRow[]>(() => ON_ROAD_EDITABLE_CONFIG.map((item) => ({ key: item.key, label: item.label, value: carSpec[item.key], editable: true })), [carSpec]);
  const identityRows = useMemo<SpecRow[]>(() => [
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
  ], [carSpec]);

  const activeRows = activeTab === 'health' ? healthRows : activeTab === 'on_road' ? onRoadRows : identityRows;
  const selectedGalleryCard = useMemo(() => LEGAL_GALLERY_ITEMS.find((item) => item.key === selectedGalleryItem) ?? null, [selectedGalleryItem]);
  const editableRows = useMemo(() => activeRows.filter((row) => row.editable), [activeRows]);
  const nonEditableRows = useMemo(() => activeRows.filter((row) => !row.editable), [activeRows]);
  const nonEditableGridRows = useMemo(() => {
    const pairs: SpecRow[][] = [];
    for (let index = 0; index < nonEditableRows.length; index += 2) pairs.push(nonEditableRows.slice(index, index + 2));
    return pairs;
  }, [nonEditableRows]);

  const fastagData = useMemo(() => {
    let totalRecharges = 0;
    let totalTolls = 0;

    for (const entry of entries) {
      if (entry.type !== 'expense' || typeof entry.cost !== 'number') continue;
      const titleLower = (entry.expenseTitle ?? '').toLowerCase();
      const isFastagRecharge = (titleLower.includes('fastag') || titleLower.includes('fast tag')) && titleLower.includes('recharge');

      if (isFastagRecharge) {
        totalRecharges += entry.cost;
      }
      if (entry.expenseCategory === 'fasttag_toll_paid') {
        totalTolls += entry.cost;
      }
    }
    return { balance: totalRecharges - totalTolls };
  }, [entries]);

  const beginEdit = (field: CarSpecEditableFieldKey) => {
    if (activeField === field) { cancelEdit(); return; }
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
    if (!activeField) return;
    const nextValue = dayjs(draftDate).format(INDIA_DATE_FORMAT);
    const config = [...HEALTH_EDITABLE_CONFIG, ...ON_ROAD_EDITABLE_CONFIG].find((item) => item.key === activeField);
    if (!config) return;

    if (carSpec[activeField] === nextValue) { cancelEdit(); return; }

    const parsedCost = draftCost.trim() ? Number(draftCost) : NaN;
    const parsedOdometer = Number(draftOdometer);

    if (Number.isNaN(parsedCost) || parsedCost < 0) { Alert.alert('Invalid cost', 'Cost must be provided for spec update entries.'); return; }
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) { Alert.alert('Invalid odometer', 'Enter a valid odometer reading.'); return; }
    // Skip odometer restrictions for wheel alignment (can be historical entry)
    if (activeField !== 'lastWheelAlignmentOn') {
      if (parsedOdometer < lastOdometer) { Alert.alert('Invalid odometer', 'New odometer entry cannot be less than the previous value.'); return; }
      if (parsedOdometer - lastOdometer > 500) { Alert.alert('Invalid odometer', 'Single odometer entry cannot exceed 500 km from the previous reading.'); return; }
    }

    onSaveFieldEdit({
      field: activeField,
      label: config.label,
      previousValue: carSpec[activeField],
      value: nextValue,
      odometer: parsedOdometer,
      cost: Number.isFinite(parsedCost) ? parsedCost : undefined,
      wheelAlignmentOdometer: activeField === 'lastWheelAlignmentOn' ? parsedOdometer : undefined,
    });
    cancelEdit();
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    if (selectedDate) setDraftDate(selectedDate);
    if (Platform.OS !== 'ios') setShowDatePicker(false);
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Copied', `${label} copied to clipboard.`);
    } catch {
      Alert.alert('Copy failed', `Could not copy ${label.toLowerCase()}.`);
    }
  };

  if (!rendered) return null;

  const isGridTab = activeTab === 'health' || activeTab === 'on_road';

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible={rendered} onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.sheetAnchor}>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.backgroundSecondary, transform: [{ translateY }] },
          ]}>
          <View {...panResponder.panHandlers}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? '#404040' : '#D4D4D8' }]} />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>CAR SPECS</Text>
              <Pressable onPress={onClose} style={[styles.iconBtn, { backgroundColor: secondarySurfaceColor }]}>
                <MaterialIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap} keyboardShouldPersistTaps="handled" enableOnAndroid={true}>
            
            {/* Segmented Control Tabs */}
            <View style={[styles.tabRow, { backgroundColor: shellSurfaceColor }]}>
              {([{ key: 'health', label: 'Car Health' }, { key: 'on_road', label: 'On Road' }, { key: 'identity', label: 'Car Identity' }] as const).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => { setActiveTab(tab.key); setActiveField(null); setShowDatePicker(false); }}
                    style={[
                      styles.tabButton,
                      active && styles.tabButtonActive,
                      { backgroundColor: active ? colors.textPrimary : 'transparent' }
                    ]}>
                    <Text style={[styles.tabButtonText, { color: active ? colors.invertedText : colors.textPrimary }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Editable Fields rendered via dynamic Grid container */}
            <View style={isGridTab ? styles.gridContainer : styles.listContainer}>
              {editableRows.map((row) => {
                const isActive = row.editable && row.key === activeField;
                const isWheelAlignment = row.key === 'lastWheelAlignmentOn';
                const status = row.editable
                  ? isWheelAlignment
                    ? getWheelAlignmentStatus(carSpec.lastWheelAlignmentOdometer, lastOdometer)
                    : getTrafficLightStatus(row.value, row.key as CarSpecEditableFieldKey, activeTab === 'on_road')
                  : null;
                const viewKey = row.editable && activeTab === 'on_road' ? getGalleryKeyForSpecField(row.key as CarSpecEditableFieldKey) : null;
                const isCompact = isGridTab && !isActive;

                return (
                  <View 
                    key={row.key} 
                    style={[
                      styles.rowCard, 
                      { backgroundColor: colors.card, borderColor: isActive ? colors.textPrimary : 'transparent', borderWidth: isActive ? 1 : 0 },
                      isGridTab ? (isActive ? styles.gridCardFull : styles.gridCardHalf) : styles.gridCardFull
                    ]}
                  >
                    {/* The new structured compact header */}
                    <View style={isCompact ? styles.compactHeaderRow : styles.rowTop}>
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }, isCompact && { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                        {row.label}
                      </Text>

                      {row.editable ? (
                        <View style={styles.compactActionsRow}>
                          {viewKey ? (
                            <Pressable
                              onPress={() => {
                                const galleryItem = LEGAL_GALLERY_ITEMS.find((g) => g.key === viewKey);
                                void openDocument(viewKey as CarDocumentKey, galleryItem?.title ?? viewKey);
                              }}
                              style={[styles.actionIconBtn, isCompact && { width: 32, height: 32 }, { backgroundColor: secondarySurfaceColor }]}>
                              <MaterialIcons name="image" size={isCompact ? 16 : 18} color={colors.textPrimary} />
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() => beginEdit(row.key as CarSpecEditableFieldKey)}
                            style={[styles.actionIconBtn, isCompact && { width: 32, height: 32 }, { backgroundColor: isActive ? colors.textPrimary : secondarySurfaceColor }]}>
                            <MaterialIcons name={isActive ? 'expand-less' : 'edit'} size={isCompact ? 16 : 18} color={isActive ? colors.invertedText : colors.textPrimary} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    {/* Data Display */}
                    <View style={isCompact ? styles.compactDataRow : styles.valueRow}>
                      <Text style={[styles.rowValue, isCompact && { fontSize: 16 }, { color: colors.textPrimary }]}>{row.value}</Text>
                      {status ? (
                        <View style={[styles.statusPill, isCompact && { paddingHorizontal: 8, paddingVertical: 4 }, { backgroundColor: status.rgba }]}>
                           <Text style={[styles.statusPillText, isCompact && { fontSize: 10 }, { color: status.hex }]} numberOfLines={1}>
                             {status.text}
                           </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Form expansion */}
                    {isActive ? (
                      <View style={styles.inlineEditor}>
                        <View style={[styles.editCard, { backgroundColor: secondarySurfaceColor }]}>
                          <View style={[styles.editorBadgeRow, { backgroundColor: colors.background }]}>
                            <Text style={[styles.editorBadgeText, { color: colors.textPrimary }]}>SPEC UPDATE ENTRY</Text>
                            <Text style={[styles.editorHintText, { color: colors.textSecondary }]}>Previous odometer {lastOdometer} km</Text>
                          </View>

                          <Pressable style={[styles.dateSelect, { backgroundColor: colors.background }]} onPress={() => setShowDatePicker((prev) => !prev)}>
                            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Date</Text>
                            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dayjs(draftDate).format(INDIA_DATE_FORMAT)}</Text>
                          </Pressable>

                          {showDatePicker ? (
                            <View style={[styles.customDatePicker, { backgroundColor: colors.background }]}>
                              <DateTimePicker mode="date" value={draftDate} accentColor={Platform.OS === 'ios' ? colors.textPrimary : undefined} display={Platform.OS === 'ios' ? 'inline' : undefined} onChange={handleDatePickerChange} positiveButton={Platform.OS === 'android' ? { label: 'Save', textColor: colors.textPrimary } : undefined} negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: colors.textSecondary } : undefined} textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined} themeVariant={Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined} />
                              {Platform.OS === 'ios' ? (
                                <Pressable onPress={() => setShowDatePicker(false)} style={[styles.datePickerDoneBtn, { backgroundColor: secondarySurfaceColor }]}>
                                  <Text style={[styles.datePickerDoneText, { color: colors.textPrimary }]}>Done</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          ) : null}

                          <View style={{ marginTop: 6 }}>
                            <OdometerDigitInput label="Odometer Snapshot (km)" value={draftOdometer} onChangeText={setDraftOdometer} error={draftOdometer && Number(draftOdometer) < lastOdometer ? `Must be >= ${lastOdometer}` : undefined} />
                          </View>

                          <AppTextField label="Cost (₹)" value={draftCost} onChangeText={setDraftCost} keyboardType="decimal-pad" placeholder="e.g. 1200" />

                          {viewKey ? (
                            <Pressable
                              onPress={() => void pickAndUploadDocument(viewKey as CarDocumentKey, row.label)}
                              disabled={isUploading}
                              style={({ pressed }) => [styles.attachDocBtn, { backgroundColor: colors.background, opacity: pressed || isUploading ? 0.6 : 1 }]}>
                              {isUploading ? <ActivityIndicator size={16} color={colors.textPrimary} /> : <MaterialIcons name="cloud-upload" size={18} color={colors.textPrimary} />}
                              <Text style={[styles.attachDocBtnText, { color: colors.textPrimary }]}>{isUploading ? 'UPLOADING…' : `ATTACH ${row.label.toUpperCase()} DOCUMENT`}</Text>
                            </Pressable>
                          ) : null}

                          <View style={styles.editorActions}>
                            <Pressable onPress={cancelEdit} style={({ pressed }) => [styles.pillActionBtn, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}>
                              <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                              <Text style={[styles.pillActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
                            </Pressable>
                            
                            <Pressable onPress={saveEdit} style={({ pressed }) => [styles.pillActionBtn, { backgroundColor: colors.textPrimary, opacity: pressed ? 0.8 : 1 }]}>
                              <MaterialIcons name="check" size={18} color={colors.invertedText} />
                              <Text style={[styles.pillActionBtnText, { color: colors.invertedText }]}>SAVE</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {nonEditableRows.length > 0 ? (
              <View style={[styles.nonEditablePanel, { backgroundColor: colors.card }]}>
                <Text style={[styles.nonEditableTitle, { color: colors.textPrimary }]}>
                  {activeTab === 'health' ? 'Health Snapshot' : activeTab === 'on_road' ? 'On Road Snapshot' : 'Car Identity Snapshot'}
                </Text>
                {nonEditableGridRows.map((pair, rowIndex) => (
                  <View key={`grid-${rowIndex}`} style={styles.nonEditableGridRow}>
                    {pair.map((row, cellIndex) => (
                      <View key={row.key} style={[styles.nonEditableCell, { backgroundColor: secondarySurfaceColor }, cellIndex === 0 ? { marginRight: 4 } : { marginLeft: 4 }]}>
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

            {activeTab === 'health' ? <TyreHealthSection currentOdometer={lastOdometer} /> : null}

            {activeTab === 'on_road' ? (
              <>
                {/* ── NEW SMART CARD FASTag UI ── */}
                <View style={styles.fastagSmartCard}>
                  <View style={styles.fastagCardTop}>
                     <View style={styles.fastagLogoBlock}>
                        <Text style={styles.fastagTextOrange}>FAST</Text>
                        <Text style={styles.fastagTextGreen}>ag</Text>
                     </View>
                     <MaterialCommunityIcons name="contactless-payment" size={26} color="#FFFFFF" style={{ opacity: 0.9 }} />
                  </View>

                  <View style={styles.fastagCardBottom}>
                     <View>
                        <Text style={styles.fastagLabel}>CURRENT BALANCE</Text>
                        <Text style={[styles.fastagAmount, { color: fastagData.balance > 100 ? '#FFFFFF' : '#FCA5A5' }]}>
                           ₹ {fastagData.balance.toLocaleString('en-IN')}
                        </Text>
                     </View>
                     <MaterialCommunityIcons name="car-connected" size={56} color="#FFFFFF" style={styles.fastagWatermark} />
                  </View>
                </View>

                <View style={[styles.galleryPanel, { backgroundColor: colors.card }]}>
                  <View style={styles.galleryHeader}>
                    <View style={styles.galleryCopy}>
                      <Text style={[styles.nonEditableTitle, { color: colors.textPrimary }]}>Document Gallery</Text>
                      <Text style={[styles.galleryHint, { color: colors.textSecondary }]}>Tap to view stored legal documents.</Text>
                    </View>
                  </View>
                  <View style={styles.galleryGrid}>
                    {LEGAL_GALLERY_ITEMS.map((item) => (
                      <Pressable key={item.key} onPress={() => void openDocument(item.key as CarDocumentKey, item.title)} style={[styles.galleryCard, { backgroundColor: secondarySurfaceColor }]}>
                        <View style={[styles.galleryIconWrap, { backgroundColor: item.accent }]}>
                          <MaterialIcons name={item.icon} size={18} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.gallerySubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            ) : null}
          </KeyboardAwareScrollView>
        </Animated.View>
      </View>

      {selectedGalleryCard ? (
        <View style={styles.viewerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedGalleryItem(null)} />
          <View style={[styles.viewerCard, { backgroundColor: colors.background }]}>
            <View style={styles.viewerHeader}>
              <View>
                <Text style={[styles.viewerTitle, { color: colors.textPrimary }]}>{selectedGalleryCard.title}</Text>
                <Text style={[styles.viewerSubtitle, { color: colors.textSecondary }]}>{selectedGalleryCard.subtitle}</Text>
              </View>
              <Pressable onPress={() => setSelectedGalleryItem(null)} style={[styles.actionIconBtn, { backgroundColor: secondarySurfaceColor }]}>
                <MaterialIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={[styles.viewerPreview, { backgroundColor: colors.card }]}>
              <View style={[styles.viewerBadge, { backgroundColor: selectedGalleryCard.accent }]}>
                <MaterialIcons name={selectedGalleryCard.icon} size={32} color="#FFFFFF" />
              </View>
              <Text style={[styles.viewerDocTitle, { color: colors.textPrimary }]}>{selectedGalleryCard.title}</Text>
              <Pressable onPress={() => void openDocument(selectedGalleryCard.key as CarDocumentKey, selectedGalleryCard.title)} style={({ pressed }) => [styles.openPdfBtn, { backgroundColor: selectedGalleryCard.accent, opacity: pressed ? 0.8 : 1 }]}>
                <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
                <Text style={styles.openPdfBtnText}>OPEN DOCUMENT</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetAnchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 48, height: 5, borderRadius: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, letterSpacing: -0.5, fontWeight: '800' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contentWrap: { gap: 14, paddingBottom: 20 },
  
  tabRow: { borderRadius: 20, padding: 6, flexDirection: 'row', gap: 4 },
  tabButton: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  tabButtonText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listContainer: { flexDirection: 'column', gap: 12 },
  gridCardHalf: { width: '48.2%' },
  gridCardFull: { width: '100%' },

  nonEditablePanel: { borderRadius: 24, padding: 20, gap: 12 },
  galleryPanel: { borderRadius: 24, padding: 20, gap: 16 },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryCopy: { flex: 1, gap: 4 },
  galleryHint: { fontSize: 12, lineHeight: 18 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryCard: { width: '48%', borderRadius: 20, padding: 16, gap: 8 },
  galleryIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  galleryTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  gallerySubtitle: { fontSize: 11, lineHeight: 16 },
  nonEditableTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  nonEditableGridRow: { flexDirection: 'row' },
  nonEditableCell: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
  staticCellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nonEditableCellSpacer: { flex: 1, marginLeft: 4 },
  
  rowCard: { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  
  // Refined Compact Layout to stop overlaps
  compactHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  compactActionsRow: { flexDirection: 'row', gap: 6 },
  compactDataRow: { marginTop: 4, gap: 6, alignItems: 'flex-start' },

  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  rowTitleWrap: { flex: 1, gap: 6 },
  rowLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '800' },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  
  rowValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  actionIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  copyIconBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  
  inlineEditor: { paddingTop: 16 },
  editCard: { padding: 16, borderRadius: 20, gap: 14 },
  editorBadgeRow: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  editorBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  editorHintText: { fontSize: 12 },
  dateSelect: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  dateLabel: { fontSize: 11, letterSpacing: 0.4 },
  dateValue: { fontSize: 15, fontWeight: '800' },
  editorActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  pillActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 999, gap: 6 },
  pillActionBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  attachDocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 4 },
  attachDocBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  customDatePicker: { borderRadius: 16, padding: 12, gap: 8 },
  
  viewerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  viewerCard: { borderRadius: 28, padding: 24, gap: 20 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  viewerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  viewerSubtitle: { fontSize: 13, marginTop: 4 },
  viewerPreview: { borderRadius: 24, padding: 30, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 16 },
  viewerBadge: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  viewerDocTitle: { fontSize: 20, fontWeight: '900' },
  datePickerDoneBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  datePickerDoneText: { fontSize: 14, fontWeight: '800' },
  openPdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 999, marginTop: 12 },
  openPdfBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  
  // ── FASTAG SMART CARD STYLES ──
  fastagSmartCard: { 
    backgroundColor: '#0F172A', // Deep slate/navy
    borderRadius: 24, 
    padding: 24, 
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6,
    overflow: 'hidden'
  },
  fastagCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fastagLogoBlock: { flexDirection: 'row', alignItems: 'center' },
  fastagTextOrange: { color: '#F97316', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  fastagTextGreen: { color: '#10B981', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  fastagCardBottom: { marginTop: 32, position: 'relative' },
  fastagLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  fastagAmount: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  fastagWatermark: { position: 'absolute', right: -10, bottom: -10, opacity: 0.05, transform: [{ scale: 1.5 }] },
});