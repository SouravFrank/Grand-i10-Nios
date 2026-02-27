import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/theme/useAppTheme';

type CarDisplayCardProps = {
  registrationText: string;
  subtitle: string;
  onPress: () => void;
};

const carLeft = require('../../assets/images/carL.png');
const carRight = require('../../assets/images/carR.png');

export function CarDisplayCard({ registrationText, subtitle, onPress }: CarDisplayCardProps) {
  const { colors } = useAppTheme();
  const [selectedImage, setSelectedImage] = useState<'left' | 'right'>('left');

  return (
    <View style={styles.wrapper}>
      <View style={styles.imagePressable}>
        <View style={styles.imageRow}>
          <Pressable onPress={() => setSelectedImage('left')} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-left" size={26} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, styles.imageTapArea]}>
            <Image source={selectedImage === 'left' ? carLeft : carRight} style={styles.image} />
          </Pressable>
          <Pressable onPress={() => setSelectedImage('right')} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-right" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.registration, { color: colors.textPrimary }]}>{registrationText}</Text>
      <Text style={[styles.subMeta, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  imagePressable: {
    height: 220,
    width: '100%',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageTapArea: {
    width: '82%',
    height: '100%',
  },
  registration: {
    alignSelf: 'center',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subMeta: {
    alignSelf: 'center',
    fontSize: 12,
    letterSpacing: 0.35,
  },
});
