import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type SharpButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
};

export function SharpButton({
  label,
  onPress,
  disabled = false,
  style,
  variant = 'primary',
}: SharpButtonProps) {
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
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => animateScale(0.98)}
        onPressOut={() => animateScale(1)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: variant === 'primary' ? colors.invertedBackground : 'transparent',
            borderColor: variant === 'primary' ? colors.invertedBackground : colors.textPrimary,
            opacity: pressed ? 0.9 : 1,
          },
          disabled && styles.disabled,
        ]}>
        <Text
          style={[
            styles.label,
            {
              color: variant === 'primary' ? colors.invertedText : colors.textPrimary,
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
    width: '100%',
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
