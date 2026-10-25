/**
 * TripSuccessOverlay.tsx
 * Celebration state for the trip popup: the badge spring-pops in while a
 * pulse ring expands, the checkmark draws itself along its stroke and spark
 * particles burst outward — all on the UI thread with Reanimated.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_LENGTH = 2 * Math.PI * 28; // r = 28 ring
const CHECK_LENGTH = 42; // generous upper bound for the tick path

type SparkConfig = { angleDeg: number; distance: number; size: number };

const SPARK_CONFIGS: SparkConfig[] = [
  { angleDeg: 200, distance: 58, size: 7 },
  { angleDeg: 235, distance: 66, size: 5 },
  { angleDeg: 268, distance: 62, size: 8 },
  { angleDeg: 300, distance: 68, size: 5 },
  { angleDeg: 332, distance: 60, size: 7 },
  { angleDeg: 8, distance: 66, size: 5 },
  { angleDeg: 44, distance: 62, size: 8 },
  { angleDeg: 132, distance: 58, size: 5 },
];

function Spark({ config, accent }: { config: SparkConfig; accent: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(280, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  const style = useAnimatedStyle(() => {
    const rad = (config.angleDeg * Math.PI) / 180;
    const tx = Math.cos(rad) * config.distance * progress.value;
    const ty = Math.sin(rad) * config.distance * progress.value;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: interpolate(progress.value, [0, 1], [0.4, 1]) },
      ],
      opacity: interpolate(progress.value, [0, 0.7, 1], [0, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          backgroundColor: accent,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          marginLeft: -config.size / 2,
          marginTop: -config.size / 2,
        },
        style,
      ]}
    />
  );
}

type Props = {
  isEditing: boolean;
  isEndingTrip: boolean;
  modeAccent: string;
};

export function TripSuccessOverlay({ isEditing, isEndingTrip, modeAccent }: Props) {
  const { colors, isDark } = useAppTheme();

  const badgeScale = useSharedValue(0);
  const haloScale = useSharedValue(0.55);
  const haloOpacity = useSharedValue(0.3);
  const ringDraw = useSharedValue(0);
  const tickDraw = useSharedValue(0);
  const textProgress = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withSpring(1, { damping: 11, stiffness: 200, mass: 0.7 });
    haloScale.value = withDelay(60, withTiming(1.4, { duration: 900, easing: Easing.out(Easing.cubic) }));
    haloOpacity.value = withDelay(60, withTiming(0, { duration: 900 }));
    ringDraw.value = withDelay(160, withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) }));
    tickDraw.value = withDelay(340, withTiming(1, { duration: 340, easing: Easing.out(Easing.quad) }));
    textProgress.value = withDelay(440, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }));
  }, [badgeScale, haloScale, haloOpacity, ringDraw, tickDraw, textProgress]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * (1 - ringDraw.value),
  }));
  const tickProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - tickDraw.value),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: textProgress.value,
    transform: [{ translateY: interpolate(textProgress.value, [0, 1], [10, 0]) }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: textProgress.value,
    transform: [{ translateY: interpolate(textProgress.value, [0, 1], [8, 0]) }],
  }));

  const sparks = useMemo(() => SPARK_CONFIGS, []);

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: isDark ? 'rgba(4, 8, 12, 0.93)' : 'rgba(250, 251, 253, 0.96)' },
      ]}
    >
      <View style={styles.badgeStage}>
        <Animated.View style={[styles.halo, { backgroundColor: modeAccent }, haloStyle]} />
        <Animated.View style={[styles.badge, { backgroundColor: modeAccent }, badgeStyle]}>
          <Svg width={64} height={64} viewBox="0 0 64 64">
            <AnimatedCircle
              cx={32}
              cy={32}
              r={28}
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_LENGTH}
              transform="rotate(-90 32 32)"
              animatedProps={ringProps}
            />
            <AnimatedPath
              d="M 20 33 L 28 41 L 44 23"
              stroke="#FFFFFF"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={tickProps}
            />
          </Svg>
        </Animated.View>
        {sparks.map((config, index) => (
          <Spark key={index} config={config} accent={modeAccent} />
        ))}
      </View>

      <Animated.Text style={[styles.title, { color: colors.textPrimary }, titleStyle]}>
        {isEditing ? 'Updated!' : isEndingTrip ? 'Trip Ended!' : 'Trip Started!'}
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { color: colors.textSecondary }, subtitleStyle]}>
        {isEditing
          ? 'Odometer reading has been updated.'
          : isEndingTrip
            ? 'Your trip has been recorded successfully.'
            : 'Drive safe! Your trip is being tracked.'}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  badgeStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    margin: 28,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: 36,
    lineHeight: 20,
  },
});
