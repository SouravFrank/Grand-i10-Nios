import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Platform, Pressable, Switch, Text, View } from 'react-native';

import { AppTextField } from '@/components/AppTextField';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';
import { dayjs, INDIA_DATE_FORMAT } from '@/utils/day';

type AnnualPassFormData = {
  odometer: string;
  annualPassType: 'purchase' | 'deduction';
  passAmount: string;
  passExpiryDate?: Date;
  passMaxTrips?: string;
  passCrossings?: string;
  passTollValue?: string;
  isSharedTrip: boolean;
};

interface AnnualPassFormSectionProps {
  control: Control<AnnualPassFormData>;
  errors: FieldErrors<AnnualPassFormData>;
  isDark: boolean;
  colors: ThemeColors;
}

const PASS_ACCENT = '#6366F1';

export function AnnualPassFormSection({ control, errors, isDark, colors }: AnnualPassFormSectionProps) {
  const [isExpiryPickerVisible, setIsExpiryPickerVisible] = useState(false);

  return (
    <Controller
      control={control}
      name="annualPassType"
      defaultValue="purchase"
      render={({ field: { onChange: onTypeChange, value: typeValue } }) => {
        const currentType = typeValue || 'purchase';
        const isPurchase = currentType === 'purchase';

        return (
          <>
            <View style={styles.fieldsGroup}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Annual Pass Record Type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => onTypeChange('purchase')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: isPurchase ? `${PASS_ACCENT}18` : colors.backgroundSecondary,
                    borderWidth: 1.5,
                    borderColor: isPurchase ? PASS_ACCENT : colors.border,
                  }}>
                  <MaterialCommunityIcons name="wallet-membership" size={18} color={isPurchase ? PASS_ACCENT : colors.textPrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isPurchase ? PASS_ACCENT : colors.textPrimary }}>
                    Pass Purchase
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onTypeChange('deduction')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: !isPurchase ? `${PASS_ACCENT}18` : colors.backgroundSecondary,
                    borderWidth: 1.5,
                    borderColor: !isPurchase ? PASS_ACCENT : colors.border,
                  }}>
                  <MaterialCommunityIcons name="road-variant" size={18} color={!isPurchase ? PASS_ACCENT : colors.textPrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: !isPurchase ? PASS_ACCENT : colors.textPrimary }}>
                    Toll Deduction
                  </Text>
                </Pressable>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', lineHeight: 16 }}>
                {isPurchase
                  ? 'NHAI FASTag Annual Pass: ₹3,000 for 200 toll crossings or 1 year validity, whichever ends first. The fee is debited from the FASTag wallet.'
                  : 'Log toll crossings consumed from the pass. Crossings are counted against the 200 limit — no money is charged.'}
              </Text>
            </View>

            {isPurchase ? (
              <>
                <View style={styles.fieldsGroup}>
                  <Controller
                    control={control}
                    name="passAmount"
                    render={({ field: { onChange, value } }) => (
                      <AppTextField
                        label="Pass Amount (₹)"
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 3000"
                        error={errors.passAmount?.message as string | undefined}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="passMaxTrips"
                    render={({ field: { onChange, value } }) => (
                      <AppTextField
                        label="Max Toll Crossings"
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="e.g. 200"
                        error={errors.passMaxTrips?.message as string | undefined}
                      />
                    )}
                  />
                </View>

                <View style={styles.fieldsGroup}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Expiry Date</Text>
                  <Controller
                    control={control}
                    name="passExpiryDate"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Pressable
                          onPress={() => setIsExpiryPickerVisible(true)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            borderRadius: 14,
                            backgroundColor: colors.backgroundSecondary,
                          }}>
                          <MaterialCommunityIcons name="calendar-clock" size={20} color={PASS_ACCENT} />
                          <View style={{ gap: 2 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Valid till</Text>
                            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                              {value ? dayjs(value).format(INDIA_DATE_FORMAT) : 'Select expiry date'}
                            </Text>
                          </View>
                        </Pressable>
                        {isExpiryPickerVisible && (
                          <DateTimePicker
                            value={value ?? new Date()}
                            mode="date"
                            accentColor={Platform.OS === 'ios' ? colors.textPrimary : (isDark ? '#60A5FA' : '#2563EB')}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                              if (selectedDate) onChange(selectedDate);
                              setIsExpiryPickerVisible(false);
                            }}
                            positiveButton={Platform.OS === 'android' ? { label: 'OK', textColor: isDark ? '#60A5FA' : '#2563EB' } : undefined}
                            negativeButton={Platform.OS === 'android' ? { label: 'Cancel', textColor: isDark ? '#94A3B8' : '#64748B' } : undefined}
                            textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                            themeVariant={isDark ? 'dark' : 'light'}
                          />
                        )}
                        {errors.passExpiryDate && <Text style={styles.selectionError}>{errors.passExpiryDate.message as string}</Text>}
                      </>
                    )}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldsGroup}>
                  <Controller
                    control={control}
                    name="passCrossings"
                    render={({ field: { onChange, value } }) => (
                      <AppTextField
                        label="Crossings Used"
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="e.g. 1"
                        error={errors.passCrossings?.message as string | undefined}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="passTollValue"
                    render={({ field: { onChange, value } }) => (
                      <AppTextField
                        label="Toll Value Covered (₹, optional)"
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 85"
                        error={errors.passTollValue?.message as string | undefined}
                      />
                    )}
                  />
                </View>

                <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Trip</Text>
                    <Text style={[styles.switchHint, { color: colors.textSecondary }]}>Mark if the crossing was on a shared trip</Text>
                  </View>
                  <Controller
                    control={control}
                    name="isSharedTrip"
                    render={({ field: { onChange: onSharedChange, value: sharedValue } }) => (
                      <Switch
                        value={sharedValue}
                        onValueChange={onSharedChange}
                        trackColor={{ false: colors.border, true: PASS_ACCENT }}
                        thumbColor={sharedValue ? '#fff' : colors.textSecondary}
                      />
                    )}
                  />
                </View>
              </>
            )}
          </>
        );
      }}
    />
  );
}
