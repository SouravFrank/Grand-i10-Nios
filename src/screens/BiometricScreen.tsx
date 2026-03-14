import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { authenticateWithBiometric } from '@/services/auth/authService';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

export function BiometricScreen() {
  const { colors, isDark } = useAppTheme();
  const unlockWithBiometric = useAppStore((state) => state.unlockWithBiometric);
  const fallbackToPassword = useAppStore((state) => state.fallbackToPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const accentTone = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const ringTone = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';

  const tryBiometric = async () => {
    setLoading(true);
    setError(null);

    const success = await authenticateWithBiometric();
    setLoading(false);

    if (!success) {
      setError('Biometric verification failed.');
      return;
    }

    unlockWithBiometric();
    void runSyncCycle();
  };

  useEffect(() => {
    void tryBiometric();
  }, []);

  return (
    <ScreenContainer>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <View
            pointerEvents="none"
            style={[styles.orbTop, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.orbBottom, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)' }]}
          />

          <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.heroPill, { borderColor: colors.border, backgroundColor: accentTone }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.heroPillText, { color: colors.textPrimary }]}>Encrypted biometric sign-in</Text>
            </View>

            <View style={styles.fingerprintStage}>
              <View style={[styles.ringOuter, { borderColor: ringTone }]}>
                <View style={[styles.ringMiddle, { borderColor: ringTone }]}>
                  <View style={[styles.fingerprintCore, { backgroundColor: colors.textPrimary }]}>
                    <MaterialCommunityIcons name="fingerprint" size={58} color={colors.invertedText} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>BIOMETRIC UNLOCK</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Use your fingerprint or Face ID for a faster and more secure return to the dashboard.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.infoIcon, { backgroundColor: accentTone }]}>
                  <MaterialCommunityIcons name="flash-outline" size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Quick unlock</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>Open the app without typing your password.</Text>
              </View>

              <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.infoIcon, { backgroundColor: accentTone }]}>
                  <MaterialCommunityIcons name="cellphone-lock" size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Private on device</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>Your biometric confirmation stays on this device.</Text>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.error, { color: colors.textSecondary }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                label="SCAN FINGERPRINT"
                onPress={() => void tryBiometric()}
                loading={loading}
                style={styles.primaryAction}
              />
              <PrimaryButton
                label="USE PASSWORD"
                variant="secondary"
                onPress={fallbackToPassword}
                style={styles.secondaryAction}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  orbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -50,
    right: -70,
  },
  orbBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -10,
    left: -50,
  },
  heroCard: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: 30,
    padding: 22,
    gap: 20,
  },
  heroPill: {
    alignSelf: 'center',
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fingerprintStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMiddle: {
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintCore: {
    width: 118,
    height: 118,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  infoCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  error: {
    fontSize: 13,
    letterSpacing: 0.2,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  primaryAction: {
    height: 54,
    borderRadius: 18,
  },
  secondaryAction: {
    height: 52,
    borderRadius: 18,
  },
});
