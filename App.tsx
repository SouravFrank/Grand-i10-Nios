import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAppInitialization } from '@/hooks/useAppInitialization';

function AppBootstrapper() {
  useAppInitialization();
  return <RootNavigator />;
}

export default function App() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AppBootstrapper />
        <AnimatedSplashOverlay />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
