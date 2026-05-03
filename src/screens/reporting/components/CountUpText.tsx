import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';

export function CountUpText({
  value,
  formatter,
  style,
}: {
  value: number;
  formatter: (value: number) => string;
  style?: StyleProp<TextStyle>;
}) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const id = animatedValue.addListener(({ value: nextValue }) => {
      setDisplayValue(nextValue);
    });

    return () => {
      animatedValue.removeListener(id);
    };
  }, [animatedValue]);

  useEffect(() => {
    animatedValue.stopAnimation();
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedValue, value]);

  return <Text style={style}>{formatter(displayValue)}</Text>;
}
