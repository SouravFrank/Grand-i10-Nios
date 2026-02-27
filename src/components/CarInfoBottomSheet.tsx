import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppTheme } from '@/theme/useAppTheme';
import type { CarSpec, CarSpecEditableFields } from '@/types/models';

type CarInfoField = {
  label: string;
  value: string;
};

type CarInfoBottomSheetProps = {
  visible: boolean;
  carSpec: CarSpec;
  onClose: () => void;
  onSaveEdits: (updates: CarSpecEditableFields) => void;
};

function getEditableFields(spec: CarSpec): CarSpecEditableFields {
  return {
    lastEngineOilChangedOn: spec.lastEngineOilChangedOn,
    lastCoolantRefillOn: spec.lastCoolantRefillOn,
    puccExpireDate: spec.puccExpireDate,
    insuranceFirstPartyExpiry: spec.insuranceFirstPartyExpiry,
    insuranceThirdPartyExpiry: spec.insuranceThirdPartyExpiry,
  };
}

export function CarInfoBottomSheet({ visible, carSpec, onClose, onSaveEdits }: CarInfoBottomSheetProps) {
  const { colors } = useAppTheme();
  const [rendered, setRendered] = useState(visible);
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<CarSpecEditableFields>(getEditableFields(carSpec));
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
      setIsEditing(false);
    });
  }, [overlayOpacity, translateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setEditFields(getEditableFields(carSpec));
  }, [carSpec, visible]);

  const fields = useMemo<CarInfoField[]>(
    () => [
      { label: 'Registration Number', value: carSpec.registrationNumber },
      { label: 'Registration Year', value: carSpec.registrationYear },
      { label: 'Manufacturing Year', value: carSpec.manufacturingYear },
      { label: 'Initial Odometer', value: `${carSpec.initialOdometer} km` },
      { label: 'Fuel Type', value: carSpec.fuelType },
      { label: 'Model', value: carSpec.model },
      { label: 'Variant', value: carSpec.variant },
      { label: 'Last Engine Oil Changed', value: carSpec.lastEngineOilChangedOn },
      { label: 'Last Coolant Refill', value: carSpec.lastCoolantRefillOn },
      { label: 'PUCC Expire Date', value: carSpec.puccExpireDate },
      { label: 'Insurance First Party', value: carSpec.insuranceFirstPartyExpiry },
      { label: 'Insurance Third Party', value: carSpec.insuranceThirdPartyExpiry },
    ],
    [carSpec],
  );

  const rows = useMemo(() => {
    const pairRows: CarInfoField[][] = [];

    for (let index = 0; index < fields.length; index += 2) {
      pairRows.push(fields.slice(index, index + 2));
    }

    return pairRows;
  }, [fields]);

  const saveEdits = () => {
    onSaveEdits(editFields);
    setIsEditing(false);
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
            <View style={styles.headerActions}>
              {!isEditing ? (
                <Pressable onPress={() => setIsEditing(true)}>
                  <Text style={[styles.editText, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>EDIT</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    setIsEditing(false);
                    setEditFields(getEditableFields(carSpec));
                  }}>
                  <Text style={[styles.editText, { color: colors.textPrimary, textDecorationColor: colors.textPrimary }]}>CANCEL</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.iconBtn}>
                <MaterialIcons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
            <View style={[styles.table, { borderColor: colors.border }]}> 
              {rows.map((row, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={[
                    styles.tableRow,
                    rowIndex < rows.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: 1 } : null,
                  ]}>
                  {row.map((field, cellIndex) => (
                    <View
                      key={`${field.label}-${cellIndex}`}
                      style={[
                        styles.cell,
                        cellIndex === 0 && row.length === 2
                          ? { borderRightColor: colors.border, borderRightWidth: 1 }
                          : null,
                      ]}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
                      <Text style={[styles.value, { color: colors.textPrimary }]}>{field.value}</Text>
                    </View>
                  ))}
                  {row.length === 1 ? <View style={styles.cell} /> : null}
                </View>
              ))}
            </View>

            {isEditing ? (
              <View style={[styles.editPanel, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                <Text style={[styles.editHeader, { color: colors.textPrimary }]}>Update Maintenance & Expiry Dates</Text>

                <AppTextField
                  label="Last Engine Oil Changed"
                  value={editFields.lastEngineOilChangedOn}
                  onChangeText={(value) => setEditFields((prev) => ({ ...prev, lastEngineOilChangedOn: value }))}
                  placeholder="DD MMM YYYY"
                />

                <AppTextField
                  label="Last Coolant Refill"
                  value={editFields.lastCoolantRefillOn}
                  onChangeText={(value) => setEditFields((prev) => ({ ...prev, lastCoolantRefillOn: value }))}
                  placeholder="DD MMM YYYY"
                />

                <AppTextField
                  label="PUCC Expire Date"
                  value={editFields.puccExpireDate}
                  onChangeText={(value) => setEditFields((prev) => ({ ...prev, puccExpireDate: value }))}
                  placeholder="DD MMM YYYY"
                />

                <AppTextField
                  label="Insurance First Party Expiry"
                  value={editFields.insuranceFirstPartyExpiry}
                  onChangeText={(value) => setEditFields((prev) => ({ ...prev, insuranceFirstPartyExpiry: value }))}
                  placeholder="DD MMM YYYY"
                />

                <AppTextField
                  label="Insurance Third Party Expiry"
                  value={editFields.insuranceThirdPartyExpiry}
                  onChangeText={(value) => setEditFields((prev) => ({ ...prev, insuranceThirdPartyExpiry: value }))}
                  placeholder="DD MMM YYYY"
                />

                <PrimaryButton label="SAVE UPDATES" onPress={saveEdits} />
              </View>
            ) : null}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  editText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
  },
  iconBtn: {
    padding: 2,
  },
  contentWrap: {
    gap: 12,
    paddingBottom: 10,
  },
  table: {
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  editPanel: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 2,
    gap: 10,
  },
  editHeader: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
