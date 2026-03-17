import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/theme/useAppTheme';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';

const INSPECTION_DATE = '2026-02-21';
const INSPECTION_ODOMETER = 29703;

type TireEntry = {
  id: string;
  location: string;
  treadDepth: number; // in mm
  initialLifePercent: number;
  initialRemainingKm: number;
};

const TIRE_DATA: TireEntry[] = [
  { id: 'pf', location: 'Passenger Front', treadDepth: 6.1, initialLifePercent: 70, initialRemainingKm: 35600 },
  { id: 'db', location: 'Driver Back', treadDepth: 6.0, initialLifePercent: 68, initialRemainingKm: 34500 },
  { id: 's', location: 'Stepney (Spare)', treadDepth: 5.2, initialLifePercent: 56, initialRemainingKm: 25300 },
  { id: 'df', location: 'Driver Front', treadDepth: 4.8, initialLifePercent: 50, initialRemainingKm: 20700 },
  { id: 'pb', location: 'Passenger Back', treadDepth: 4.7, initialLifePercent: 48, initialRemainingKm: 19500 },
];

function getStatusFromPercentage(percent: number): { label: string; color: string; bg: string } {
  if (percent >= 55) return { label: 'Healthy', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' }; // Green
  if (percent >= 25) return { label: 'Moderate Wear', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' }; // Amber/Yellow
  if (percent > 0) return { label: 'Needs Replace', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' }; // Red
  return { label: 'Replaced', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' }; // Gray
}

type Props = {
  currentOdometer: number;
};

export function TyreHealthSection({ currentOdometer }: Props) {
  const { colors, isDark } = useAppTheme();
  const kmDrivenSinceInspection = Math.max(0, currentOdometer - INSPECTION_ODOMETER);

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
                <Text style={[styles.sizeBadgeText, { color: colors.textPrimary }]}>175/60R15</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Auto-calculated from inspection at {INSPECTION_ODOMETER} km ({dayjs(INSPECTION_DATE).format('DD MMM YYYY')})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {TIRE_DATA.map((tire, index) => {
          // Calculate current stats
          const remainingKm = Math.max(0, tire.initialRemainingKm - kmDrivenSinceInspection);
          const currentLifePercent = remainingKm > 0 ? Math.round((remainingKm / tire.initialRemainingKm) * tire.initialLifePercent) : 0;
          const status = getStatusFromPercentage(currentLifePercent);
          
          return (
            <View 
              key={tire.id} 
              style={[
                styles.row,
                index < TIRE_DATA.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
            >
              <View style={styles.col1}>
                <Text style={[styles.locName, { color: colors.textPrimary }]}>{tire.location}</Text>
                <Text style={[styles.depthValue, { color: colors.textSecondary }]}>Depth: {tire.treadDepth} mm</Text>
              </View>
              
              <View style={styles.col2}>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>~{currentLifePercent}%</Text>
              </View>
              
              <View style={styles.col3}>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Est. Life</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>~{remainingKm.toLocaleString()} km</Text>
              </View>
              
              <View style={styles.col4}>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          );
        })}
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
    borderBottomColor: 'rgba(150,150,150,0.1)', // Subtle separator
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
    fontSize: 12,
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
  list: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  col1: {
    flex: 3,
    justifyContent: 'center',
  },
  locName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  depthValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  col2: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  col3: {
    flex: 2.5,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  col4: {
    flex: 2.5,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
