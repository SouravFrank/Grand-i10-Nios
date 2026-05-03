import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

export function MotionCard({
  children,
  delay = 0,
  style,
}: PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(progress, {
        toValue: 1,
        speed: 14,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
