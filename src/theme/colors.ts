export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  invertedBackground: string;
  invertedText: string;
  muted: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
};

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  card: '#FAFAFA',
  textPrimary: '#000000',
  textSecondary: '#555555',
  border: '#E0E0E0',
  invertedBackground: '#000000',
  invertedText: '#FFFFFF',
  muted: '#F5F5F5',
  primary: '#000000',
  success: '#000000',
  warning: '#555555',
  danger: '#555555',
};

export const darkColors: ThemeColors = {
  background: '#000000',
  backgroundSecondary: '#121212',
  card: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#BBBBBB',
  border: '#2A2A2A',
  invertedBackground: '#FFFFFF',
  invertedText: '#000000',
  muted: '#121212',
  primary: '#FFFFFF',
  success: '#FFFFFF',
  warning: '#BBBBBB',
  danger: '#BBBBBB',
};

// Backward compatibility for files still importing static colors.
export const colors = lightColors;
