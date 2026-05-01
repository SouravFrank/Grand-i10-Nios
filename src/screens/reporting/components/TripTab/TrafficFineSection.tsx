import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { TrafficFineData } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from '../common/TripTab.styles';

const AYAN_COLOR = '#3B82F6';
const SOURAV_COLOR = '#8B5CF6';
const DANGER_COLOR = '#EF4444'; 

interface TrafficFineSectionProps {
  trafficFine: TrafficFineData;
  secondarySurfaceColor: string;
  surfaceColor: string;
}

export function TrafficFineSection({
  trafficFine,
  secondarySurfaceColor,
  surfaceColor,
}: TrafficFineSectionProps) {
  const { colors } = useAppTheme();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  if (trafficFine.totalAmount === 0) return null;

  // Determine active contributors to conditionally render the "Total" row
  const hasAyan = (trafficFine.byUser.ayan ?? 0) > 0;
  const hasSourav = (trafficFine.byUser.sourav ?? 0) > 0;
  const hasShared = trafficFine.sharedTripFines > 0;
  const contributorCount = [hasAyan, hasSourav, hasShared].filter(Boolean).length;

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="gavel" size={20} color={DANGER_COLOR} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Traffic Fine</Text>
        </View>

        <View style={[styles.inlineStatPill, { borderColor: colors.border, backgroundColor: secondarySurfaceColor }]}>
          <MaterialIcons name="receipt-long" size={12} color={colors.textSecondary} />
          <Text style={[styles.inlineStatText, { color: colors.textPrimary }]}>
            {trafficFine.totalCount} {trafficFine.totalCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {(hasAyan || hasSourav) && (
        <View style={styles.userCardsRow}>
          {hasAyan && (
            <View style={[styles.userCard, { backgroundColor: `${AYAN_COLOR}0A`, borderWidth: 1, borderColor: `${AYAN_COLOR}40` }]}>
              <View style={styles.userHeader}>
                <MaterialIcons name="person" size={16} color={AYAN_COLOR} />
                <Text style={[styles.userName, { color: AYAN_COLOR }]}>Ayan</Text>
              </View>
              <View style={[styles.cardContent, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons name="error" size={18} color={DANGER_COLOR} />
                </Animated.View>
                <CountUpText 
                  value={trafficFine.byUser.ayan ?? 0} 
                  formatter={formatINR} 
                  style={[styles.primaryAmount, { color: colors.textPrimary }]} 
                />
              </View>
            </View>
          )}

          {hasSourav && (
            <View style={[styles.userCard, { backgroundColor: `${SOURAV_COLOR}0A`, borderWidth: 1, borderColor: `${SOURAV_COLOR}40` }]}>
              <View style={styles.userHeader}>
                <MaterialIcons name="person" size={16} color={SOURAV_COLOR} />
                <Text style={[styles.userName, { color: SOURAV_COLOR }]}>Sourav</Text>
              </View>
              <View style={[styles.cardContent, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons name="error" size={18} color={DANGER_COLOR} />
                </Animated.View>
                <CountUpText 
                  value={trafficFine.byUser.sourav ?? 0} 
                  formatter={formatINR} 
                  style={[styles.primaryAmount, { color: colors.textPrimary }]} 
                />
              </View>
            </View>
          )}
        </View>
      )}

      {hasShared && (
        <View style={[styles.highlightedCard, { backgroundColor: `${DANGER_COLOR}10`, marginTop: 8, borderWidth: 1, borderColor: `${DANGER_COLOR}40` }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="groups" size={16} color={DANGER_COLOR} />
            <Text style={[styles.cardTitle, { color: DANGER_COLOR }]}>Shared Trip Fine</Text>
          </View>
          <View style={[styles.cardContent, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialIcons name="warning" size={20} color={DANGER_COLOR} />
            </Animated.View>
            <CountUpText 
              value={trafficFine.sharedTripFines} 
              formatter={formatINR} 
              style={[styles.primaryAmount, { color: DANGER_COLOR }]} 
            />
          </View>
        </View>
      )}

      {/* Conditionally render Total Fine if there is more than 1 contributor */}
      {contributorCount > 1 && (
        <View style={[{ marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.cardTitle, { color: DANGER_COLOR }]}>Total Fine Paid</Text>
          <CountUpText
            value={trafficFine.totalAmount}
            formatter={formatINR}
            style={[styles.primaryAmount, { color: DANGER_COLOR }]}
          />
        </View>
      )}
    </View>
  );
}