import { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = 'primary',
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;
  const palette = (() => {
    if (variant === 'secondary') {
      return {
        bg: colors.backgroundSecondary,
        text: colors.textPrimary,
        border: colors.border,
      };
    }

    if (variant === 'danger') {
      return {
        bg: colors.card,
        text: colors.textPrimary,
        border: colors.border,
      };
    }

    return { bg: colors.invertedBackground, text: colors.invertedText, border: colors.invertedBackground };
  })();

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
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => animateScale(0.98)}
        onPressOut={() => animateScale(1)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity: pressed ? 0.9 : 1,
          },
          isDisabled && styles.disabled,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
