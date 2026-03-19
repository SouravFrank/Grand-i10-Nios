import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';

type SpeedometerWidgetProps = {
  /** Speed value to display (0-220) */
  speed: number;
  /** Label shown below the speed value */
  label?: string;
  /** Size of the widget */
  size?: number;
};

/**
 * An animated speedometer/gauge SVG widget.
 * Uses a static needle positioned at the correct angle via SVG transform.
 * Shows major tick marks, a gradient arc, and a speed display.
 */
export function SpeedometerWidget({ speed, label = 'km/h', size = 160 }: SpeedometerWidgetProps) {
  const { colors, isDark } = useAppTheme();
  const needleAngle = useRef(new Animated.Value(135)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Speedometer arc: 135° to 405° (270° sweep)
  const MIN_ANGLE = 135;
  const MAX_ANGLE = 405;
  const MAX_SPEED = 220;

  const targetAngle = MIN_ANGLE + ((Math.min(speed, MAX_SPEED) / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(needleAngle, {
        toValue: targetAngle,
        useNativeDriver: false, // SVG transforms don't support native driver
        tension: 30,
        friction: 12,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [targetAngle, needleAngle, fadeIn]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const tickRadius = radius + size * 0.06;

  // Generate tick marks
  const ticks = [];
  const tickCount = 11;
  for (let i = 0; i < tickCount; i++) {
    const angle = MIN_ANGLE + (i / (tickCount - 1)) * (MAX_ANGLE - MIN_ANGLE);
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * (radius - size * 0.02);
    const y1 = cy + Math.sin(rad) * (radius - size * 0.02);
    const x2 = cx + Math.cos(rad) * tickRadius;
    const y2 = cy + Math.sin(rad) * tickRadius;

    const labelR = tickRadius + size * 0.06;
    const lx = cx + Math.cos(rad) * labelR;
    const ly = cy + Math.sin(rad) * labelR;

    ticks.push(
      <G key={`tick-${i}`}>
        <Line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
          strokeWidth={i % 2 === 0 ? 2 : 1}
          strokeLinecap="round"
        />
        {i % 2 === 0 ? (
          <SvgText
            x={lx}
            y={ly}
            fill={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
            fontSize={size * 0.055}
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {Math.round((i / (tickCount - 1)) * MAX_SPEED)}
          </SvgText>
        ) : null}
      </G>
    );
  }

  // Arc path (background)
  const arcStartRad = (MIN_ANGLE * Math.PI) / 180;
  const arcEndRad = (MAX_ANGLE * Math.PI) / 180;
  const arcX1 = cx + Math.cos(arcStartRad) * radius;
  const arcY1 = cy + Math.sin(arcStartRad) * radius;
  const arcX2 = cx + Math.cos(arcEndRad) * radius;
  const arcY2 = cy + Math.sin(arcEndRad) * radius;

  // Needle color based on speed
  const needleColor = speed > 160 ? '#EF4444' : speed > 100 ? '#F59E0B' : '#10B981';

  // Compute the static needle end point using the final angle
  const needleRad = (targetAngle * Math.PI) / 180;
  const needleLen = radius * 0.85;
  const nx = cx + Math.cos(needleRad) * needleLen;
  const ny = cy + Math.sin(needleRad) * needleLen;

  return (
    <Animated.View style={[styles.container, { width: size, height: size, opacity: fadeIn }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#EF4444" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius + size * 0.08}
          fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
        />

        {/* Arc track */}
        <Path
          d={`M ${arcX1} ${arcY1} A ${radius} ${radius} 0 1 1 ${arcX2} ${arcY2}`}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          strokeWidth={size * 0.025}
          strokeLinecap="round"
          fill="none"
        />

        {/* Colored arc */}
        <Path
          d={`M ${arcX1} ${arcY1} A ${radius} ${radius} 0 1 1 ${arcX2} ${arcY2}`}
          stroke="url(#arcGrad)"
          strokeWidth={size * 0.018}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />

        {/* Tick marks */}
        {ticks}

        {/* Needle */}
        <Line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={needleColor}
          strokeWidth={size * 0.018}
          strokeLinecap="round"
        />
        {/* Needle glow */}
        <Line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={needleColor}
          strokeWidth={size * 0.035}
          strokeLinecap="round"
          opacity={0.2}
        />

        {/* Center hub */}
        <Circle
          cx={cx}
          cy={cy}
          r={size * 0.04}
          fill={needleColor}
          opacity={0.9}
        />

        {/* Speed text */}
        <SvgText
          x={cx}
          y={cy + size * 0.14}
          fill={colors.textPrimary}
          fontSize={size * 0.18}
          fontWeight="900"
          textAnchor="middle"
        >
          {speed}
        </SvgText>

        <SvgText
          x={cx}
          y={cy + size * 0.22}
          fill={colors.textSecondary}
          fontSize={size * 0.065}
          fontWeight="600"
          textAnchor="middle"
          letterSpacing={1}
        >
          {label}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
