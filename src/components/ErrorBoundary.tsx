import { Component, ErrorInfo, ReactNode } from 'react';
import { Appearance, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { darkColors, lightColors } from '@/theme/colors';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App crashed', error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    const colors = Appearance.getColorScheme() === 'dark' ? darkColors : lightColors;

    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please restart the current flow.</Text>
        <PrimaryButton label="Try again" onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    minWidth: 150,
  },
});
