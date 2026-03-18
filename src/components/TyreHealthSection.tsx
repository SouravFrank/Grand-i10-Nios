import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs } from '@/utils/day';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// ─── Constants ──────────────────────────────────────────────────────────────────
const TYRE_SIZE = '175/60R15';
// Industry standard: new tread depth for passenger tyres is ~8mm, legal minimum is ~1.6mm
const NEW_TREAD_DEPTH_MM = 8.0;
const MIN_SAFE_TREAD_MM = 1.6;
const USABLE_TREAD_MM = NEW_TREAD_DEPTH_MM - MIN_SAFE_TREAD_MM; // 6.4mm

// Average tyre life for this car class ~50,000 km on good roads
const AVERAGE_TOTAL_TYRE_LIFE_KM = 50000;

// ─── Types ──────────────────────────────────────────────────────────────────────
type TyrePosition = 'pf' | 'df' | 'pb' | 'db' | 's';

type TyreRecord = {
  id: TyrePosition;
  location: string;
  /** Tread depth at the time of the last inspection (mm) */
  treadDepthAtInspection: number;
  /** Odometer reading at time of inspection */
  inspectionOdometer: number;
  /** Date of inspection */
  inspectionDate: string;
  /** If true, this is a brand new tyre (100% health from installation) */
  isNew: boolean;
  /** If replaced, tracks which position it was swapped from (e.g. stepney) */
  replacedFrom?: TyrePosition;
};

const POSITION_LABELS: Record<TyrePosition, string> = {
  pf: 'Passenger Front',
  df: 'Driver Front',
  pb: 'Passenger Back',
  db: 'Driver Back',
  s: 'Stepney (Spare)',
};

const POSITION_SHORT: Record<TyrePosition, string> = {
  pf: 'PF',
  df: 'DF',
  pb: 'PB',
  db: 'DB',
  s: 'SP',
};

// ─── Initial inspection data (baseline) ─────────────────────────────────────
const INITIAL_INSPECTION_DATE = '2026-02-21';
const INITIAL_INSPECTION_ODOMETER = 29703;

const DEFAULT_TYRE_DATA: TyreRecord[] = [
  { id: 'pf', location: 'Passenger Front', treadDepthAtInspection: 6.1, inspectionOdometer: INITIAL_INSPECTION_ODOMETER, inspectionDate: INITIAL_INSPECTION_DATE, isNew: false },
  { id: 'db', location: 'Driver Back', treadDepthAtInspection: 6.0, inspectionOdometer: INITIAL_INSPECTION_ODOMETER, inspectionDate: INITIAL_INSPECTION_DATE, isNew: false },
  { id: 's', location: 'Stepney (Spare)', treadDepthAtInspection: 5.2, inspectionOdometer: INITIAL_INSPECTION_ODOMETER, inspectionDate: INITIAL_INSPECTION_DATE, isNew: false },
  { id: 'df', location: 'Driver Front', treadDepthAtInspection: 4.8, inspectionOdometer: INITIAL_INSPECTION_ODOMETER, inspectionDate: INITIAL_INSPECTION_DATE, isNew: false },
  { id: 'pb', location: 'Passenger Back', treadDepthAtInspection: 4.7, inspectionOdometer: INITIAL_INSPECTION_ODOMETER, inspectionDate: INITIAL_INSPECTION_DATE, isNew: false },
];

// ─── Industry standard calculations ─────────────────────────────────────────

/**
 * Calculate initial health % from tread depth at inspection.
 * Uses the industry-standard usable tread range (8.0mm new → 1.6mm legal min).
 */
function calcHealthFromTread(treadMm: number): number {
  if (treadMm >= NEW_TREAD_DEPTH_MM) return 100;
  if (treadMm <= MIN_SAFE_TREAD_MM) return 0;
  return Math.round(((treadMm - MIN_SAFE_TREAD_MM) / USABLE_TREAD_MM) * 100);
}

/**
 * Estimate total remaining km from health %.
 * Uses linear wear model: remaining_km = (health% / 100) * AVERAGE_TOTAL_TYRE_LIFE_KM
 */
