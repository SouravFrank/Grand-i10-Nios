import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BiometricScreen } from '@/screens/BiometricScreen';
import { FuelEntryScreen } from '@/screens/FuelEntryScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { StartingCarScreen } from '@/screens/StartingCarScreen';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import type { AppStackParamList, AuthStackParamList } from '@/navigation/types';

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Preparing your garage...</Text>
    </View>
  );
}

function AuthNavigator({ biometric }: { biometric: boolean }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {biometric ? <AuthStack.Screen name="Biometric" component={BiometricScreen} /> : null}
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: 'Grand i10 Nios' }} />
      <AppStack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <AppStack.Screen
        name="StartingCarModal"
        component={StartingCarScreen}
        options={{ title: 'Starting the Car', presentation: 'modal' }}
      />
      <AppStack.Screen
        name="FuelEntryModal"
        component={FuelEntryScreen}
        options={{ title: 'Fuel Entry', presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const authStatus = useAppStore((state) => state.authStatus);
  const biometricEnabled = useAppStore((state) => state.biometricEnabled);

  return (
    <NavigationContainer>
      {authStatus === 'booting' ? <LoadingScreen /> : null}
      {authStatus === 'unauthenticated' ? <AuthNavigator biometric={false} /> : null}
      {authStatus === 'biometric' ? <AuthNavigator biometric={biometricEnabled} /> : null}
      {authStatus === 'authenticated' ? <MainNavigator /> : null}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
