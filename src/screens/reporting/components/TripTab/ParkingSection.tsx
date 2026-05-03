import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { ParkingData } from '../../reportCalculations';
import { formatINR } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from '../common/TripTab.styles';

const AYAN_COLOR = '#3B82F6';
const SOURAV_COLOR = '#8B5CF6';

interface ParkingSectionProps {
  parking: ParkingData;
  secondarySurfaceColor: string;
  surfaceColor: string;
}

export function ParkingSection({
  parking,
  secondarySurfaceColor,
  surfaceColor,
}: ParkingSectionProps) {
  const { colors } = useAppTheme();
  
  // Animation for the cards to "settle" into place
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [scaleAnim, opacityAnim]);

  if (parking.totalAmount === 0) return null;

  const hasAyan = (parking.byUser.ayan ?? 0) > 0;
  const hasSourav = (parking.byUser.sourav ?? 0) > 0;
  const hasShared = parking.sharedTripParking > 0;
  const contributorCount = [hasAyan, hasSourav, hasShared].filter(Boolean).length;

  return (
    <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          {/* Creative Icon Badge instead of the generic 'P' */}
          <View style={{
            backgroundColor: colors.textPrimary,
            padding: 6,
            borderRadius: 8,
            transform: [{ rotate: '-5deg' }], // Slight jaunty angle for character
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            <MaterialIcons name="directions-car" size={16} color={colors.background} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 4 }]}>Parking</Text>
        </View>

        <View style={[styles.inlineStatPill, { backgroundColor: secondarySurfaceColor }]}>
          <MaterialIcons name="confirmation-number" size={12} color={colors.textSecondary} />
          <Text style={[styles.inlineStatText, { color: colors.textPrimary }]}>
            {parking.totalCount} {parking.totalCount === 1 ? 'ticket' : 'tickets'}
          </Text>
        </View>
      </View>

      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
        {(hasAyan || hasSourav) && (
          <View style={styles.userCardsRow}>
            {hasAyan && (
              <View style={[
                styles.userCard, 
                // Dashed borders to mimic parking bay lines
                { backgroundColor: `${AYAN_COLOR}05`, borderWidth: 2, borderColor: `${AYAN_COLOR}50`, borderStyle: 'dashed' }
              ]}>
                <View style={styles.userHeader}>
                  <MaterialIcons name="person" size={16} color={AYAN_COLOR} />
                  <Text style={[styles.userName, { color: AYAN_COLOR }]}>Ayan</Text>
                </View>
                <View style={styles.cardContent}>
                  <CountUpText 
                    value={parking.byUser.ayan} 
                    formatter={formatINR} 
                    style={[styles.primaryAmount, { color: colors.textPrimary }]} 
                  />
                </View>
              </View>
            )}

            {hasSourav && (
              <View style={[
                styles.userCard, 
                { backgroundColor: `${SOURAV_COLOR}05`, borderWidth: 2, borderColor: `${SOURAV_COLOR}50`, borderStyle: 'dashed' }
              ]}>
                <View style={styles.userHeader}>
                  <MaterialIcons name="person" size={16} color={SOURAV_COLOR} />
                  <Text style={[styles.userName, { color: SOURAV_COLOR }]}>Sourav</Text>
                </View>
                <View style={styles.cardContent}>
                  <CountUpText 
                    value={parking.byUser.sourav} 
                    formatter={formatINR} 
                    style={[styles.primaryAmount, { color: colors.textPrimary }]} 
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {hasShared && (
          <View style={[
            styles.highlightedCard, 
            { backgroundColor: `${colors.primary}08`, marginTop: 8, borderWidth: 2, borderColor: `${colors.primary}40`, borderStyle: 'dashed' }
          ]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="groups" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.primary }]}>Shared Trip Parking</Text>
            </View>
            <View style={styles.cardContent}>
              <CountUpText 
                value={parking.sharedTripParking} 
                formatter={formatINR} 
                style={[styles.primaryAmount, { color: colors.primary }]} 
              />
            </View>
          </View>
        )}
      </Animated.View>

      {contributorCount > 1 && (
        <View style={[{ marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total Parking Paid</Text>
          <CountUpText
            value={parking.totalAmount}
            formatter={formatINR}
            style={[styles.primaryAmount, { color: colors.textPrimary }]}
          />
        </View>
      )}
    </View>
  );
}