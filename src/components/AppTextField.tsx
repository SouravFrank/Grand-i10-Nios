import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

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
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[styles.input, error && styles.errorInput, !editable && styles.disabledInput]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  disabledInput: {
    backgroundColor: colors.muted,
  },
  errorInput: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
});
