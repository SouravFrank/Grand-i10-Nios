/**
 * AnimatedCarSvg.tsx
 * Side-profile illustration of the Grand i10 Nios in Spark Green Pearl.
 *
 * Rotation and the suspension float go through native-driver STYLE
 * transforms on the groups (the path react-native-svg supports end to end —
 * never pass an animated `transform` prop string, native expects a matrix
 * array there). Attribute-level motion (road dash offset, DRL / tail glow,
 * wind streaks) uses JS-driver setNativeProps with plain number props.
 * The wrapper fade-in is Reanimated.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';

const RNAnimatedG = RNAnimated.createAnimatedComponent(G as unknown as React.ComponentClass<Record<string, unknown>>);
const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path as unknown as React.ComponentClass<Record<string, unknown>>);
const RNAnimatedCircle = RNAnimated.createAnimatedComponent(Circle as unknown as React.ComponentClass<Record<string, unknown>>);

type AnimatedCarSvgProps = {
  width?: number;
  height?: number;
  /** Wheels spin, road scrolls and the body floats while driving. */
  driving?: boolean;
  /** DRL beam glow (default) or brake-light glow when ending a trip. */
  emphasis?: 'headlight' | 'taillight';
};

// Spark Green Pearl — matched to the real car.
const PAINT = { highlight: '#b9d2c5', base: '#6d8a7d', shadow: '#3d5348' };
const TIRE = '#0a0f1a';
const RIM_SPOKE = '#94a5b5';
const RIM_EDGE = '#c9d4de';
const HUB = '#101726';

const SPOKE_PATH = 'M -1.8 -2.4 L -3.4 -10 L 3.4 -10 L 1.8 -2.4 Z';
const SPOKE_ANGLES = [0, 72, 144, 216, 288];

const BODY_SILHOUETTE = `
  M 46 97
  L 41 66
  C 41 49, 48 38, 63 31
  C 85 21, 112 16, 141 15
  C 169 15, 191 19, 207 29
  L 229 43
  C 253 47, 277 54, 290 62
  C 297 66, 300 75, 297 84
  C 295 91, 289 96, 280 97
  L 255.4 97
  A 21.5 21.5 0 0 0 224.6 97
  L 107.4 97
  A 21.5 21.5 0 0 0 76.6 97
  Z
`;

