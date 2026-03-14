import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type OdometerDigitInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

const DIGIT_SLOTS = 6;

export function OdometerDigitInput({
  label,
  value,
  onChangeText,
  error,
}: OdometerDigitInputProps) {
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const [hasEdited, setHasEdited] = useState(false);

  const sanitizedValue = useMemo(
    () => value.replace(/\D/g, '').slice(0, DIGIT_SLOTS),
    [value],
  );
  const inputValue = useMemo(
    () => (hasEdited ? sanitizedValue : sanitizedValue.padStart(DIGIT_SLOTS, '0')),
    [hasEdited, sanitizedValue],
  );
  const digitSlots = useMemo(
    () =>
      hasEdited
        ? Array.from({ length: DIGIT_SLOTS }, (_, index) => sanitizedValue[index] ?? '')
        : Array.from(sanitizedValue.padStart(DIGIT_SLOTS, '0')),
    [hasEdited, sanitizedValue],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.digitShell,
          {
            borderColor: error ? colors.textSecondary : colors.border,
            backgroundColor: colors.card,
          },
        ]}>
        <TextInput
          ref={inputRef}
          value={inputValue}
          onChangeText={(nextValue) => {
            setHasEdited(true);
            onChangeText(nextValue.replace(/\D/g, '').slice(0, DIGIT_SLOTS));
          }}
          keyboardType="number-pad"
          maxLength={DIGIT_SLOTS}
          style={styles.hiddenInput}
          caretHidden
        />

        <View style={styles.digitRow}>
          {digitSlots.map((digit, index) => (
            <View
              key={`${label}-${index}`}
              style={[styles.digitBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.digitText, { color: colors.textPrimary }]}>
                {digit || '_'}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
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
  digitShell: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  digitRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  digitBox: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  errorText: {
    fontSize: 12,
  },
});
