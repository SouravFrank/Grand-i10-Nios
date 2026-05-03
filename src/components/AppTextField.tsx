import { StyleProp, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';

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
  inputStyle?: StyleProp<TextStyle>;
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
  inputStyle,
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
            color: colors.textPrimary,
            // Flat, borderless design using the secondary background tint
            backgroundColor: colors.backgroundSecondary, 
          },
          // Only show a border if there is an error
          error && { borderWidth: 1, borderColor: '#EF4444' }, 
          // Dim the field if it is disabled
          !editable && { opacity: 0.6 }, 
          inputStyle,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase', // Matches the telemetry aesthetic
  },
  input: {
    borderRadius: 16, // Beautiful, modern rounded corners
    height: 52, // Slightly taller for a premium, touchable feel
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800', // Bold numbers to look like digital readouts
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444', // Modern red for errors
    marginTop: -2,
  },
});