export function AnimatedCarSvg({
  width = 264,
  height = 109,
  driving = true,
  emphasis = 'headlight',
}: AnimatedCarSvgProps) {
  const { isDark } = useAppTheme();

  // Body float runs on the native driver (style transform on a view-backed
  // group); everything touching SVG attributes uses the JS driver.
  const bodyBounce = useRef(new RNAnimated.Value(0)).current;
  const wheelSpin = useRef(new RNAnimated.Value(0)).current;
  const roadDash = useRef(new RNAnimated.Value(0)).current;
  const drlPulse = useRef(new RNAnimated.Value(1)).current;
  const glowPulse = useRef(new RNAnimated.Value(0.1)).current;
  const streakA = useRef(new RNAnimated.Value(0)).current;
  const streakB = useRef(new RNAnimated.Value(0)).current;
  const streakC = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!driving) {
      RNAnimated.parallel([
        RNAnimated.timing(bodyBounce, { toValue: 0, duration: 240, useNativeDriver: true }),
        RNAnimated.timing(drlPulse, { toValue: 0.9, duration: 300, useNativeDriver: false }),
        RNAnimated.timing(glowPulse, { toValue: 0.1, duration: 300, useNativeDriver: false }),
        RNAnimated.timing(roadDash, { toValue: 0, duration: 240, useNativeDriver: false }),
      ]).start();
      streakA.setValue(0);
      streakB.setValue(0);
      streakC.setValue(0);
      return;
    }

    const bounce = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bodyBounce, { toValue: -1.7, duration: 620, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(bodyBounce, { toValue: 0.5, duration: 620, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(bodyBounce, { toValue: 0, duration: 360, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ]),
    );
    const spin = RNAnimated.loop(
      RNAnimated.timing(wheelSpin, { toValue: 360, duration: 820, easing: RNEasing.linear, useNativeDriver: true }),
    );
    const road = RNAnimated.loop(
      RNAnimated.timing(roadDash, { toValue: 40, duration: 600, easing: RNEasing.linear, useNativeDriver: false }),
    );
    const drl = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(drlPulse, { toValue: 1, duration: 850, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: false }),
        RNAnimated.timing(drlPulse, { toValue: 0.55, duration: 850, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: false }),
      ]),
    );
    const glow = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowPulse, { toValue: 0.24, duration: 1100, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: false }),
        RNAnimated.timing(glowPulse, { toValue: 0.1, duration: 1100, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: false }),
      ]),
    );
    const streakLoop = (value: RNAnimated.Value, peak: number, duration: number, delay = 0) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(value, { toValue: peak, duration, useNativeDriver: false }),
          RNAnimated.timing(value, { toValue: 0, duration, useNativeDriver: false }),
        ]),
      );
    const sA = streakLoop(streakA, 0.55, 300);
    const sB = streakLoop(streakB, 0.45, 300, 150);
    const sC = streakLoop(streakC, 0.5, 280, 320);

    [bounce, spin, road, drl, glow, sA, sB, sC].forEach((animation) => animation.start());
    return () => {
      [bounce, spin, road, drl, glow, sA, sB, sC].forEach((animation) => animation.stop());
    };
  }, [driving, bodyBounce, wheelSpin, roadDash, drlPulse, glowPulse, streakA, streakB, streakC]);

  // Style-transform degrees on the native driver — same mechanism as the
  // body float. Rotation is around the group's local origin, which after
  // the parent translate() is the wheel centre.
  const spinDeg = useMemo(
    () =>
      wheelSpin.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
      }),
    [wheelSpin],
  );
  const drlHalo = useMemo(
    () =>
      drlPulse.interpolate({
        inputRange: [0.55, 1],
        outputRange: [0.22, 0.4],
        extrapolate: 'clamp',
      }),
    [drlPulse],
  );
  const tailGlow = useMemo(
    () =>
      glowPulse.interpolate({
        inputRange: [0.1, 0.24],
        outputRange: [0.45, 0.6],
        extrapolate: 'clamp',
      }),
    [glowPulse],
  );

  const renderWheel = (cx: number) => (
    <G key={cx} transform={`translate(${cx} 112)`}>
      <Circle r={17} fill={TIRE} />
      <Circle r={15.4} fill="none" stroke="#1e293b" strokeWidth={1.6} />
      <Circle r={11.2} fill="url(#rimGrad)" />
      <RNAnimatedG style={{ transform: [{ rotate: spinDeg }] }}>
        {SPOKE_ANGLES.map((angle) => (
          <Path key={angle} d={SPOKE_PATH} transform={`rotate(${angle})`} fill={RIM_SPOKE} />
        ))}
        <Circle r={3.1} fill={HUB} />
      </RNAnimatedG>
      <Circle r={11.2} fill="none" stroke={RIM_EDGE} strokeOpacity={0.55} strokeWidth={1} />
    </G>
  );

  return (
    <Animated.View entering={FadeIn.duration(420)} style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 320 132">
        <Defs>
          {/* Spark Green Pearl paint */}
          <LinearGradient id="paint" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={PAINT.highlight} />
            <Stop offset="45%" stopColor={PAINT.base} />
            <Stop offset="100%" stopColor={PAINT.shadow} />
          </LinearGradient>

          {/* Horizon shading over the paint */}
          <LinearGradient id="bodyShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <Stop offset="28%" stopColor="#ffffff" stopOpacity={0.06} />
            <Stop offset="60%" stopColor="#000000" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.55} />
          </LinearGradient>

          {/* Greenhouse glass */}
          <LinearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#dbe7f2" stopOpacity={0.55} />
            <Stop offset="42%" stopColor="#4b6478" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="#0b1220" stopOpacity={0.92} />
          </LinearGradient>

          {/* Diamond-cut alloy */}
          <LinearGradient id="rimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#dfe7ee" />
            <Stop offset="100%" stopColor="#8b9aab" />
          </LinearGradient>

          {/* Headlight cluster + beam */}
          <LinearGradient id="headLamp" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f8fafc" />
            <Stop offset="100%" stopColor="#b9c6d2" />
          </LinearGradient>
          <LinearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#fef8d8" stopOpacity={0.75} />
            <Stop offset="100%" stopColor="#fef8d8" stopOpacity={0} />
          </LinearGradient>

          {/* Tail lamp cluster + glow */}
          <LinearGradient id="tailLamp" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#f87171" />
            <Stop offset="100%" stopColor="#b91c1c" />
          </LinearGradient>
          <RadialGradient id="tailGlowGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f87171" stopOpacity={0.75} />
            <Stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Road + soft contact shadow */}
        <RNAnimatedPath
          d="M 16 130 L 304 130"
          stroke={isDark ? '#3b4b5f' : '#94a3b8'}
          strokeOpacity={0.4}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="18 22"
          fill="none"
          strokeDashoffset={roadDash}
        />
        <Ellipse cx="163" cy="122" rx="122" ry="4.5" fill="#000000" opacity={isDark ? 0.55 : 0.14} />

        {/* Wheel wells keep the arches dark while the body floats */}
        <Circle cx="92" cy="112" r="20" fill="#04070d" />
        <Circle cx="240" cy="112" r="20" fill="#04070d" />

        {renderWheel(92)}
        {renderWheel(240)}

        {/* Wind streaks trailing the car */}
        <RNAnimatedPath d="M 10 55 L 42 55" stroke="#9fb6c6" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={streakA} />
        <RNAnimatedPath d="M 4 71 L 44 71" stroke="#9fb6c6" strokeWidth={2} strokeLinecap="round" fill="none" opacity={streakB} />
        <RNAnimatedPath d="M 12 87 L 46 87" stroke="#9fb6c6" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={streakC} />

        {/* Brake glow behind the tail (end-trip emphasis) */}
        <RNAnimatedCircle cx={44} cy={65} r={15} fill="url(#tailGlowGrad)" opacity={emphasis === 'taillight' ? tailGlow : 0.15} />

        {/* Body floats on its suspension; wheels stay planted */}
        <RNAnimatedG style={{ transform: [{ translateY: bodyBounce }] }}>
          <Path d={BODY_SILHOUETTE} fill="url(#paint)" />
          <Path d={BODY_SILHOUETTE} fill="url(#bodyShine)" />

          {/* Roof shark-fin antenna */}
          <Path d="M 76 25.5 L 81 19.5 L 85.5 25 Z" fill="#22303d" />

          {/* Greenhouse: dark base + glass + pillars + chrome beltline */}
          <Path
            d="M 60 46 C 70 36, 92 26, 122 22 C 152 20, 178 24, 202 36 L 214 46 Z"
            fill="#0a1017"
          />
          <Path
            d="M 63 45 C 73 36, 94 27, 122 23.5 C 150 21.5, 176 25.5, 199 36.5 L 210 45 Z"
            fill="url(#glass)"
          />
          <Path d="M 133 22.4 L 139 21.9 L 143.4 45.4 L 137 45.5 Z" fill="#04070d" />
          <Path
            d="M 58 46.5 C 110 42.5, 170 42, 214 45.2"
            stroke="#e2e8f0"
            strokeWidth={1.1}
            strokeOpacity={0.75}
            fill="none"
          />

          {/* Panel gaps + character lines */}
          <Path d="M 50 60 C 120 54.5, 200 54.5, 262 61.5" stroke="#ffffff" strokeWidth={0.7} strokeOpacity={0.3} fill="none" />
          <Path d="M 50 61.7 C 120 56.2, 200 56.2, 262 63.2" stroke="#000000" strokeWidth={0.7} strokeOpacity={0.12} fill="none" />
          <Path d="M 136 46 L 136 96" stroke="#000000" strokeWidth={0.7} strokeOpacity={0.22} fill="none" />
          <Path d="M 212 46 C 216 62, 221 80, 226 96" stroke="#000000" strokeWidth={0.7} strokeOpacity={0.22} fill="none" />

          {/* Chrome door handles */}
          <Path d="M 98 53 L 111 53" stroke="#dbe4ec" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M 152 53 L 165 53" stroke="#dbe4ec" strokeWidth={2.4} strokeLinecap="round" />

          {/* Side skirt shadow */}
          <Path d="M 62 90 C 120 87.5, 205 87.5, 268 90.5 L 271 96.6 L 59 96.6 Z" fill="#000000" opacity={0.1} />

          {/* ORVM */}
          <Path d="M 216 39 C 222 35.5, 230 36.5, 231.5 40.5 C 229.5 43.5, 222 44, 217.5 42.5 Z" fill="url(#paint)" />
          <Path d="M 216 39 C 222 35.5, 230 36.5, 231.5 40.5 C 229.5 43.5, 222 44, 217.5 42.5 Z" fill="url(#bodyShine)" opacity={0.5} />
          <Path d="M 221 38.6 C 225 37.4, 228 38, 229 40.2" stroke="#0a1017" strokeWidth={1} fill="none" />

          {/* Headlight cluster + projector */}
          <Path
            d="M 258 53.5 C 272 54.5, 285 60, 293 67.5 L 285.5 72.5 C 276.5 65.5, 265 61, 254.5 58.5 Z"
            fill="url(#headLamp)"
          />
          <Circle cx={281} cy={65.5} r={1.6} fill="#ffffff" opacity={0.9} />

          {/* Boomerang DRL: halo + core */}
          <RNAnimatedPath
            d="M 292.5 71.5 C 285 69.2, 276 69, 268.5 71.2"
            stroke="#7dd3fc"
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
            opacity={drlHalo}
          />
          <RNAnimatedPath
            d="M 292.5 71.5 C 285 69.2, 276 69, 268.5 71.2"
            stroke="#dff2fe"
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
            opacity={drlPulse}
          />

          {/* Low beam wash (start-trip emphasis) */}
          <RNAnimatedPath
            d="M 292 62 C 302 57, 312 53, 320 50.5 L 320 86 C 310 82, 300 76, 293 71 Z"
            fill="url(#beam)"
            opacity={emphasis === 'headlight' ? glowPulse : 0}
          />

          {/* Cascade grille sliver + fog lamp */}
          <Path d="M 294 79 C 297.5 82, 297.5 87, 293.5 90 L 284 91.5 C 288.5 87, 290.5 83, 291 79.5 Z" fill="#04070d" opacity={0.9} />
          <Circle cx={277} cy={84} r={2} fill="#cbd5e1" opacity={0.6} />

          {/* Wrap-around tail lamp */}
          <Path
            d="M 41.5 55 C 39 61, 39 68, 41.5 74.5 L 50 73.5 C 48 67, 48 61.5, 50.5 56.5 Z"
            fill="url(#tailLamp)"
          />
          <Path d="M 43.5 60 L 47.5 60.5" stroke="#fecaca" strokeWidth={1} strokeOpacity={0.5} />
        </RNAnimatedG>
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
