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
import { colors } from '@/theme/colors';

const loginSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
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
          <Text style={styles.title}>Grand i10 Nios</Text>
          <Text style={styles.subtitle}>Shared maintenance tracker for two users.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="userId"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label="User ID"
                value={value}
                onChangeText={onChange}
                placeholder="owner"
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

          <PrimaryButton label="Login" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    gap: 22,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  form: {
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
});