function calcRemainingKmFromHealth(healthPercent: number): number {
  return Math.round((healthPercent / 100) * AVERAGE_TOTAL_TYRE_LIFE_KM);
}

/**
 * Calculate current health based on km driven since last inspection.
 * Uses the km/mm wear rate derived from the tread depth.
 *
 * Industry formula:
 *   wearRateKmPerMm = AVERAGE_TOTAL_TYRE_LIFE_KM / USABLE_TREAD_MM
 *   treadWornMm = kmDriven / wearRateKmPerMm
 *   currentTread = inspectionTread - treadWornMm
 *   currentHealth = ((currentTread - MIN_SAFE_TREAD) / USABLE_TREAD) * 100
 */
function calcCurrentHealth(tyre: TyreRecord, currentOdometer: number): { healthPercent: number; estimatedRemainingKm: number; currentTreadMm: number } {
  if (tyre.isNew) {
    // For new tyres, start from 100% and degrade based on km driven
    const kmDriven = Math.max(0, currentOdometer - tyre.inspectionOdometer);
    const wearRateKmPerMm = AVERAGE_TOTAL_TYRE_LIFE_KM / USABLE_TREAD_MM;
    const treadWorn = kmDriven / wearRateKmPerMm;
    const currentTread = Math.max(MIN_SAFE_TREAD_MM, NEW_TREAD_DEPTH_MM - treadWorn);
    const healthPercent = calcHealthFromTread(currentTread);
    return { healthPercent, estimatedRemainingKm: calcRemainingKmFromHealth(healthPercent), currentTreadMm: Math.round(currentTread * 10) / 10 };
  }

  const kmDriven = Math.max(0, currentOdometer - tyre.inspectionOdometer);
  const wearRateKmPerMm = AVERAGE_TOTAL_TYRE_LIFE_KM / USABLE_TREAD_MM;
  const treadWorn = kmDriven / wearRateKmPerMm;
  const currentTread = Math.max(MIN_SAFE_TREAD_MM, tyre.treadDepthAtInspection - treadWorn);
  const healthPercent = calcHealthFromTread(currentTread);
  return { healthPercent, estimatedRemainingKm: calcRemainingKmFromHealth(healthPercent), currentTreadMm: Math.round(currentTread * 10) / 10 };
}

function getHealthColor(percent: number): { color: string; bg: string; label: string } {
  if (percent >= 55) return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Healthy' };
  if (percent >= 25) return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', label: 'Moderate' };
  if (percent > 0) return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Replace' };
  return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', label: 'Expired' };
}

// ─── Edit Action Types ──────────────────────────────────────────────────────
type EditActionType = 'change' | 'swap_stepney' | 'inspect';

const EDIT_ACTIONS: { key: EditActionType; label: string; icon: string; description: string }[] = [
  { key: 'change', label: 'New Tyre', icon: 'autorenew', description: 'Install a brand new tyre' },
  { key: 'swap_stepney', label: 'Swap Stepney', icon: 'swap-horiz', description: 'Put stepney here' },
  { key: 'inspect', label: 'Re-inspect', icon: 'search', description: 'Update tread depth reading' },
];

// ─── Component ──────────────────────────────────────────────────────────────
type Props = {
  currentOdometer: number;
};

