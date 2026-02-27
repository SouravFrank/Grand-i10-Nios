import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { canUseBiometricAuth, authenticateWithPassword } from '@/services/auth/authService';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

const loginSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const { colors } = useAppTheme();
  const login = useAppStore((state) => state.login);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const user = await authenticateWithPassword(values.userId, values.password);

    if (!user) {
      setError('password', { message: 'Invalid credentials.' });
      return;
    }

    const biometricEnabled = await canUseBiometricAuth();

    await login({
      user: {
        id: user.id,
        name: user.name,
      },
      credentialHash: user.credentialHash,
      biometricEnabled,
    });

    void runSyncCycle();
  });

  return (
    <ScreenContainer>
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>GRAND i10 NIOS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Shared maintenance tracker</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Controller
            control={control}
            name="userId"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="User ID"
                value={value}
                onChangeText={onChange}
                placeholder="sourav"
                autoCapitalize="none"
                error={errors.userId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="Password"
                value={value}
                onChangeText={onChange}
                placeholder="Enter password"
                secureTextEntry
                autoCapitalize="none"
                error={errors.password?.message}
              />
            )}
          />

          <PrimaryButton label="LOGIN" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  form: {
    gap: 14,
    borderRadius: 2,
    borderWidth: 1,
    padding: 16,
  },
});
