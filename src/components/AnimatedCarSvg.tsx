import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';

type AnimatedCarSvgProps = {
  width?: number;
  height?: number;
  /** If true, car bounces subtly and headlight pulses */
  animate?: boolean;
  /** Primary accent color for the car body */
  accentColor?: string;
};

/**
 * A sleek animated car SVG silhouette.
 * Features a subtle body bounce and pulsing headlight, with detailed SVG artwork.
 * Wheels are statically rendered with spoke detail.
 */
export function AnimatedCarSvg({
  width = 280,
  height = 100,
  animate = true,
  accentColor,
}: AnimatedCarSvgProps) {
  const { colors, isDark } = useAppTheme();
  const bodyBounce = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const headlightOpacity = useRef(new Animated.Value(0.4)).current;

  const carColor = accentColor ?? (isDark ? '#60A5FA' : '#3B82F6');

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    if (!animate) return;

    // Subtle car body bounce (continuous)
    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bodyBounce, {
          toValue: -1.5,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyBounce, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyBounce, {
          toValue: -0.5,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyBounce, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Headlight pulse
    const headlightAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(headlightOpacity, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(headlightOpacity, {
          toValue: 0.4,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnim.start();
    headlightAnim.start();

    return () => {
      bounceAnim.stop();
      headlightAnim.stop();
    };
  }, [animate, bodyBounce, fadeIn, headlightOpacity]);

  return (
    <Animated.View style={[styles.container, { width, height, opacity: fadeIn, transform: [{ translateY: bodyBounce }] }]}>
      <Svg width={width} height={height} viewBox="0 0 280 100">
        <Defs>
          <LinearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={carColor} />
            <Stop offset="100%" stopColor={isDark ? '#1E40AF' : '#2563EB'} />
          </LinearGradient>
          <LinearGradient id="windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={isDark ? '#1E293B' : '#CBD5E1'} />
            <Stop offset="100%" stopColor={isDark ? '#0F172A' : '#94A3B8'} />
          </LinearGradient>
        </Defs>

        {/* Car body */}
        <G>
          {/* Lower body */}
          <Path
            d="M 30 62 L 250 62 Q 260 62 262 56 L 264 48 Q 265 44 260 42 L 240 38 L 200 36
               L 170 36 L 90 36 L 55 38 L 28 46 Q 22 48 22 54 L 24 58 Q 25 62 30 62 Z"
            fill="url(#carBodyGrad)"
          />

          {/* Roof / Windows */}
          <Path
            d="M 95 36 L 100 18 Q 102 12 110 12 L 175 12 Q 182 12 185 18 L 195 36 Z"
            fill="url(#windowGrad)"
            opacity={0.85}
          />

          {/* Window divider */}
          <Path
            d="M 145 12 L 145 36"
            stroke={carColor}
            strokeWidth={2}
            opacity={0.6}
          />

          {/* Front bumper detail */}
          <Path
            d="M 240 42 L 256 44 Q 262 45 260 50 L 258 56"
            stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
            strokeWidth={1.5}
            fill="none"
          />

          {/* Headlight */}
          <Circle cx={258} cy={48} r={4} fill="#FBBF24" />
          <Circle cx={258} cy={48} r={7} fill="#FBBF24" opacity={0.2} />

          {/* Tail light */}
          <Circle cx={26} cy={52} r={3} fill="#EF4444" opacity={0.8} />
          <Circle cx={26} cy={52} r={5} fill="#EF4444" opacity={0.15} />

          {/* Body line detail */}
          <Path
            d="M 45 50 L 235 50"
            stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={0.8}
          />

          {/* Door handle */}
          <Path
            d="M 125 46 L 138 46"
            stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>

        {/* Ground shadow */}
        <Path
          d="M 40 76 Q 140 80 240 76"
          stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
          strokeWidth={2}
          fill="none"
        />

        {/* Front wheel */}
        <G>
          <Circle cx={205} cy={64} r={13} fill={isDark ? '#1E293B' : '#374151'} />
          <Circle cx={205} cy={64} r={9} fill={isDark ? '#334155' : '#4B5563'} />
          <Circle cx={205} cy={64} r={3} fill={isDark ? '#64748B' : '#9CA3AF'} />
          {/* Spokes */}
          <Path d="M 205 55 L 205 58" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 205 70 L 205 73" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 196 64 L 199 64" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 211 64 L 214 64" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
        </G>

        {/* Rear wheel */}
        <G>
          <Circle cx={75} cy={64} r={13} fill={isDark ? '#1E293B' : '#374151'} />
          <Circle cx={75} cy={64} r={9} fill={isDark ? '#334155' : '#4B5563'} />
          <Circle cx={75} cy={64} r={3} fill={isDark ? '#64748B' : '#9CA3AF'} />
          {/* Spokes */}
          <Path d="M 75 55 L 75 58" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 75 70 L 75 73" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 66 64 L 69 64" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
          <Path d="M 81 64 L 84 64" stroke={isDark ? '#64748B' : '#9CA3AF'} strokeWidth={1} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
