import { AppTextField } from '@/components/AppTextField';
import { FastagBrandIcon } from '@/components/FastagBrandIcon';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';
import { Control, Controller, FieldErrors, UseFormWatch } from 'react-hook-form';
import { Pressable, Switch, Text, View } from 'react-native';

type FastagFormData = {
  odometer: string;
  tollAmount: string;
  tollLocation: string;
  isSharedTrip: boolean;
  fasttagType?: 'toll_paid' | 'recharge';
};

interface FastagFormSectionProps {
  control: Control<FastagFormData>;
  errors: FieldErrors<FastagFormData>;
  lastOdometer: number;
  isDark: boolean;
  colors: ThemeColors;
  watch: UseFormWatch<any>;
  setValue: (name: string, value: any, options?: any) => void;
}

export function FastagFormSection({ control, errors, isDark, colors, watch, setValue }: FastagFormSectionProps) {
  const fasttagType = watch('fasttagType') || 'toll_paid';
  const isRecharge = fasttagType === 'recharge';

  return (
    <>
      <View style={styles.fieldsGroup}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FASTag Record Type</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => setValue('fasttagType', 'toll_paid', { shouldValidate: true, shouldDirty: true })}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: !isRecharge ? `${colors.primary}18` : colors.backgroundSecondary,
              borderWidth: 1.5,
              borderColor: !isRecharge ? colors.primary : 'transparent',
            }}>
            <FastagBrandIcon size={18} color={!isRecharge ? colors.primary : colors.textPrimary} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: !isRecharge ? colors.primary : colors.textPrimary }}>
              Toll Paid
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setValue('fasttagType', 'recharge', { shouldValidate: true, shouldDirty: true })}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: isRecharge ? '#F9731618' : colors.backgroundSecondary,
              borderWidth: 1.5,
              borderColor: isRecharge ? '#F97316' : 'transparent',
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
          name="tollLocation"
          render={({ field: { onChange, value } }) => (
            <AppTextField
              label={isRecharge ? 'Recharge Title / Note' : 'Toll Location'}
              value={value ?? ''}
              onChangeText={onChange}
              placeholder={isRecharge ? 'e.g. FASTag Recharge' : 'e.g. Expressway Toll'}
              error={errors.tollLocation?.message as string | undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="tollAmount"
          render={({ field: { onChange, value } }) => (
            <AppTextField
              label={isRecharge ? 'Recharge Amount (₹)' : 'Toll Amount (₹)'}
              value={value ?? ''}
              onChangeText={onChange}
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
            render={({ field: { onChange, value } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={value ? '#fff' : colors.textSecondary}
              />
            )}
          />
        </View>
      )}
    </>
  );
}