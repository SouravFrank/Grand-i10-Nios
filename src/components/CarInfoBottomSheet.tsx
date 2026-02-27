import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/theme/useAppTheme';

export type CarInfoField = {
  label: string;
  value: string;
};

type CarInfoBottomSheetProps = {
  visible: boolean;
  fields: CarInfoField[];
  onClose: () => void;
};

export function CarInfoBottomSheet({ visible, fields, onClose }: CarInfoBottomSheetProps) {
  const { colors } = useAppTheme();
  const [rendered, setRendered] = useState(visible);
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
    });
  }, [overlayOpacity, translateY, visible]);

  const rows = useMemo(() => {
    const pairRows: CarInfoField[][] = [];

    for (let index = 0; index < fields.length; index += 2) {
      pairRows.push(fields.slice(index, index + 2));
    }

    return pairRows;
  }, [fields]);

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
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  title: {
    fontSize: 17,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBtn: {
    padding: 2,
  },
  table: {
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 76,
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
});
