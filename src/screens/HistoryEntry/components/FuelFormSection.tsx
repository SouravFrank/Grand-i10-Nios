import { AppTextField } from '@/components/AppTextField';
import { OdometerDigitInput } from '@/components/OdometerDigitInput';
import { styles } from '@/screens/HistoryEntryScreen.styles';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';

const GRAND_I10_NIOS_TANK_CAPACITY_LITERS = 37;
type FuelFormData = { odometer: string; fuelAmount: string; fuelLiters: string; fullTank: boolean; };
interface FuelFormSectionProps { control: Control<FuelFormData>; errors: FieldErrors<FuelFormData>; lastOdometer: number; fullTankSelected: boolean; isDark: boolean; colors: any; }

export function FuelFormSection({ control, errors, lastOdometer, fullTankSelected, isDark, colors }: FuelFormSectionProps) {
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
        <View style={styles.metricsRow}>
          <View style={styles.metricField}>
            <Controller control={control} name="fuelAmount" render={({ field: { onChange, value } }) => (
              <AppTextField label="Amount (Rs)" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 2000" error={(errors as any).fuelAmount?.message} />
            )} />
          </View>
          <View style={styles.metricField}>
            <Controller control={control} name="fuelLiters" render={({ field: { onChange, value } }) => (
              <AppTextField label="Liters" value={value ?? ''} onChangeText={onChange} keyboardType="decimal-pad" placeholder="e.g. 24.6" error={(errors as any).fuelLiters?.message} editable={!fullTankSelected} />
            )} />
          </View>
        </View>
      </View>
      <View style={[styles.switchRow, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.switchCopy}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Full Tank</Text>
          <Text style={[styles.switchHint, { color: colors.textSecondary }]}>{GRAND_I10_NIOS_TANK_CAPACITY_LITERS} L for Grand i10 Nios</Text>
        </View>
        <Controller control={control} name="fullTank" render={({ field: { onChange, value } }) => (
          <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={value ? '#fff' : colors.textSecondary} />
        )} />
      </View>
    </>
  );
}