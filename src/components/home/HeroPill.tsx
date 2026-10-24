import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { colors, isDark } = useAppTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  const contentColor = outlined ? colors.textPrimary : colors.invertedText;
  // Slight blue sheen fading down from the top edge, per the home mockup.
  const sheenColors: [string, string] = isDark
    ? ['rgba(59, 130, 246, 0.12)', 'rgba(59, 130, 246, 0)']
    : ['#26355C', 'rgba(38, 53, 92, 0)'];

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
        {!outlined && (
          <LinearGradient
            pointerEvents="none"
            style={styles.heroPillSheen}
            colors={sheenColors}
            locations={[0, 0.55]}
          />
        )}
        <View style={styles.heroPillContent}>
          <MaterialCommunityIcons name={icon} size={24} color={contentColor} />
          <Text style={[styles.heroPillLabel, { color: contentColor }]}>{label}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={contentColor} style={styles.heroPillChevron} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroPill: {
    height: 66,
    borderRadius: 33,
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
  // Rounded to the pill radius so the sheen clips itself without putting
  // overflow:'hidden' on the pill, which would clip its own iOS shadow.
  heroPillSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 33,
  },
  heroPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPillLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroPillChevron: {
    position: 'absolute',
    right: 18,
  },
});
