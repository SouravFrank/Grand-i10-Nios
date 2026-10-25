import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { usePressScale } from './usePressScale';

import scenicRoad from '../../../assets/images/scenic_road.webp';

// ─── Keep-tracking promo card (doubles as the missed-entry / history action) ──
export function KeepTrackingPromo({ onPress }: { onPress: () => void }) {
  const { colors } = useAppTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.promoCard,
          { backgroundColor: colors.card, opacity: pressed ? 0.94 : 1 },
        ]}>
        <View style={[styles.promoIconTile, { backgroundColor: colors.backgroundSecondary }]}>
          <MaterialCommunityIcons name="car" size={20} color={colors.textPrimary} />
        </View>
        <View style={styles.promoText}>
          <Text style={[styles.promoTitle, { color: colors.textPrimary }]}>Keep tracking - Forgot?</Text>
          <Text style={[styles.promoSubtitle, { color: colors.textSecondary }]}>
            Log your trips, fuel and expenses to get better insights about your vehicle.
          </Text>
        </View>
        <Image
          source={scenicRoad}
          style={styles.promoIllustration}
          resizeMode="contain"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  promoCard: {
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  promoIconTile: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promoText: {
    flex: 1,
    minWidth: 0,
    // Clears the illustration anchored to the card's bottom-right corner
    paddingRight: 104,
  },
  promoTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  promoSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
    zIndex: 5
  },
  // Fills the card's bottom-right corner; the card's rounded corners clip it
  promoIllustration: {
    position: 'absolute',
    right: 0,
    bottom: -15,
    width: 1774 / 13,
    height: 887 / 13,
    aspectRatio: 1774 / 887,
  },
});
