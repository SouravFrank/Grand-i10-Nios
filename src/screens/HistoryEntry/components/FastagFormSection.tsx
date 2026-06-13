import { AppTextField } from '@/components/AppTextField';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';

type FastagFormData = { odometer: string; tollAmount: string; tollLocation: string; isSharedTrip: boolean; };
interface FastagFormSectionProps { control: Control<FastagFormData>; errors: FieldErrors<FastagFormData>; lastOdometer: number; isDark: boolean; colors: ThemeColors; }

export function FastagFormSection({ control, errors, lastOdometer, isDark, colors }: FastagFormSectionProps) {
  return (
    <>
      <View style={styles.fieldsGroup}>
        <Controller control={control} name="tollLocation" render={({ field: { onChange, value } }) => (
          <AppTextField label="Toll Location" value={value ?? ''} onChangeText={onChange} placeholder="e.g. Expressway" error={errors.tollLocation?.message as string | undefined} />
        )} />
        <Controller control={control} name="tollAmount" render={({ field: { onChange, value } }) => (
          <AppTextField label="Toll Amount (Rs)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 85" error={errors.tollAmount?.message as string | undefined} />
        )} />
      </View>
      <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.switchCopy}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Shared Trip</Text>
          <Text style={[styles.switchHint, { color: colors.textSecondary }]}>Mark if shared</Text>
        </View>
        <Controller control={control} name="isSharedTrip" render={({ field: { onChange, value } }) => (
          <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={value ? '#fff' : colors.textSecondary} />
        )} />
      </View>
    </>
  );
}