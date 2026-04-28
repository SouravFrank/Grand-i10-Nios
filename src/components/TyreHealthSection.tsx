import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { TyrePosition, TyreRecord } from '@/types/models';
import { dayjs } from '@/utils/day';
import {
    AVERAGE_TOTAL_TYRE_LIFE_KM,
    MIN_SAFE_TREAD_MM,
    NEW_TREAD_DEPTH_MM,
    POSITION_LABELS,
    POSITION_ORDER,
    POSITION_SHORT,
    TYRE_SIZE,
    applyTyreInspectionUpdate,
    applyTyrePositionUpdate,
    buildTyrePositionAssignments,
    calcCurrentHealth,
    calcHealthFromTread,
    calcRemainingKmFromHealth,
    getTyreDisplayName,
    isActiveTyrePosition,
    normalizeTyreSetup,
    sortTyresByCurrentPosition,
} from '@/utils/tyreHealth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type EditActionType = 'change' | 'swap_stepney' | 'inspect';

const EDIT_ACTIONS: { key: EditActionType; label: string; icon: string; description: string }[] = [
  { key: 'change', label: 'New Tyre', icon: 'autorenew', description: 'Install a brand new tyre' },
  { key: 'swap_stepney', label: 'Swap Stepney', icon: 'swap-horiz', description: 'Put stepney here' },
  { key: 'inspect', label: 'Re-inspect', icon: 'search', description: 'Update tread depth reading' },
];

type Props = {
  currentOdometer: number;
};

function getHealthColor(percent: number): { color: string; bg: string; label: string } {
  if (percent >= 55) return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Healthy' };
  if (percent >= 25) return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', label: 'Moderate' };
  if (percent > 0) return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Replace' };
  return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', label: 'Expired' };
}

function formatKm(km: number): string {
  if (km >= 1000) return `~${(km / 1000).toFixed(1)}k km`;
  return `~${km} km`;
}

function areAssignmentsEqual(
  left: Record<TyrePosition, TyrePosition>,
  right: Record<TyrePosition, TyrePosition>,
) {
  return POSITION_ORDER.every((position) => left[position] === right[position]);
}

