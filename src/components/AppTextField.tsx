import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type AppTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  error?: string;
  autoCapitalize?: 'none' | 'sentences';
  editable?: boolean;
};

export function AppTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  error,
  autoCapitalize = 'none',
  editable = true,
}: AppTextFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: colors.card,
          },
          error && { borderColor: colors.textSecondary },
          !editable && { backgroundColor: colors.backgroundSecondary },
        ]}
      />
      {error ? <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 2,
    height: 46,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 12,
  },
});