export function TyreHealthSection({ currentOdometer }: Props) {
  const { colors, isDark } = useAppTheme();
  const [tyreData, setTyreData] = useState<TyreRecord[]>(DEFAULT_TYRE_DATA);

  // Edit state
  const [editingTyre, setEditingTyre] = useState<TyrePosition | null>(null);
  const [editAction, setEditAction] = useState<EditActionType | null>(null);
  const [draftOdometer, setDraftOdometer] = useState('');
  const [draftTreadDepth, setDraftTreadDepth] = useState('');

  const beginEdit = useCallback((tyreId: TyrePosition) => {
    if (editingTyre === tyreId) {
      cancelEdit();
      return;
    }
    setEditingTyre(tyreId);
    setEditAction(null);
    setDraftOdometer(String(currentOdometer));
    setDraftTreadDepth('');
  }, [editingTyre, currentOdometer]);

  const cancelEdit = useCallback(() => {
    setEditingTyre(null);
    setEditAction(null);
    setDraftOdometer('');
    setDraftTreadDepth('');
  }, []);

  const filteredEditActions = useMemo(() => {
    if (!editingTyre) return EDIT_ACTIONS;
    const tyre = tyreData.find((t) => t.id === editingTyre);
    if (!tyre) return EDIT_ACTIONS;

    // You can't swap stepney with stepney itself
    if (editingTyre === 's') {
      return EDIT_ACTIONS.filter((a) => a.key !== 'swap_stepney');
    }
    return EDIT_ACTIONS;
  }, [editingTyre, tyreData]);

  const saveEdit = useCallback(() => {
    if (!editingTyre || !editAction) return;

    const parsedOdometer = Number(draftOdometer);
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) {
      Alert.alert('Invalid odometer', 'Enter a valid odometer reading.');
      return;
    }
    if (parsedOdometer < currentOdometer) {
      Alert.alert('Invalid odometer', `Odometer must be >= ${currentOdometer} km.`);
      return;
    }

    const now = dayjs().format('YYYY-MM-DD');

    if (editAction === 'change') {
      // Installing a brand new tyre
      setTyreData((prev) =>
        prev.map((t) =>
          t.id === editingTyre
            ? {
              ...t,
              treadDepthAtInspection: NEW_TREAD_DEPTH_MM,
              inspectionOdometer: parsedOdometer,
              inspectionDate: now,
              isNew: true,
              replacedFrom: undefined,
            }
            : t
        )
      );
    } else if (editAction === 'swap_stepney') {
      // Swap stepney into this position
      const stepney = tyreData.find((t) => t.id === 's');
      const target = tyreData.find((t) => t.id === editingTyre);
      if (!stepney || !target) return;

      setTyreData((prev) =>
        prev.map((t) => {
          if (t.id === editingTyre) {
            // This position now gets the stepney tyre data
            return {
              ...t,
              treadDepthAtInspection: stepney.treadDepthAtInspection,
              inspectionOdometer: parsedOdometer,
              inspectionDate: now,
              isNew: stepney.isNew,
              replacedFrom: 's',
            };
          }
          if (t.id === 's') {
            // Stepney position gets the old tyre from target
            return {
              ...t,
              treadDepthAtInspection: target.treadDepthAtInspection,
              inspectionOdometer: parsedOdometer,
              inspectionDate: now,
              isNew: target.isNew,
              replacedFrom: editingTyre,
            };
          }
          return t;
        })
      );
    } else if (editAction === 'inspect') {
      // Re-inspection with new tread depth
      const parsedTread = Number(draftTreadDepth);
      if (!Number.isFinite(parsedTread) || parsedTread < MIN_SAFE_TREAD_MM || parsedTread > NEW_TREAD_DEPTH_MM) {
        Alert.alert('Invalid tread depth', `Tread depth must be between ${MIN_SAFE_TREAD_MM} and ${NEW_TREAD_DEPTH_MM} mm.`);
        return;
      }
      setTyreData((prev) =>
        prev.map((t) =>
          t.id === editingTyre
            ? {
              ...t,
              treadDepthAtInspection: parsedTread,
              inspectionOdometer: parsedOdometer,
              inspectionDate: now,
              isNew: false,
              replacedFrom: undefined,
            }
            : t
        )
      );
    }

    cancelEdit();
  }, [editingTyre, editAction, draftOdometer, draftTreadDepth, currentOdometer, tyreData, cancelEdit]);

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialCommunityIcons name="tire" size={20} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Tyre Life Analysis</Text>
              <View style={[styles.sizeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.sizeBadgeLabel, { color: colors.textSecondary }]}>SIZE</Text>
                <Text style={[styles.sizeBadgeText, { color: colors.textPrimary }]}>{TYRE_SIZE}</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Live health based on odometer • Tap edit to update
            </Text>
          </View>
        </View>
      </View>

      {/* ── Column Headers ──────────────────────────────────────────────── */}
      <View style={[styles.colHeaderRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHeader, styles.colH1, { color: colors.textSecondary }]}>TYRE</Text>
        <Text style={[styles.colHeader, styles.colH2, { color: colors.textSecondary }]}>INITIAL</Text>
        <Text style={[styles.colHeader, styles.colH3, { color: colors.textSecondary }]}>CURRENT</Text>
        <View style={styles.colH4} />
      </View>

      {/* ── Tyre Rows ──────────────────────────────────────────────────── */}
      <View style={styles.list}>
        {tyreData.map((tyre, index) => {
          const isEditing = editingTyre === tyre.id;
          const initialHealth = tyre.isNew ? 100 : calcHealthFromTread(tyre.treadDepthAtInspection);
          const initialRemainingKm = calcRemainingKmFromHealth(initialHealth);
          const current = calcCurrentHealth(tyre, currentOdometer);
          const currentColor = getHealthColor(current.healthPercent);
          const initialColor = getHealthColor(initialHealth);

          return (
            <View key={tyre.id}>
              <View
                style={[
                  styles.row,
                  index < tyreData.length - 1 && !isEditing && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  isEditing && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                ]}
              >
                {/* ── Col 1: Tyre Info ─────── */}
                <View style={styles.col1}>
                  <View style={styles.tyreNameRow}>
                    <View style={[styles.positionBadge, { backgroundColor: currentColor.bg }]}>
                      <Text style={[styles.positionBadgeText, { color: currentColor.color }]}>{POSITION_SHORT[tyre.id]}</Text>
                    </View>
                    <View style={styles.tyreNameWrap}>
                      <Text style={[styles.locName, { color: colors.textPrimary }]} numberOfLines={1}>{tyre.location}</Text>
                      <Text style={[styles.treadLabel, { color: colors.textSecondary }]}>
                        {current.currentTreadMm} mm{tyre.isNew ? ' • New' : ''}{tyre.replacedFrom ? ` • from ${POSITION_SHORT[tyre.replacedFrom]}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Col 2: Initial Health ─────── */}
                <View style={styles.col2}>
                  <Text style={[styles.healthValue, { color: initialColor.color }]}>{initialHealth}%</Text>
                  <Text style={[styles.kmValue, { color: initialColor.color, opacity: 0.7 }]}>
                    {formatKm(initialRemainingKm)}
                  </Text>
                </View>

                {/* ── Col 3: Current Health ─────── */}
                <View style={styles.col3}>
                  <Text style={[styles.healthValue, { color: currentColor.color, fontWeight: '900' }]}>{current.healthPercent}%</Text>
                  <Text style={[styles.kmValue, { color: currentColor.color }]}>
                    {formatKm(current.estimatedRemainingKm)}
                  </Text>
                </View>

                {/* ── Col 4: Edit Button ─────── */}
                <View style={styles.col4}>
                  <Pressable
                    onPress={() => beginEdit(tyre.id)}
                    style={[
                      styles.editBtn,
                      {
                        borderColor: isEditing ? colors.textPrimary : colors.border,
                        backgroundColor: isEditing ? colors.textPrimary : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={isEditing ? 'expand-less' : 'edit'}
                      size={16}
                      color={isEditing ? colors.invertedText : colors.textPrimary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* ── Inline Edit Panel ──────────────────────────────────── */}
              {isEditing ? (
                <View style={[styles.editPanel, { borderBottomWidth: index < tyreData.length - 1 ? 1 : 0, borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }]}>
                  <View style={[styles.editCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {/* Action Selector */}
                    <Text style={[styles.editSectionTitle, { color: colors.textSecondary }]}>WHAT DID YOU DO?</Text>
                    <View style={styles.actionRow}>
                      {filteredEditActions.map((action) => {
                        const isActive = editAction === action.key;
                        return (
                          <Pressable
                            key={action.key}
                            onPress={() => setEditAction(action.key)}
                            style={[
                              styles.actionChip,
                              {
                                borderColor: isActive ? colors.textPrimary : colors.border,
                                backgroundColor: isActive ? colors.textPrimary : colors.backgroundSecondary,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={action.icon as keyof typeof MaterialIcons.glyphMap}
                              size={16}
                              color={isActive ? colors.invertedText : colors.textPrimary}
                            />
                            <Text
                              style={[
                                styles.actionChipText,
                                { color: isActive ? colors.invertedText : colors.textPrimary },
                              ]}
                            >
                              {action.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {editAction ? (
                      <>
                        {/* Action-specific hint */}
                        <View style={[styles.hintBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                          <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                            {editAction === 'change'
                              ? 'New tyre installed → health resets to 100%'
                              : editAction === 'swap_stepney'
                                ? `Stepney swaps with ${tyre.location}. Both positions updated.`
                                : 'Enter the new tread depth from a manual inspection.'}
                          </Text>
                        </View>

                        {/* Tread depth input for inspect action */}
                        {editAction === 'inspect' ? (
                          <View style={styles.treadInputWrap}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tread Depth (mm)</Text>
                            <View style={[styles.treadInput, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                              <Text style={[styles.treadInputPrefix, { color: colors.textSecondary }]}>mm</Text>
                              <View style={styles.treadInputField}>
                                {/* Simple inline number input */}
                                <Pressable
                                  style={[styles.treadStepBtn, { borderColor: colors.border }]}
                                  onPress={() => {
                                    const val = Number(draftTreadDepth) || MIN_SAFE_TREAD_MM;
                                    setDraftTreadDepth(String(Math.max(MIN_SAFE_TREAD_MM, Math.round((val - 0.1) * 10) / 10)));
                                  }}
                                >
                                  <MaterialIcons name="remove" size={16} color={colors.textPrimary} />
                                </Pressable>
                                <Text style={[styles.treadValueText, { color: colors.textPrimary }]}>
                                  {draftTreadDepth || '—'}
                                </Text>
                                <Pressable
                                  style={[styles.treadStepBtn, { borderColor: colors.border }]}
                                  onPress={() => {
                                    const val = Number(draftTreadDepth) || MIN_SAFE_TREAD_MM;
                                    setDraftTreadDepth(String(Math.min(NEW_TREAD_DEPTH_MM, Math.round((val + 0.1) * 10) / 10)));
                                  }}
                                >
                                  <MaterialIcons name="add" size={16} color={colors.textPrimary} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        ) : null}

                        {/* Odometer input — always required */}
                        <View style={{ marginTop: 4 }}>
                          <OdometerDigitInput
                            label="Odometer at Change (km)"
                            value={draftOdometer}
                            onChangeText={setDraftOdometer}
                            error={draftOdometer && Number(draftOdometer) < currentOdometer ? `Must be >= ${currentOdometer}` : undefined}
                          />
                        </View>

                        {/* Save / Cancel */}
                        <View style={styles.editorActions}>
                          <Pressable
                            onPress={cancelEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                            <Text style={[styles.coolActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
                          </Pressable>

                          <Pressable
                            onPress={saveEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary, opacity: pressed ? 0.8 : 1 },
                            ]}
                          >
                            <MaterialIcons name="check" size={18} color={colors.invertedText} />
                            <Text style={[styles.coolActionBtnText, { color: colors.invertedText }]}>SAVE</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {[
          { label: 'Healthy', color: '#10B981' },
          { label: 'Moderate', color: '#F59E0B' },
          { label: 'Replace', color: '#EF4444' },
          { label: 'Expired', color: '#6B7280' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatKm(km: number): string {
  if (km >= 1000) return `~${(km / 1000).toFixed(1)}k km`;
  return `~${km} km`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 18,
  },
  header: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  sizeBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // ── Column Headers ──
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  colH1: { flex: 3.5 },
  colH2: { flex: 2, textAlign: 'center' },
  colH3: { flex: 2, textAlign: 'center' },
  colH4: { width: 32 },
  // ── Row ──
  list: {
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  col1: {
    flex: 3.5,
    justifyContent: 'center',
  },
  tyreNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  tyreNameWrap: {
    flex: 1,
  },
  locName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  treadLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  col2: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  col3: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  kmValue: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  col4: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Edit Panel ──
  editPanel: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  editCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  editSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  treadInputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  treadInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  treadInputPrefix: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  treadInputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  treadStepBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treadValueText: {
    fontSize: 22,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'center',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  coolActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  coolActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  // ── Legend ──
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
