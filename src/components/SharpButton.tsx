import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type SharpButtonProps = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconOnly?: boolean;
  textBelowIcon?: boolean;
};

export function SharpButton({
  label,
  onPress,
  disabled = false,
  style,
  variant = 'primary',
  iconName,
  iconOnly = false,
  textBelowIcon = false,
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
          textBelowIcon && styles.textBelowIconButton,
          {
            backgroundColor: variant === 'primary' ? colors.invertedBackground : 'transparent',
            borderColor: variant === 'primary' ? colors.invertedBackground : colors.textPrimary,
            opacity: pressed ? 0.9 : 1,
          },
          disabled && styles.disabled,
        ]}>
        <View style={[
            styles.contentRow, 
            iconOnly && styles.iconOnlyContent,
            textBelowIcon && styles.textBelowIconContent
          ]}>
          {iconName ? (
            <MaterialCommunityIcons
              name={iconName}
              size={20}
              color={variant === 'primary' ? colors.invertedText : colors.textPrimary}
            />
          ) : null}
          {!iconOnly && label && !textBelowIcon ? (
            <Text
              style={[
                styles.label,
                {
                  color: variant === 'primary' ? colors.invertedText : colors.textPrimary,
                },
              ]}>
              {label}
            </Text>
          ) : null}
          {textBelowIcon && label ? (
            <Text
              style={[
                styles.smallLabel,
                {
                  color: variant === 'primary' ? colors.invertedText : colors.textPrimary,
                },
              ]}>
              {label}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  textBelowIconButton: {
    height: 64,
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconOnlyContent: {
    gap: 0,
  },
  textBelowIconContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
