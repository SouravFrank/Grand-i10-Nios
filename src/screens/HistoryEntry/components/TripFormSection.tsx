import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';

import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { ThemeColors } from '@/theme/colors';

type TripFormData = { startOdometer: string; endOdometer: string; isSharedTrip: boolean; };
interface TripFormSectionProps { control: Control<TripFormData>; errors: FieldErrors<TripFormData>; lastOdometer: number; isDark: boolean; colors: ThemeColors; }

export function TripFormSection({ control, errors, lastOdometer, isDark, colors }: TripFormSectionProps) {
  return (
    <>
      <View style={styles.fieldsGroup}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Odometer Readings</Text>
        <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.odoHead}>
            <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>Start Odometer</Text>
            <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>Previous {lastOdometer} km</Text>
          </View>
          <Controller control={control} name="startOdometer" render={({ field: { onChange, value } }) => (
            <OdometerDigitInput label="Start Odometer" value={value} onChangeText={onChange} error={errors.startOdometer?.message as string | undefined} />
          )} />
        </View>
        <View style={[styles.odoPanel, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.odoHead}>
            <Text style={[styles.odoPanelLabel, { color: colors.textSecondary }]}>End Odometer</Text>
            <Text style={[styles.odoPanelHint, { color: colors.textSecondary }]}>Trip completion</Text>
          </View>
          <Controller control={control} name="endOdometer" render={({ field: { onChange, value } }) => (
            <OdometerDigitInput label="End Odometer" value={value} onChangeText={onChange} error={errors.endOdometer?.message as string | undefined} />
          )} />
        </View>
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