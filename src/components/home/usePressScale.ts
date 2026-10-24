import { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Shared press feedback for tappable cards: slight shrink while pressed.
export function usePressScale(pressedScale = 0.98) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = useCallback(
    (value: number) => {
      Animated.timing(scale, {
        toValue: value,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  return {
    scale,
    onPressIn: () => animateScale(pressedScale),
    onPressOut: () => animateScale(1),
  };
}
