import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';

type AnimatedCarSvgProps = {
  width?: number;
  height?: number;
  animate?: boolean;
  accentColor?: string; // Internally overridden for accurate Spark Green Pearl
};

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export function AnimatedCarSvg({
  width = 280,
  height = 100,
  animate = true,
}: AnimatedCarSvgProps) {
  const { isDark } = useAppTheme();

  // Animation Values
  const bodyBounce = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const drlOpacity = useRef(new Animated.Value(0)).current;

  // Accurate Spark Green Pearl Colors
  const sparkGreenHighlight = '#a9c2b6';
  const sparkGreenBase = '#6b8679';
  const sparkGreenShadow = '#3f564c';

  const wheelDark = isDark ? '#0f172a' : '#1e293b';
  const rimMetal = isDark ? '#94a3b8' : '#cbd5e1';

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    if (!animate) return;

    // Realistic suspension bounce
    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bodyBounce, {
          toValue: -1.5,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bodyBounce, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Glowing Boomerang LED pulse
    const drlAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(drlOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drlOpacity, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnim.start();
    drlAnim.start();

    return () => {
      bounceAnim.stop();
      drlAnim.stop();
    };
  }, [animate, bodyBounce, fadeIn, drlOpacity]);

  // Diamond Cut Alloy Spoke
  const renderSpoke = (cx: number, cy: number, rotation: number) => (
    <Path
      key={`${cx}-${cy}-${rotation}`}
      transform={`rotate(${rotation} ${cx} ${cy})`}
      d={`M ${cx} ${cy} L ${cx - 3} ${cy - 10} L ${cx + 4} ${cy - 12} L ${cx + 3} ${cy - 2} Z`}
      fill={rimMetal}
      opacity={0.85}
    />
  );

  return (
    <Animated.View style={[styles.container, { width, height, opacity: fadeIn }]}>
      <Svg width={width} height={height} viewBox="0 0 280 100">
        <Defs>
          {/* Spark Green Pearl Base Paint */}
          <LinearGradient id="sparkGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={sparkGreenHighlight} />
            <Stop offset="45%" stopColor={sparkGreenBase} />
            <Stop offset="100%" stopColor={sparkGreenShadow} />
          </LinearGradient>

          {/* Body Sculpting / Shading */}
          <LinearGradient id="bodyShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
            <Stop offset="25%" stopColor="#ffffff" stopOpacity={0.05} />
            <Stop offset="55%" stopColor="#000000" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.7} />
          </LinearGradient>

          {/* Window Reflection */}
          <LinearGradient id="glassShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.4} />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.0} />
            <Stop offset="100%" stopColor="#020617" stopOpacity={0.9} />
          </LinearGradient>
        </Defs>

        {/* 1. Ground Shadows */}
        <Ellipse cx="140" cy="81" rx="95" ry="4" fill="black" opacity={isDark ? 0.6 : 0.3} />

        {/* 2. Static Layer: Dark Wheel Wells */}
        {/* Layered behind the wheels to provide depth when the car bounces */}
        <Circle cx="85" cy="80" r="19" fill="#020617" />
        <Circle cx="195" cy="80" r="19" fill="#020617" />

        {/* 3. Static Layer: Wheels & Alloys */}
        {/* Rear Wheel */}
        <G>
          <Circle cx="85" cy="80" r="16" fill="#0f172a" />
          <Circle cx="85" cy="80" r="12" fill="#1e293b" />
          <Circle cx="85" cy="80" r="8" fill="none" stroke="#64748b" strokeWidth="1.5" />
          <Circle cx="85" cy="80" r="12" fill={wheelDark} />
          {renderSpoke(85, 80, 0)}
          {renderSpoke(85, 80, 90)}
          {renderSpoke(85, 80, 180)}
          {renderSpoke(85, 80, 270)}
          <Circle cx="85" cy="80" r="2.5" fill="#0f172a" />
        </G>

        {/* Front Wheel */}
        <G>
          <Circle cx="195" cy="80" r="16" fill="#0f172a" />
          <Circle cx="195" cy="80" r="12" fill="#1e293b" />
          <Circle cx="195" cy="80" r="8" fill="none" stroke="#64748b" strokeWidth="1.5" />
          <Circle cx="195" cy="80" r="12" fill={wheelDark} />
          {renderSpoke(195, 80, 0)}
          {renderSpoke(195, 80, 90)}
          {renderSpoke(195, 80, 180)}
          {renderSpoke(195, 80, 270)}
          <Circle cx="195" cy="80" r="2.5" fill="#0f172a" />
        </G>

        {/* 4. Animated Layer: Car Body & Structure */}
        <AnimatedG style={{ transform: [{ translateY: bodyBounce }] }}>

          {/* Main Car Silhouette with precise Arch Cutouts */}
          <Path
            d="
              M 50 80 
              L 50 50 
              Q 55 30, 80 20 
              Q 120 12, 150 20 
              L 185 45 
              C 210 48, 225 52, 230 55 
              C 235 60, 230 75, 225 80 
              L 215 80 
              A 20 20 0 0 0 175 80 
              L 105 80 
              A 20 20 0 0 0 65 80 
              Z
            "
            fill="url(#sparkGreen)"
          />

          {/* Shading Overlay on exact same path */}
          <Path
            d="M 50 80 L 50 50 Q 55 30, 80 20 Q 120 12, 150 20 L 185 45 C 210 48, 225 52, 230 55 C 235 60, 230 75, 225 80 L 215 80 A 20 20 0 0 0 175 80 L 105 80 A 20 20 0 0 0 65 80 Z"
            fill="url(#bodyShine)"
          />

          {/* Roof Shark Fin */}
          <Path d="M 80 20 L 85 15 L 90 20 Z" fill="url(#sparkGreen)" />

          {/* Windows / Greenhouse Area */}
          <Path d="M 75 42 L 85 24 L 145 24 L 178 45 L 125 45 Z" fill="#020617" />
          <Path d="M 75 42 L 85 24 L 145 24 L 178 45 L 125 45 Z" fill="url(#glassShine)" />

          {/* Blacked-out B-Pillar */}
          <Path d="M 125 24 L 132 24 L 126 45 L 118 45 Z" fill="#020617" />

          {/* Floating Roof C-Pillar Garnish */}
          <Path d="M 68 45 L 75 42 L 85 24 L 62 38 Z" fill="#020617" />
          <Path d="M 68 45 L 75 42 L 85 24 L 62 38 Z" fill="url(#glassShine)" />

          {/* Aggressive Cascading Front Grille */}
          <Path d="M 226 58 C 235 60, 230 76, 220 78 L 210 78 C 210 70, 215 58, 226 58 Z" fill="#020617" />
          {/* Subtle grille mesh pattern */}
          <Path d="M 215 62 L 225 62 M 212 66 L 227 66 M 210 70 L 226 70 M 210 74 L 222 74" stroke="#1e293b" strokeWidth="1.5" />

          {/* Headlights */}
          <Path d="M 195 48 C 210 46, 220 48, 225 50 C 220 54, 210 52, 195 50 Z" fill="#e2e8f0" />
          <Path d="M 195 48 C 210 46, 220 48, 225 50 C 220 54, 210 52, 195 50 Z" fill="url(#glassShine)" />
          <Circle cx="218" cy="50" r="1.5" fill="#ffffff" />

          {/* Animated Boomerang DRL - Opacity moved to direct prop */}
          <AnimatedPath
            d="M 226 62 L 222 66 L 225 70"
            fill="none"
            stroke="#cffafe"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={animate ? drlOpacity : 0.8}
          />

          {/* Tail lights */}
          <Path d="M 50 46 L 56 46 L 58 50 L 50 49 Z" fill="#dc2626" />
          <Path d="M 50 48 L 56 48" stroke="#fecaca" strokeWidth="1" />

          {/* Side Mirror (ORVM) */}
          <Path d="M 172 43 C 180 41, 185 43, 180 46 C 175 46, 172 44, 172 43 Z" fill="url(#sparkGreen)" />
          <Path d="M 172 43 C 180 41, 185 43, 180 46 C 175 46, 172 44, 172 43 Z" fill="url(#bodyShine)" opacity={0.6} />

          {/* Panel Gaps & Character Lines */}
          <Path d="M 50 45 Q 140 43, 220 49" stroke="#ffffff" strokeWidth="0.5" fill="none" opacity={0.3} />
          <Path d="M 50 46 Q 140 44, 220 50" stroke="#000000" strokeWidth="0.5" fill="none" opacity={0.15} />

          {/* Door Cutlines */}
          <Path d="M 122 45 L 122 78" stroke="#000000" strokeWidth="0.6" opacity={0.25} fill="none" />
          <Path d="M 75 42 C 75 55, 70 65, 65 79" stroke="#000000" strokeWidth="0.6" opacity={0.25} fill="none" />

          {/* Chrome Handles */}
          <Path d="M 85 44 L 95 44" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M 135 44 L 145 44" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />

        </AnimatedG>
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