export function TyreHealthSection({ currentOdometer }: Props) {
  const { colors, isDark } = useAppTheme();
  const tyreSetup = useAppStore((state) => state.carSpec.tyreSetup);
  const updateTyreSetup = useAppStore((state) => state.updateTyreSetup);

  const tyres = useMemo(
    () => sortTyresByCurrentPosition(normalizeTyreSetup(tyreSetup)),
    [tyreSetup],
  );
  const currentAssignments = useMemo(
    () => buildTyrePositionAssignments(tyres),
    [tyres],
  );

  const [editingTyre, setEditingTyre] = useState<TyrePosition | null>(null);
  const [editAction, setEditAction] = useState<EditActionType | null>(null);
  const [draftOdometer, setDraftOdometer] = useState('');
  const [draftTreadDepth, setDraftTreadDepth] = useState('');
  const [isPositionEditorOpen, setIsPositionEditorOpen] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<Record<TyrePosition, TyrePosition>>(
    currentAssignments,
  );
  const [draftPositionOdometer, setDraftPositionOdometer] = useState(String(currentOdometer));

  const editingTyreRecord = useMemo(
    () => tyres.find((tyre) => tyre.id === editingTyre) ?? null,
    [editingTyre, tyres],
  );
  const editingTyrePosition = editingTyreRecord?.currentPosition ?? 's';

  useEffect(() => {
    if (!isPositionEditorOpen) {
      setDraftAssignments(currentAssignments);
      setDraftPositionOdometer(String(currentOdometer));
    }
  }, [currentAssignments, currentOdometer, isPositionEditorOpen]);

  const beginEdit = useCallback(
    (tyreId: TyrePosition) => {
      if (editingTyre === tyreId) {
        setEditingTyre(null);
        setEditAction(null);
        setDraftOdometer('');
        setDraftTreadDepth('');
        return;
      }

      setIsPositionEditorOpen(false);
      setEditingTyre(tyreId);
      setEditAction(null);
      setDraftOdometer(String(currentOdometer));
      setDraftTreadDepth('');
    },
    [currentOdometer, editingTyre],
  );

  const cancelEdit = useCallback(() => {
    setEditingTyre(null);
    setEditAction(null);
    setDraftOdometer('');
    setDraftTreadDepth('');
  }, []);

  const filteredEditActions = useMemo(() => {
    if (!editingTyreRecord) return EDIT_ACTIONS;

    if (editingTyreRecord.currentPosition === 's') {
      return EDIT_ACTIONS.filter((action) => action.key !== 'swap_stepney');
    }

    return EDIT_ACTIONS;
  }, [editingTyreRecord]);

  const persistTyreSetup = useCallback(
    (nextTyreSetup: TyreRecord[]) => {
      updateTyreSetup(nextTyreSetup);
      void runSyncCycle();
    },
    [updateTyreSetup],
  );

  const saveEdit = useCallback(() => {
    if (!editingTyreRecord || !editAction) return;

    const parsedOdometer = Number(draftOdometer);
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) {
      Alert.alert('Invalid odometer', 'Enter a valid odometer reading.');
      return;
    }

    const eventDate = dayjs().format('YYYY-MM-DD');

    if (editAction === 'change') {
      persistTyreSetup(
        applyTyreInspectionUpdate(tyres, editingTyreRecord.id, {
          odometer: parsedOdometer,
          inspectionDate: eventDate,
          treadDepthAtInspection: NEW_TREAD_DEPTH_MM,
          isNew: true,
        }),
      );
      cancelEdit();
      return;
    }

    if (editAction === 'swap_stepney') {
      if (editingTyreRecord.currentPosition === 's') {
        return;
      }

      const nextAssignments = {
        ...currentAssignments,
        [editingTyreRecord.currentPosition]: currentAssignments.s,
        s: currentAssignments[editingTyreRecord.currentPosition],
      };

      persistTyreSetup(
        applyTyrePositionUpdate(tyres, nextAssignments, parsedOdometer),
      );
      cancelEdit();
      return;
    }

    const parsedTread = Number(draftTreadDepth);
    if (
      !Number.isFinite(parsedTread) ||
      parsedTread < MIN_SAFE_TREAD_MM ||
      parsedTread > NEW_TREAD_DEPTH_MM
    ) {
      Alert.alert(
        'Invalid tread depth',
        `Tread depth must be between ${MIN_SAFE_TREAD_MM} and ${NEW_TREAD_DEPTH_MM} mm.`,
      );
      return;
    }

    persistTyreSetup(
      applyTyreInspectionUpdate(tyres, editingTyreRecord.id, {
        odometer: parsedOdometer,
        inspectionDate: eventDate,
        treadDepthAtInspection: parsedTread,
        isNew: false,
      }),
    );
    cancelEdit();
  }, [
    cancelEdit,
    currentAssignments,
    currentOdometer,
    draftOdometer,
    draftTreadDepth,
    editAction,
    editingTyreRecord,
    persistTyreSetup,
    tyres,
  ]);

  const openPositionEditor = () => {
    cancelEdit();
    setDraftAssignments(currentAssignments);
    setDraftPositionOdometer(String(currentOdometer));
    setIsPositionEditorOpen(true);
  };

  const cancelPositionEditor = () => {
    setDraftAssignments(currentAssignments);
    setDraftPositionOdometer(String(currentOdometer));
    setIsPositionEditorOpen(false);
  };

  const assignTyreToPosition = (position: TyrePosition, tyreId: TyrePosition) => {
    setDraftAssignments((previous) => {
      if (previous[position] === tyreId) {
        return previous;
      }

      const swappedPosition = POSITION_ORDER.find(
        (candidate) => previous[candidate] === tyreId,
      );

      if (!swappedPosition) {
        return previous;
      }

      return {
        ...previous,
        [swappedPosition]: previous[position],
        [position]: tyreId,
      };
    });
  };

  const savePositionEditor = () => {
    const parsedOdometer = Number(draftPositionOdometer);
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) {
      Alert.alert('Invalid odometer', 'Enter a valid odometer reading.');
      return;
    }

    if (areAssignmentsEqual(currentAssignments, draftAssignments)) {
      cancelPositionEditor();
      return;
    }

    persistTyreSetup(
      applyTyrePositionUpdate(tyres, draftAssignments, parsedOdometer),
    );
    setIsPositionEditorOpen(false);
  };

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialCommunityIcons name="tire" size={20} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerMetaRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Tyre Life Analysis</Text>
              <View style={[styles.sizeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.sizeBadgeLabel, { color: colors.textSecondary }]}>SIZE</Text>
                <Text style={[styles.sizeBadgeText, { color: colors.textPrimary }]}>{TYRE_SIZE}</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Health follows the physical tyre. Spare wear stays paused until mounted.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.positionManager, { borderBottomColor: colors.border }]}>
        <View style={styles.positionManagerHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.managerTitle, { color: colors.textPrimary }]}>Active Tyre Setup</Text>
            <Text style={[styles.managerSubtitle, { color: colors.textSecondary }]}>
              Choose which four tyres are active and which tyre is currently spare.
            </Text>
          </View>
          <Pressable
            onPress={openPositionEditor}
            style={[styles.manageButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          >
            <MaterialIcons name="tune" size={16} color={colors.textPrimary} />
            <Text style={[styles.manageButtonText, { color: colors.textPrimary }]}>Manage</Text>
          </Pressable>
        </View>

        <View style={styles.positionSummaryGrid}>
          {POSITION_ORDER.map((position) => (
            <View
              key={position}
              style={[styles.positionSummaryChip, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            >
              <Text style={[styles.positionSummaryLabel, { color: colors.textSecondary }]}>
                {position === 's' ? 'SPARE' : POSITION_SHORT[position]}
              </Text>
              <Text style={[styles.positionSummaryValue, { color: colors.textPrimary }]}>
                {getTyreDisplayName(currentAssignments[position])}
              </Text>
            </View>
          ))}
        </View>

        {isPositionEditorOpen ? (
          <View style={[styles.positionEditor, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }]}>
            <View style={[styles.hintBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Set the current mounted tyre for each position. If you choose a tyre that is already assigned elsewhere, the UI auto-swaps it so every tyre stays unique.
              </Text>
            </View>

            {POSITION_ORDER.map((position) => (
              <View
                key={position}
                style={[styles.positionCard, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={styles.positionCardHead}>
                  <View>
                    <Text style={[styles.positionCardTitle, { color: colors.textPrimary }]}>
                      {POSITION_LABELS[position]}
                    </Text>
                    <Text style={[styles.positionCardSubtitle, { color: colors.textSecondary }]}>
                      {position === 's' ? 'Safety / standby tyre' : 'Currently active on-road'}
                    </Text>
                  </View>
                  <View style={[styles.positionBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.positionBadgeText, { color: colors.textPrimary }]}>
                      {draftAssignments[position]}
                    </Text>
                  </View>
                </View>

                <View style={styles.assignmentChipRow}>
                  {POSITION_ORDER.map((tyreId) => {
                    const active = draftAssignments[position] === tyreId;

                    return (
                      <Pressable
                        key={`${position}-${tyreId}`}
                        onPress={() => assignTyreToPosition(position, tyreId)}
                        style={[
                          styles.assignmentChip,
                          {
                            borderColor: active ? colors.textPrimary : colors.border,
                            backgroundColor: active ? colors.textPrimary : colors.backgroundSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.assignmentChipText,
                            { color: active ? colors.invertedText : colors.textPrimary },
                          ]}
                        >
                          {getTyreDisplayName(tyreId)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <OdometerDigitInput
              label="Odometer at Position Update (km)"
              value={draftPositionOdometer}
              onChangeText={setDraftPositionOdometer}
            />

            <View style={styles.editorActions}>
              <Pressable
                onPress={cancelPositionEditor}
                style={({ pressed }) => [
                  styles.coolActionBtn,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                <Text style={[styles.coolActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
              </Pressable>

              <Pressable
                onPress={savePositionEditor}
                style={({ pressed }) => [
                  styles.coolActionBtn,
                  {
                    backgroundColor: colors.textPrimary,
                    borderColor: colors.textPrimary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <MaterialIcons name="check" size={18} color={colors.invertedText} />
                <Text style={[styles.coolActionBtnText, { color: colors.invertedText }]}>SAVE SETUP</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.colHeaderRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHeader, styles.colH1, { color: colors.textSecondary }]}>POSITION</Text>
        <Text style={[styles.colHeader, styles.colH2, { color: colors.textSecondary }]}>INITIAL</Text>
        <Text style={[styles.colHeader, styles.colH3, { color: colors.textSecondary }]}>CURRENT</Text>
        <View style={styles.colH4} />
      </View>

      <View style={styles.list}>
        {tyres.map((tyre, index) => {
          const isEditing = editingTyre === tyre.id;
          const initialHealth = tyre.isNew ? 100 : calcHealthFromTread(tyre.treadDepthAtInspection);
          const initialRemainingKm = calcRemainingKmFromHealth(initialHealth);
          const current = calcCurrentHealth(tyre, currentOdometer);
          const currentColor = getHealthColor(current.healthPercent);
          const initialColor = getHealthColor(initialHealth);
          const movementText =
            tyre.movedFromPosition && tyre.movedFromPosition !== tyre.currentPosition
              ? ` • moved from ${POSITION_SHORT[tyre.movedFromPosition]}`
              : '';

          return (
            <View key={tyre.id}>
              <View
                style={[
                  styles.row,
                  index < tyres.length - 1 && !isEditing && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  isEditing && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                ]}
              >
                <View style={styles.col1}>
                  <View style={styles.tyreNameRow}>
                    <View style={[styles.positionChip, { backgroundColor: currentColor.bg }]}>
                      <Text style={[styles.positionChipText, { color: currentColor.color }]}>
                        {POSITION_SHORT[tyre.currentPosition]}
                      </Text>
                    </View>
                    <View style={styles.tyreNameWrap}>
                      <Text style={[styles.locName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {POSITION_LABELS[tyre.currentPosition]}
                      </Text>
                      <Text style={[styles.treadLabel, { color: colors.textSecondary }]}>
                        {getTyreDisplayName(tyre.id)} • {current.currentTreadMm} mm • {isActiveTyrePosition(tyre.currentPosition) ? 'Active' : 'Spare'}
                        {tyre.isNew ? ' • New' : ''}
                        {movementText}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.col2}>
                  <Text style={[styles.healthValue, { color: initialColor.color }]}>{initialHealth}%</Text>
                  <Text style={[styles.kmValue, { color: initialColor.color, opacity: 0.7 }]}>
                    {formatKm(initialRemainingKm)}
                  </Text>
                </View>

                <View style={styles.col3}>
                  <Text style={[styles.healthValue, { color: currentColor.color, fontWeight: '900' }]}>
                    {current.healthPercent}%
                  </Text>
                  <Text style={[styles.kmValue, { color: currentColor.color }]}>
                    {formatKm(current.estimatedRemainingKm)}
                  </Text>
                </View>

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

              {isEditing ? (
                <View
                  style={[
                    styles.editPanel,
                    {
                      borderBottomWidth: index < tyres.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    },
                  ]}
                >
                  <View style={[styles.editCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
                        <View style={[styles.hintBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                          <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                            {editAction === 'change'
                              ? `Replace the tyre currently mounted at ${POSITION_LABELS[editingTyrePosition]} with a brand new tyre.`
                              : editAction === 'swap_stepney'
                                ? `The current spare swaps into ${POSITION_LABELS[editingTyrePosition]}. The outgoing tyre becomes the spare.`
                                : 'Capture a fresh tread depth reading and reset the health baseline from this odometer.'}
                          </Text>
                        </View>

                        {editAction === 'inspect' ? (
                          <View style={styles.treadInputWrap}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tread Depth (mm)</Text>
                            <View style={[styles.treadInput, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                              <Text style={[styles.treadInputPrefix, { color: colors.textSecondary }]}>mm</Text>
                              <View style={styles.treadInputField}>
                                <Pressable
                                  style={[styles.treadStepBtn, { borderColor: colors.border }]}
                                  onPress={() => {
                                    const currentValue = Number(draftTreadDepth) || MIN_SAFE_TREAD_MM;
                                    setDraftTreadDepth(
                                      String(
                                        Math.max(
                                          MIN_SAFE_TREAD_MM,
                                          Math.round((currentValue - 0.1) * 10) / 10,
                                        ),
                                      ),
                                    );
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
                                    const currentValue = Number(draftTreadDepth) || MIN_SAFE_TREAD_MM;
                                    setDraftTreadDepth(
                                      String(
                                        Math.min(
                                          NEW_TREAD_DEPTH_MM,
                                          Math.round((currentValue + 0.1) * 10) / 10,
                                        ),
                                      ),
                                    );
                                  }}
                                >
                                  <MaterialIcons name="add" size={16} color={colors.textPrimary} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        ) : null}

                        <OdometerDigitInput
                          label="Odometer at Update (km)"
                          value={draftOdometer}
                          onChangeText={setDraftOdometer}
                        />

                        <View style={styles.editorActions}>
                          <Pressable
                            onPress={cancelEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              {
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                                opacity: pressed ? 0.7 : 1,
                              },
                            ]}
                          >
                            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                            <Text style={[styles.coolActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
                          </Pressable>

                          <Pressable
                            onPress={saveEdit}
                            style={({ pressed }) => [
                              styles.coolActionBtn,
                              {
                                backgroundColor: colors.textPrimary,
                                borderColor: colors.textPrimary,
                                opacity: pressed ? 0.8 : 1,
                              },
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

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {/* {[
          { label: 'Healthy', color: '#10B981' },
          { label: 'Moderate', color: '#F59E0B' },
          { label: 'Replace', color: '#EF4444' },
          { label: 'Expired', color: '#6B7280' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))} */}
        <Text style={[styles.legendNote, { color: colors.textSecondary }]}>
          Life estimate uses an average {AVERAGE_TOTAL_TYRE_LIFE_KM.toLocaleString()} km tyre lifespan.
        </Text>
      </View>
    </View>
  );
}

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
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  positionManager: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  positionManagerHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  managerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  managerSubtitle: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  positionSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionSummaryChip: {
    minWidth: '31%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  positionSummaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  positionSummaryValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  positionEditor: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  positionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  positionCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  positionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  positionCardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  positionBadge: {
    minWidth: 40,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  positionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  assignmentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assignmentChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  assignmentChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
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
  positionChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionChipText: {
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
    fontWeight: '900',
    letterSpacing: 0.4,
    minWidth: 54,
    textAlign: 'center',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  coolActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  coolActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  legend: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendNote: {
    fontSize: 10,
    lineHeight: 15,
  },
});
