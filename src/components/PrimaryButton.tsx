import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

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
  const isDisabled = disabled || loading;
  const palette =
    variant === 'secondary'
      ? { bg: colors.muted, text: colors.textPrimary }
      : variant === 'danger'
        ? { bg: colors.danger, text: '#FFFFFF' }
        : { bg: colors.primary, text: '#FFFFFF' };

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: pressed ? 0.8 : 1 },
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? <ActivityIndicator color={palette.text} size="small" /> : <Text style={[styles.text, { color: palette.text }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
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
