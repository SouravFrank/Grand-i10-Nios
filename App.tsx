import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAppInitialization } from '@/hooks/useAppInitialization';

function AppBootstrapper() {
  useAppInitialization();
  return <RootNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppBootstrapper />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
