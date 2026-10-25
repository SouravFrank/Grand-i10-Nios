/**
 * GradientActionButton.tsx
 * Accent gradient CTA with a spring press response and a soft shine that
 * periodically sweeps across — runs fully on the UI thread.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type GradientActionButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  /** Lighter gradient stop (top). */
  accent: string;
  /** Deeper gradient stop (bottom). */
  accentDeep: string;
};

const SHINE_W = 64;

export function GradientActionButton({ label, onPress, loading = false, accent, accentDeep }: GradientActionButtonProps) {
  const press = useSharedValue(1);
  const shine = useSharedValue(0);

  useEffect(() => {
    shine.value = withRepeat(
      withSequence(withDelay(2100, withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }))),
      -1,
      false,
    );
  }, [shine]);

  const rootStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shine.value, [0, 1], [-140, 220]) }],
  }));

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <Pressable
        disabled={loading}
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(0.955, { damping: 18, stiffness: 400 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={({ pressed }) => [styles.press, { opacity: pressed ? 0.92 : 1 }, { shadowColor: accent }]}
      >
        <LinearGradient colors={[accent, accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
          {!loading && (
            <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
              <View style={styles.shineBar}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </Animated.View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  press: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#FFFFFF',
  },
  shine: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: SHINE_W,
  },
  shineBar: {
    flex: 1,
    transform: [{ rotate: '18deg' }],
  },
});
