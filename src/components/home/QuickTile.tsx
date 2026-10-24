import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { usePressScale } from './usePressScale';

type QuickTileProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  solid: string;
  tint: string;
  onPress: () => void;
};

// ─── Colored quick-action tile ───────────────────────────────────────────────
export function QuickTile({ title, subtitle, icon, solid, tint, onPress }: QuickTileProps) {
  const { colors } = useAppTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Animated.View style={[styles.tile, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.tileInner,
          { backgroundColor: tint, opacity: pressed ? 0.9 : 1 },
        ]}>
        <View style={[styles.tileIcon, { backgroundColor: solid }]}>
          <MaterialCommunityIcons name={icon} size={21} color="#FFFFFF" />
        </View>
        <View style={styles.tileText}>
          <Text
            style={[styles.tileTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}>
            {title}
          </Text>
          <Text
            style={[styles.tileSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {subtitle}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  tileInner: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 76,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  tileTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  tileSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
});
