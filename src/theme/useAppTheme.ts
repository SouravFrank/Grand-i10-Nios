import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from '@/theme/colors';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colorScheme: isDark ? 'dark' : 'light',
    colors: isDark ? darkColors : lightColors,
  };
}
