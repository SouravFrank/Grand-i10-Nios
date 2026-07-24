import { AppTextField } from '@/components/AppTextField';
import { FastagBrandIcon } from '@/components/FastagBrandIcon';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Pressable, Switch, Text, View } from 'react-native';

type FastagFormData = {
  odometer: string;
  tollAmount: string;
  tollLocation?: string;
  isSharedTrip: boolean;
  fasttagType?: 'toll_paid' | 'recharge';
};

interface FastagFormSectionProps {
  control: Control<FastagFormData>;
  errors: FieldErrors<FastagFormData>;
  lastOdometer: number;
  isDark: boolean;
  colors: ThemeColors;
}

export function FastagFormSection({ control, errors, isDark, colors }: FastagFormSectionProps) {
  return (
    <Controller
      control={control}
      name="fasttagType"
      defaultValue="toll_paid"
      render={({ field: { onChange, value } }) => {
        const currentType = value || 'toll_paid';
        const isRecharge = currentType === 'recharge';

        return (
          <>
            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FASTag Record Type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => onChange('toll_paid')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: !isRecharge ? `${colors.primary}18` : colors.backgroundSecondary,
                    borderWidth: 1.5,
                    borderColor: !isRecharge ? colors.primary : colors.border,
                  }}>
                  <FastagBrandIcon size={18} color={!isRecharge ? colors.primary : colors.textPrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: !isRecharge ? colors.primary : colors.textPrimary }}>
                    Toll Paid
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onChange('recharge')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: isRecharge ? '#F9731618' : colors.backgroundSecondary,
                    borderWidth: 1.5,
                    borderColor: isRecharge ? '#F97316' : colors.border,
                  }}>
                  <FastagBrandIcon size={18} color={isRecharge ? '#F97316' : colors.textPrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isRecharge ? '#F97316' : colors.textPrimary }}>
                    Recharge
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldsGroup}>
              <Controller
                control={control}
                name="tollAmount"
                render={({ field: { onChange: onAmountChange, value: amountValue } }) => (
                  <AppTextField
                    label={isRecharge ? 'Recharge Amount (₹)' : 'Toll Amount (₹)'}
                    value={amountValue ?? ''}
                    onChangeText={onAmountChange}
                    keyboardType="decimal-pad"
                    placeholder={isRecharge ? 'e.g. 1000' : 'e.g. 85'}
                    error={errors.tollAmount?.message as string | undefined}
                  />
                )}
              />
            </View>

            {!isRecharge && (
              <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Trip</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>Mark if toll was paid on a shared trip</Text>
                </View>
                <Controller
                  control={control}
                  name="isSharedTrip"
                  render={({ field: { onChange: onSharedChange, value: sharedValue } }) => (
                    <Switch
                      value={sharedValue}
                      onValueChange={onSharedChange}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={sharedValue ? '#fff' : colors.textSecondary}
                    />
                  )}
                />
              </View>
            )}
          </>
        );
      }}
    />
  );
}