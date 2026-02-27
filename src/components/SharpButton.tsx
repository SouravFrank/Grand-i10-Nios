import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type SharpButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function SharpButton({ label, onPress, disabled = false, style }: SharpButtonProps) {
  const { colors } = useAppTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const animateScale = (value: number) => {
    Animated.timing(scaleValue, {
      toValue: value,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => animateScale(0.98)}
        onPressOut={() => animateScale(1)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.invertedBackground,
            borderColor: colors.invertedBackground,
            opacity: pressed ? 0.9 : 1,
          },
          disabled && styles.disabled,
          style,
        ]}>
        <Text
          style={[
            styles.label,
            {
              color: colors.invertedText,
            },
          ]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
