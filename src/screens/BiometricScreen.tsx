import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { authenticateWithBiometric } from '@/services/auth/authService';
import { runSyncCycle } from '@/services/sync/syncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';

export function BiometricScreen() {
  const { colors } = useAppTheme();
  const unlockWithBiometric = useAppStore((state) => state.unlockWithBiometric);
  const fallbackToPassword = useAppStore((state) => state.fallbackToPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>BIOMETRIC UNLOCK</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Use fingerprint or Face ID.</Text>
        </View>

        {error ? <Text style={[styles.error, { color: colors.textSecondary }]}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label="TRY BIOMETRIC" onPress={() => void tryBiometric()} loading={loading} />
          <PrimaryButton label="USE PASSWORD" variant="secondary" onPress={fallbackToPassword} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
  },
  error: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  actions: {
    gap: 10,
  },
});
