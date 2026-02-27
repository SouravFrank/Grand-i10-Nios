import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type CarDisplayCardProps = {
  registrationText: string;
  onPress: () => void;
};

const carLight = require('../../assets/images/carL.png');
const carDark = require('../../assets/images/carR.png');

export function CarDisplayCard({ registrationText, onPress }: CarDisplayCardProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <View style={styles.imageWrap}>
        <Image source={isDark ? carLight : carDark} style={[styles.image, styles.backImage, { opacity: 0.38 }]} />
        <Image source={isDark ? carDark : carLight} style={styles.image} />
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>REGISTRATION</Text>
      <Text style={[styles.registration, { color: colors.textPrimary }]}>{registrationText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  imageWrap: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '96%',
    height: '100%',
    resizeMode: 'contain',
  },
  backImage: {
    position: 'absolute',
    transform: [{ translateX: 12 }, { translateY: -6 }],
  },
  caption: {
    fontSize: 11,
    letterSpacing: 1,
  },
  registration: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
