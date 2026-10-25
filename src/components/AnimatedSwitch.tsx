/**
 * AnimatedSwitch.tsx
 * Compact pill switch with a springy knob and track that cross-fades into
 * the active accent color — all on the UI thread.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';

type AnimatedSwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accent: string;
  accessibilityLabel?: string;
};

const TRACK_W = 48;
const TRACK_H = 29;
const KNOB = 23;
const TRAVEL = TRACK_W - KNOB - 6; // 3px inset on each side

export function AnimatedSwitch({ value, onChange, accent, accessibilityLabel }: AnimatedSwitchProps) {
  const { colors } = useAppTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 320, mass: 0.55 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.backgroundSecondary, accent]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, accent]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, TRAVEL]) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Animated.View style={[styles.check, checkStyle]}>
            <MaterialIcons name="check" size={14} color={accent} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  check: {
    position: 'absolute',
  },
});
