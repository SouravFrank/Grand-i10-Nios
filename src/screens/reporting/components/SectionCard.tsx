import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export function SectionCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
});
