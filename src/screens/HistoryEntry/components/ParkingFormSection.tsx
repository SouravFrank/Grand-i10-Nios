import { AppTextField } from '@/components/AppTextField';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';

type ParkingFormData = { odometer: string; parkingAmount: string; parkingLocation: string; isSharedTrip: boolean; };
interface ParkingFormSectionProps { control: Control<ParkingFormData>; errors: FieldErrors<ParkingFormData>; lastOdometer: number; isDark: boolean; colors: ThemeColors; }

export function ParkingFormSection({ control, errors, lastOdometer, isDark, colors }: ParkingFormSectionProps) {
  return (
    <>
      <View style={styles.fieldsGroup}>
        <Controller control={control} name="parkingLocation" render={({ field: { onChange, value } }) => (
          <AppTextField label="Parking Location" value={value ?? ''} onChangeText={onChange} placeholder="e.g. Mall Parking" error={errors.parkingLocation?.message as string | undefined} />
        )} />
        <Controller control={control} name="parkingAmount" render={({ field: { onChange, value } }) => (
          <AppTextField label="Amount (Rs)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 50" error={errors.parkingAmount?.message as string | undefined} />
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