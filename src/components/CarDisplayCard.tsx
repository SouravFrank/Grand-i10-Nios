import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type CarDisplayCardProps = {
  registrationText: string;
  subtitle: string;
  variant: string;
  onPress: () => void;
};

const carLeft = require('../../assets/images/carL.png');
const carRight = require('../../assets/images/carR.png');

export function CarDisplayCard({ registrationText, subtitle, variant, onPress }: CarDisplayCardProps) {
  const { colors } = useAppTheme();
  const [selectedImage, setSelectedImage] = useState<'left' | 'right'>('left');

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.imagePressable, { opacity: pressed ? 0.9 : 1 }]}>
        <Image source={selectedImage === 'left' ? carLeft : carRight} style={styles.image} />
      </Pressable>

      <View style={styles.switchRow}>
        <Pressable
          onPress={() => setSelectedImage('left')}
          style={[
            styles.switchButton,
            {
              borderColor: colors.border,
              backgroundColor: selectedImage === 'left' ? colors.backgroundSecondary : 'transparent',
            },
          ]}>
          <Text style={[styles.switchText, { color: colors.textPrimary }]}>CAR L</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedImage('right')}
          style={[
            styles.switchButton,
            {
              borderColor: colors.border,
              backgroundColor: selectedImage === 'right' ? colors.backgroundSecondary : 'transparent',
            },
          ]}>
          <Text style={[styles.switchText, { color: colors.textPrimary }]}>CAR R</Text>
        </Pressable>
      </View>

      <Text style={[styles.registration, { color: colors.textPrimary }]}>{registrationText}</Text>
      <Text style={[styles.subMeta, { color: colors.textSecondary }]}>{subtitle}</Text>
      <Text style={[styles.subMeta, { color: colors.textSecondary }]}>{variant}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  imagePressable: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'center',
  },
  switchButton: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  switchText: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  registration: {
    alignSelf: 'center',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subMeta: {
    alignSelf: 'center',
    fontSize: 12,
    letterSpacing: 0.35,
  },
});
