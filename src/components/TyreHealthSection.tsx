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
    getTyreDisplayName,
    normalizeTyreSetup,
    sortTyresByCurrentPosition
} from '@/utils/tyreHealth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppAlert } from '@/components/AppAlert';

type EditActionType = 'change' | 'swap_stepney' | 'inspect';

const EDIT_ACTIONS: { key: EditActionType; label: string; icon: string; description: string }[] = [
  { key: 'change', label: 'New Tyre', icon: 'autorenew', description: 'Install a brand new tyre' },
  { key: 'swap_stepney', label: 'Swap Stepney', icon: 'swap-horiz', description: 'Put stepney here' },
  { key: 'inspect', label: 'Re-inspect', icon: 'search', description: 'Update tread depth reading' },
];

type Props = { currentOdometer: number };

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

function areAssignmentsEqual(left: Record<TyrePosition, TyrePosition>, right: Record<TyrePosition, TyrePosition>) {
  return POSITION_ORDER.every((position) => left[position] === right[position]);
}

export function TyreHealthSection({ currentOdometer }: Props) {
  const { colors, isDark } = useAppTheme();
  
  // Premium surface overlays replacing borders
  const secondarySurfaceColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const deepSurfaceColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';

  const tyreSetup = useAppStore((state) => state.carSpec.tyreSetup);
  const updateTyreSetup = useAppStore((state) => state.updateTyreSetup);
  const addEntryOfflineFirst = useAppStore((state) => state.addEntryOfflineFirst);
  const currentUser = useAppStore((state) => state.currentUser);

  const tyres = useMemo(() => sortTyresByCurrentPosition(normalizeTyreSetup(tyreSetup)), [tyreSetup]);
  const currentAssignments = useMemo(() => buildTyrePositionAssignments(tyres), [tyres]);

  const [editingTyre, setEditingTyre] = useState<TyrePosition | null>(null);
  const [editAction, setEditAction] = useState<EditActionType | null>(null);
  const [draftOdometer, setDraftOdometer] = useState('');
  const [draftTreadDepth, setDraftTreadDepth] = useState('');
  const [isPositionEditorOpen, setIsPositionEditorOpen] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<Record<TyrePosition, TyrePosition>>(currentAssignments);
  const [draftPositionOdometer, setDraftPositionOdometer] = useState(String(currentOdometer));

  const editingTyreRecord = useMemo(() => tyres.find((tyre) => tyre.id === editingTyre) ?? null, [editingTyre, tyres]);
  const editingTyrePosition = editingTyreRecord?.currentPosition ?? 's';

  useEffect(() => {
    if (!isPositionEditorOpen) {
      setDraftAssignments(currentAssignments);
      setDraftPositionOdometer(String(currentOdometer));
    }
  }, [currentAssignments, currentOdometer, isPositionEditorOpen]);

  const beginEdit = useCallback((tyreId: TyrePosition) => {
    if (editingTyre === tyreId) { setEditingTyre(null); setEditAction(null); setDraftOdometer(''); setDraftTreadDepth(''); return; }
    setIsPositionEditorOpen(false); setEditingTyre(tyreId); setEditAction(null); setDraftOdometer(String(currentOdometer)); setDraftTreadDepth('');
  }, [currentOdometer, editingTyre]);

  const cancelEdit = useCallback(() => { setEditingTyre(null); setEditAction(null); setDraftOdometer(''); setDraftTreadDepth(''); }, []);

  const filteredEditActions = useMemo(() => {
    if (!editingTyreRecord) return EDIT_ACTIONS;
    if (editingTyreRecord.currentPosition === 's') return EDIT_ACTIONS.filter((action) => action.key !== 'swap_stepney');
    return EDIT_ACTIONS;
  }, [editingTyreRecord]);

  const persistTyreSetup = useCallback((nextTyreSetup: TyreRecord[]) => { updateTyreSetup(nextTyreSetup); void runSyncCycle(); }, [updateTyreSetup]);

  const addTyreHistoryEntry = useCallback(async (action: 'new_tyre' | 'swap_stepney' | 'inspect', position: TyrePosition, odometer: number, details?: { treadDepth?: number; isNew?: boolean }) => {
    if (!currentUser) return;
    const positionLabel = POSITION_LABELS[position];
    const actionLabels: Record<string, string> = {
      new_tyre: `New tyre installed at ${positionLabel}`,
      swap_stepney: `Stepney swapped to ${positionLabel}`,
      inspect: `Tyre inspected at ${positionLabel}`,
    };
    const specUpdateDetails = [];
    if (details?.treadDepth !== undefined) {
      specUpdateDetails.push({ field: 'treadDepth', label: 'Tread Depth', previousValue: '-', nextValue: `${details.treadDepth} mm` });
    }
    if (details?.isNew) {
      specUpdateDetails.push({ field: 'tyreCondition', label: 'Condition', previousValue: '-', nextValue: 'New Tyre' });
    }
    try {
      await addEntryOfflineFirst({
        type: 'spec_update',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer,
        cost: undefined,
        specUpdatedFields: ['tyreSetup'],
        specUpdateDetails,
        expenseTitle: actionLabels[action],
      });
      void runSyncCycle();
    } catch {
      // Silent fail - tyre setup is already saved locally
    }
  }, [addEntryOfflineFirst, currentUser]);

  const saveEdit = useCallback(() => {
    if (!editingTyreRecord || !editAction) return;
    const parsedOdometer = Number(draftOdometer);
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) { AppAlert.alert('Invalid odometer', 'Enter a valid odometer reading.'); return; }
    const eventDate = dayjs().format('YYYY-MM-DD');

    if (editAction === 'change') {
      persistTyreSetup(applyTyreInspectionUpdate(tyres, editingTyreRecord.id, { odometer: parsedOdometer, inspectionDate: eventDate, treadDepthAtInspection: NEW_TREAD_DEPTH_MM, isNew: true }));
      void addTyreHistoryEntry('new_tyre', editingTyreRecord.currentPosition, parsedOdometer, { isNew: true });
      cancelEdit(); return;
    }

    if (editAction === 'swap_stepney') {
      if (editingTyreRecord.currentPosition === 's') return;
      const nextAssignments = { ...currentAssignments, [editingTyreRecord.currentPosition]: currentAssignments.s, s: currentAssignments[editingTyreRecord.currentPosition] };
      persistTyreSetup(applyTyrePositionUpdate(tyres, nextAssignments, parsedOdometer));
      void addTyreHistoryEntry('swap_stepney', editingTyreRecord.currentPosition, parsedOdometer);
      cancelEdit(); return;
    }

    const parsedTread = Number(draftTreadDepth);
    if (!Number.isFinite(parsedTread) || parsedTread < MIN_SAFE_TREAD_MM || parsedTread > NEW_TREAD_DEPTH_MM) {
      AppAlert.alert('Invalid tread depth', `Tread depth must be between ${MIN_SAFE_TREAD_MM} and ${NEW_TREAD_DEPTH_MM} mm.`);
      return;
    }

    persistTyreSetup(applyTyreInspectionUpdate(tyres, editingTyreRecord.id, { odometer: parsedOdometer, inspectionDate: eventDate, treadDepthAtInspection: parsedTread, isNew: false }));
    void addTyreHistoryEntry('inspect', editingTyreRecord.currentPosition, parsedOdometer, { treadDepth: parsedTread });
    cancelEdit();
  }, [cancelEdit, currentAssignments, currentOdometer, draftOdometer, draftTreadDepth, editAction, editingTyreRecord, persistTyreSetup, tyres, addTyreHistoryEntry]);

  const openPositionEditor = () => { cancelEdit(); setDraftAssignments(currentAssignments); setDraftPositionOdometer(String(currentOdometer)); setIsPositionEditorOpen(true); };
  const cancelPositionEditor = () => { setDraftAssignments(currentAssignments); setDraftPositionOdometer(String(currentOdometer)); setIsPositionEditorOpen(false); };
  
  const assignTyreToPosition = (position: TyrePosition, tyreId: TyrePosition) => {
    setDraftAssignments((previous) => {
      if (previous[position] === tyreId) return previous;
      const swappedPosition = POSITION_ORDER.find((candidate) => previous[candidate] === tyreId);
      if (!swappedPosition) return previous;
      return { ...previous, [swappedPosition]: previous[position], [position]: tyreId };
    });
  };

  const savePositionEditor = () => {
    const parsedOdometer = Number(draftPositionOdometer);
    if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) { AppAlert.alert('Invalid odometer', 'Enter a valid odometer reading.'); return; }
    if (areAssignmentsEqual(currentAssignments, draftAssignments)) { cancelPositionEditor(); return; }
    persistTyreSetup(applyTyrePositionUpdate(tyres, draftAssignments, parsedOdometer));
    // Create history entry for position changes
    const changedPositions = POSITION_ORDER.filter((pos) => currentAssignments[pos] !== draftAssignments[pos]);
    if (changedPositions.length > 0 && currentUser) {
      const positionChanges = changedPositions.map((pos) => {
        const oldTyre = getTyreDisplayName(currentAssignments[pos]);
        const newTyre = getTyreDisplayName(draftAssignments[pos]);
        return `${POSITION_LABELS[pos]}: ${oldTyre} → ${newTyre}`;
      });
      void addEntryOfflineFirst({
        type: 'spec_update',
        userId: currentUser.id,
        userName: currentUser.name,
        odometer: parsedOdometer,
        cost: undefined,
        specUpdatedFields: ['tyreSetup'],
        specUpdateDetails: positionChanges.map((change) => ({ field: 'position', label: change, previousValue: '-', nextValue: '-' })),
        expenseTitle: `Tyre positions updated (${changedPositions.length} change${changedPositions.length > 1 ? 's' : ''})`,
      }).then(() => runSyncCycle()).catch(() => { /* Silent fail */ });
    }
    setIsPositionEditorOpen(false);
  };

  // Helper component for the visual car layout blocks
  const VisualTyreBlock = ({ position, label, align }: { position: TyrePosition, label: string, align: 'left' | 'right' | 'center' }) => (
    <View style={[styles.visualTyreBlock, { backgroundColor: secondarySurfaceColor }]}>
      <Text style={[styles.visualTyreLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.visualTyreName, { color: colors.textPrimary }]}>{getTyreDisplayName(currentAssignments[position])}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialCommunityIcons name="tire" size={22} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerMetaRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Tyre Life Analysis</Text>
              <View style={[styles.sizeBadge, { backgroundColor: secondarySurfaceColor }]}>
                <Text style={[styles.sizeBadgeLabel, { color: colors.textSecondary }]}>SIZE</Text>
                <Text style={[styles.sizeBadgeText, { color: colors.textPrimary }]}>{TYRE_SIZE}</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Health follows the physical tyre. Spare wear is paused.</Text>
          </View>
        </View>
      </View>

      {/* Visual Chassis Configuration */}
      <View style={styles.positionManager}>
        <View style={styles.positionManagerHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.managerTitle, { color: colors.textPrimary }]}>Active Configuration</Text>
            <Text style={[styles.managerSubtitle, { color: colors.textSecondary }]}>Current physical mounting</Text>
          </View>
          <Pressable onPress={openPositionEditor} style={[styles.manageButton, { backgroundColor: secondarySurfaceColor }]}>
            <MaterialIcons name="tune" size={16} color={colors.textPrimary} />
            <Text style={[styles.manageButtonText, { color: colors.textPrimary }]}>Manage</Text>
          </Pressable>
        </View>

        {/* The New "Car Outline" Visual Layout */}
        <View style={[styles.carLayoutWrapper, { backgroundColor: deepSurfaceColor, borderColor: secondarySurfaceColor }]}>
            {/* Front Axle */}
            <View style={styles.axleRow}>
               <VisualTyreBlock position="pf" label="LEFT (PF)" align="left" />
               <VisualTyreBlock position="df" label="RIGHT (DF)" align="right" />
            </View>
            {/* Rear Axle */}
            <View style={styles.axleRow}>
               <VisualTyreBlock position="pb" label="LEFT (PB)" align="left" />
               <VisualTyreBlock position="db" label="RIGHT (DB)" align="right" />
            </View>
            {/* Trunk / Spare */}
            <View style={styles.spareRow}>
               <VisualTyreBlock position="s" label="SPARE TYRE" align="center" />
            </View>
        </View>

        {isPositionEditorOpen ? (
          <View style={[styles.positionEditor, { backgroundColor: deepSurfaceColor }]}>
            <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>Set the current mounted tyre. Auto-swaps to keep tyres unique.</Text>
            </View>

            {POSITION_ORDER.map((position) => (
              <View key={position} style={[styles.positionCard, { backgroundColor: colors.background }]}>
                <View style={styles.positionCardHead}>
                  <View>
                    <Text style={[styles.positionCardTitle, { color: colors.textPrimary }]}>{POSITION_LABELS[position]}</Text>
                    <Text style={[styles.positionCardSubtitle, { color: colors.textSecondary }]}>{position === 's' ? 'Safety / standby tyre' : 'Active on-road'}</Text>
                  </View>
                  <View style={[styles.positionBadge, { backgroundColor: secondarySurfaceColor }]}>
                    <Text style={[styles.positionBadgeText, { color: colors.textPrimary }]}>{draftAssignments[position]}</Text>
                  </View>
                </View>

                <View style={styles.assignmentChipRow}>
                  {POSITION_ORDER.map((tyreId) => {
                    const active = draftAssignments[position] === tyreId;
                    return (
                      <Pressable key={`${position}-${tyreId}`} onPress={() => assignTyreToPosition(position, tyreId)} style={[styles.assignmentChip, { backgroundColor: active ? colors.textPrimary : secondarySurfaceColor }]}>
                        <Text style={[styles.assignmentChipText, { color: active ? colors.invertedText : colors.textPrimary }]}>{getTyreDisplayName(tyreId)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <OdometerDigitInput label="Odometer at Swap (km)" value={draftPositionOdometer} onChangeText={setDraftPositionOdometer} />

            <View style={styles.editorActions}>
              <Pressable onPress={cancelPositionEditor} style={({ pressed }) => [styles.pillActionBtn, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}>
                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                <Text style={[styles.pillActionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={savePositionEditor} style={({ pressed }) => [styles.pillActionBtn, { backgroundColor: colors.textPrimary, opacity: pressed ? 0.8 : 1 }]}>
                <MaterialIcons name="check" size={18} color={colors.invertedText} />
                <Text style={[styles.pillActionBtnText, { color: colors.invertedText }]}>SAVE SETUP</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* Analytics Cards List (Replaced the tight table) */}
      <View style={styles.analyticsList}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILED WEAR ANALYSIS</Text>

        {tyres.map((tyre) => {
          const isEditing = editingTyre === tyre.id;
          const initialHealth = tyre.isNew ? 100 : calcHealthFromTread(tyre.treadDepthAtInspection);
          const current = calcCurrentHealth(tyre, currentOdometer);
          const currentColor = getHealthColor(current.healthPercent);
          const initialColor = getHealthColor(initialHealth);
          const movementText = "" //tyre.movedFromPosition && tyre.movedFromPosition !== tyre.currentPosition ? ` • Moved from ${POSITION_SHORT[tyre.movedFromPosition]}` : '';

          return (
            <View key={tyre.id} style={[styles.analyticsCardWrapper, { backgroundColor: isEditing ? deepSurfaceColor : 'transparent' }]}>
              
              {/* The New Card View */}
              <View style={styles.analyticsCard}>
                
                {/* Header Row: Names and Actions */}
                <View style={styles.cardTopRow}>
                   <View style={styles.cardTitleWrap}>
                      <View style={[styles.posBadge, { backgroundColor: currentColor.bg }]}>
                         <Text style={[styles.posBadgeText, { color: currentColor.color }]}>{POSITION_SHORT[tyre.currentPosition]}</Text>
                      </View>
                      <View style={styles.cardNameBlock}>
                         {/* Full width allocated so no truncation happens here */}
                         <Text style={[styles.locName, { color: colors.textPrimary }]}>{POSITION_LABELS[tyre.currentPosition]}</Text>
                         <Text style={[styles.treadLabel, { color: colors.textSecondary }]}>
                            {getTyreDisplayName(tyre.id)} • {current.currentTreadMm} mm{movementText}
                         </Text>
                      </View>
                   </View>
                   <Pressable onPress={() => beginEdit(tyre.id)} style={[styles.editBtn, { backgroundColor: isEditing ? colors.textPrimary : secondarySurfaceColor }]}>
                      <MaterialIcons name={isEditing ? 'expand-less' : 'edit'} size={18} color={isEditing ? colors.invertedText : colors.textPrimary} />
                   </Pressable>
                </View>

                {/* Stats Row: Narrative Health Drop */}
                <View style={[styles.statsRow, { backgroundColor: deepSurfaceColor }]}>
                   <View style={styles.statBlock}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>HEALTH WEAR</Text>
                      <View style={styles.healthProgression}>
                         <Text style={[styles.progressionText, { color: initialColor.color }]}>{initialHealth}%</Text>
                         <MaterialIcons name="arrow-right-alt" size={18} color={colors.textSecondary} />
                         <Text style={[styles.progressionTextBold, { color: currentColor.color }]}>{current.healthPercent}%</Text>
                      </View>
                   </View>
                   
                   <View style={[styles.statDivider, { backgroundColor: secondarySurfaceColor }]} />
                   
                   <View style={styles.statBlock}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>EST. REMAINING</Text>
                      <Text style={[styles.progressionTextBold, { color: currentColor.color }]}>{formatKm(current.estimatedRemainingKm)}</Text>
                   </View>
                </View>
              </View>

              {/* Editing Form (Unchanged functionality, slightly refined spacing) */}
              {isEditing ? (
                <View style={styles.editPanel}>
                  <View style={[styles.editCard, { backgroundColor: secondarySurfaceColor }]}>
                    <Text style={[styles.editSectionTitle, { color: colors.textSecondary }]}>WHAT DID YOU DO?</Text>
                    <View style={styles.actionRow}>
                      {filteredEditActions.map((action) => {
                        const isActive = editAction === action.key;
                        return (
                          <Pressable key={action.key} onPress={() => setEditAction(action.key)} style={[styles.actionChip, { backgroundColor: isActive ? colors.textPrimary : colors.background }]}>
                            <MaterialIcons name={action.icon as keyof typeof MaterialIcons.glyphMap} size={16} color={isActive ? colors.invertedText : colors.textPrimary} />
                            <Text style={[styles.actionChipText, { color: isActive ? colors.invertedText : colors.textPrimary }]}>{action.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {editAction ? (
                      <>
                        <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
                          <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
                          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                            {editAction === 'change' ? `Replace tyre at ${POSITION_LABELS[editingTyrePosition]} with a new tyre.` : editAction === 'swap_stepney' ? `Spare swaps into ${POSITION_LABELS[editingTyrePosition]}.` : 'Capture fresh tread depth reading.'}
                          </Text>
                        </View>

                        {editAction === 'inspect' ? (
                          <View style={styles.treadInputWrap}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tread Depth (mm)</Text>
                            <View style={[styles.treadInput, { backgroundColor: colors.background }]}>
                              <Text style={[styles.treadInputPrefix, { color: colors.textSecondary }]}>mm</Text>
                              <View style={styles.treadInputField}>
                                <Pressable style={[styles.treadStepBtn, { backgroundColor: secondarySurfaceColor }]} onPress={() => setDraftTreadDepth(String(Math.max(MIN_SAFE_TREAD_MM, Math.round(((Number(draftTreadDepth) || MIN_SAFE_TREAD_MM) - 0.1) * 10) / 10)))}>
                                  <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                                </Pressable>
                                <Text style={[styles.treadValueText, { color: colors.textPrimary }]}>{draftTreadDepth || '—'}</Text>
                                <Pressable style={[styles.treadStepBtn, { backgroundColor: secondarySurfaceColor }]} onPress={() => setDraftTreadDepth(String(Math.min(NEW_TREAD_DEPTH_MM, Math.round(((Number(draftTreadDepth) || MIN_SAFE_TREAD_MM) + 0.1) * 10) / 10)))}>
                                  <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        ) : null}

                        <OdometerDigitInput label="Odometer at Update (km)" value={draftOdometer} onChangeText={setDraftOdometer} />

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
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      
      <View style={styles.legend}>
        <Text style={[styles.legendNote, { color: colors.textSecondary }]}>Estimates rely on a {AVERAGE_TOTAL_TYRE_LIFE_KM.toLocaleString()} km industry standard lifespan.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 28, overflow: 'hidden', marginTop: 24, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  sizeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  sizeBadgeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  sizeBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  positionManager: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8, gap: 16 },
  positionManagerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  managerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  managerSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  manageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  manageButtonText: { fontSize: 13, fontWeight: '800' },
  
  // New visual car layout
  carLayoutWrapper: { borderRadius: 24, padding: 16, gap: 12, borderWidth: 1 },
  axleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  spareRow: { alignItems: 'center', marginTop: 4 },
  visualTyreBlock: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  visualTyreLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  visualTyreName: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  
  positionEditor: { borderRadius: 24, padding: 20, gap: 16, marginTop: 8 },
  positionCard: { borderRadius: 20, padding: 16, gap: 14 },
  positionCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  positionCardTitle: { fontSize: 16, fontWeight: '900' },
  positionCardSubtitle: { fontSize: 13, marginTop: 4 },
  positionBadge: { minWidth: 48, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  positionBadgeText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  assignmentChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assignmentChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  assignmentChipText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  
  analyticsList: { paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginLeft: 20, marginBottom: 8, marginTop: 4 },
  analyticsCardWrapper: { paddingHorizontal: 20, paddingVertical: 10 },
  analyticsCard: { gap: 14 },
  
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 },
  posBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  posBadgeText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  cardNameBlock: { flex: 1 },
  locName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  treadLabel: { fontSize: 12, fontWeight: '600' },
  editBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  statsRow: { flexDirection: 'row', borderRadius: 16, padding: 14, alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', gap: 6 },
  statDivider: { width: 1, height: '80%' },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  healthProgression: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressionText: { fontSize: 15, fontWeight: '700' },
  progressionTextBold: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  
  editPanel: { paddingBottom: 16, paddingTop: 16 },
  editCard: { padding: 20, borderRadius: 24, gap: 16 },
  editSectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  actionChipText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
  treadInputWrap: { gap: 8 },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  treadInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  treadInputPrefix: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, opacity: 0.6 },
  treadInputField: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  treadStepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  treadValueText: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, minWidth: 64, textAlign: 'center' },
  editorActions: { flexDirection: 'row', gap: 12 },
  pillActionBtn: { flex: 1, minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  pillActionBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  
  legend: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 },
  legendNote: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
