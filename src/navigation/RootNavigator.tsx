import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { BiometricScreen } from '@/screens/BiometricScreen';
import { FuelEntryScreen } from '@/screens/FuelEntryScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { StartingCarScreen } from '@/screens/StartingCarScreen';
import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/theme/useAppTheme';
import type { AppStackParamList, AuthStackParamList } from '@/navigation/types';

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function LoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.skeletonLarge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]} />
      <View style={[styles.skeletonRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]} />
      <View style={[styles.skeletonRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]} />
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
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="History" component={HistoryScreen} />
      <AppStack.Screen
        name="StartingCarModal"
        component={StartingCarScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <AppStack.Screen
        name="FuelEntryModal"
        component={FuelEntryScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const authStatus = useAppStore((state) => state.authStatus);
  const biometricEnabled = useAppStore((state) => state.biometricEnabled);
  const navigationTheme: NavigationTheme = {
    ...(isDark ? NavigationDarkTheme : NavigationLightTheme),
    colors: {
      ...(isDark ? NavigationDarkTheme.colors : NavigationLightTheme.colors),
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.textPrimary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonLarge: {
    height: 42,
    width: '62%',
    borderWidth: 1,
    borderRadius: 2,
  },
  skeletonRow: {
    height: 52,
    width: '100%',
    borderWidth: 1,
    borderRadius: 2,
  },
});
