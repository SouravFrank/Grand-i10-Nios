import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ComponentProps } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ALLOWED_USERS } from '@/constants/users';
import { authenticateWithPassword, canUseBiometricAuth } from '@/services/auth/authService';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

const loginSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;
type AuthInputIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AuthInputProps = {
  label: string;
  icon: AuthInputIcon;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  error?: string;
};

function AuthInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
}: AuthInputProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.fieldShell,
          {
            borderColor: error ? colors.textSecondary : colors.border,
            backgroundColor: colors.backgroundSecondary,
          },
        ]}>
        <View
          style={[
            styles.fieldIcon,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            },
          ]}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.textPrimary} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          style={[styles.fieldInput, { color: colors.textPrimary }]}
        />
      </View>
      {error ? <Text style={[styles.fieldError, { color: colors.textSecondary }]}>{error}</Text> : null}
    </View>
  );
}

export function LoginScreen() {
  const { colors, isDark } = useAppTheme();
  const login = useAppStore((state) => state.login);
  const userPlaceholder = ALLOWED_USERS.map((user) => user.id).join('/');
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const highlightTone = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)';

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
            <View
              pointerEvents="none"
              style={[styles.orbLarge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
            />
            <View
              pointerEvents="none"
              style={[styles.orbSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)' }]}
            />

            <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={[styles.heroTopRow, { backgroundColor: accentTone, borderColor: colors.border }]}>
                <View style={styles.heroBadge}>
                  <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.textPrimary} />
                  <Text style={[styles.heroBadgeText, { color: colors.textPrimary }]}>Secure fleet access</Text>
                </View>
                <View style={[styles.heroPill, { backgroundColor: highlightTone, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="road-variant" size={16} color={colors.textPrimary} />
                  <Text style={[styles.heroPillText, { color: colors.textPrimary }]}>Daily usage</Text>
                </View>
              </View>

              <View style={styles.header}>
                <View style={[styles.iconFrame, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Image
                    source={require('@/assets/images/g-i10-App-icon.png')}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>WELCOME IN</Text>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Grand i10 Nios</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Sign in to log trips, fuel, and expense activity with your assigned account.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.formHeader}>
                <Text style={[styles.formEyebrow, { color: colors.textSecondary }]}>USER LOGIN</Text>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Use your credentials</Text>
                <Text style={[styles.formText, { color: colors.textSecondary }]}>
                  Authorized IDs for this build: {userPlaceholder}
                </Text>
              </View>

              <Controller
                control={control}
                name="userId"
                render={({ field: { onChange, value } }) => (
                  <AuthInput
                    label="User ID"
                    icon="account-outline"
                    value={value}
                    onChangeText={onChange}
                    placeholder={userPlaceholder}
                    error={errors.userId?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <AuthInput
                    label="Password"
                    icon="lock-outline"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter password"
                    secureTextEntry
                    error={errors.password?.message}
                  />
                )}
              />

              <PrimaryButton
                label="LOGIN"
                onPress={onSubmit}
                loading={isSubmitting}
                style={styles.primaryAction}
              />
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
    gap: 22,
    paddingTop: 20,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  orbLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -40,
    right: -80,
  },
  orbSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: 12,
    left: -48,
  },
  heroCard: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 18,
  },
  heroTopRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  iconFrame: {
    width: 110,
    height: 110,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    overflow: 'hidden',
  },
  icon: {
    width: 110,
    height: 110,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  featureCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    gap: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    width: '100%',
    maxWidth: 430,
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  formHeader: {
    gap: 6,
  },
  formEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  formText: {
    fontSize: 13,
    lineHeight: 20,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldShell: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  fieldError: {
    fontSize: 12,
  },
  primaryAction: {
    height: 54,
    borderRadius: 18,
    marginTop: 4,
  },
});
