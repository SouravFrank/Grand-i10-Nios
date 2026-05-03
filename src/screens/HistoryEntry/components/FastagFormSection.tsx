import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';

type FastagFormData = { odometer: string; tollAmount: string; tollLocation: string; isSharedTrip: boolean; };
interface FastagFormSectionProps { control: Control<FastagFormData>; errors: FieldErrors<FastagFormData>; lastOdometer: number; isDark: boolean; colors: any; }

export function FastagFormSection({ control, errors, lastOdometer, isDark, colors }: FastagFormSectionProps) {
  return (
    <>
      <View style={styles.fieldsGroup}>
        <Controller control={control} name="odometer" render={({ field: { onChange, value } }) => (
          <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.odoHead}>
              <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>Odometer</Text>
              <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>Previous {lastOdometer} km</Text>
            </View>
            <OdometerDigitInput label="Current Odometer" value={value} onChangeText={onChange} error={(errors as any).odometer?.message} />
          </View>
        )} />
      </View>
      <View style={styles.fieldsGroup}>
        <Controller control={control} name="tollLocation" render={({ field: { onChange, value } }) => (
          <AppTextField label="Toll Location" value={value ?? ''} onChangeText={onChange} placeholder="e.g. Expressway" error={(errors as any).tollLocation?.message} />
        )} />
        <Controller control={control} name="tollAmount" render={({ field: { onChange, value } }) => (
          <AppTextField label="Toll Amount (Rs)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 85" error={(errors as any).tollAmount?.message} />
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