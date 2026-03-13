import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';

import { AppTextField } from '@/components/AppTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
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
  const userPlaceholder = ALLOWED_USERS.map((user) => user.id).join('/');

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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.page}>
            <View style={styles.header}>
              <View style={[styles.iconFrame, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image
                  source={require('@/assets/images/g-i10-App-icon.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Grand i10 Nios</Text>
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
                    placeholder={userPlaceholder}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 28,
    paddingTop: 32,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    gap: 14,
  },
  iconFrame: {
    width: 164,
    height: 164,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  icon: {
    width: 124,
    height: 124,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
    borderRadius: 2,
    borderWidth: 1,
    padding: 16,
  },
});
