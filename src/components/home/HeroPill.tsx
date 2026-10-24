import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { usePressScale } from './usePressScale';

type HeroPillProps = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  outlined?: boolean;
};

// ─── Big pill CTA (START/END TRIP) ───────────────────────────────────────────
export function HeroPill({ label, icon, onPress, outlined = false }: HeroPillProps) {
  const { colors } = useAppTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  const contentColor = outlined ? colors.textPrimary : colors.invertedText;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.heroPill,
          outlined && styles.heroPillOutlined,
          {
            backgroundColor: outlined ? colors.card : colors.invertedBackground,
            opacity: pressed ? 0.92 : 1,
          },
        ]}>
        <View style={styles.heroPillContent}>
          <MaterialCommunityIcons name={icon} size={22} color={contentColor} />
          <Text style={[styles.heroPillLabel, { color: contentColor }]}>{label}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={contentColor} style={styles.heroPillChevron} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroPill: {
    height: 62,
    borderRadius: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroPillOutlined: {
    borderWidth: 1.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  heroPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPillLabel: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroPillChevron: {
    position: 'absolute',
    right: 18,
  },
});
