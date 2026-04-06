import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type CarDisplayCardProps = {
  registrationText: string;
  subtitle: string;
  onPress: () => void;
  onLongPressRegistration?: () => void;
};

const carLeft = require('../../assets/images/carL.png');
const carRight = require('../../assets/images/carR.png');

export function CarDisplayCard({ registrationText, subtitle, onPress, onLongPressRegistration }: CarDisplayCardProps) {
  const { colors } = useAppTheme();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageSources = [carLeft, carRight] as const;
  const selectedImage = imageSources[selectedImageIndex];

  // Entrance animations
  const imageScale = useRef(new Animated.Value(0.85)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const textSlideY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Image switch animation
  const switchScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.spring(imageScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }),
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]),
      Animated.parallel([
        Animated.spring(textSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [imageScale, imageOpacity, textSlideY, textOpacity]);

  const switchImage = (direction: 'prev' | 'next') => {
    // Quick scale-down then back up on switch
    Animated.sequence([
      Animated.timing(switchScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(switchScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start();

    if (direction === 'prev') {
      setSelectedImageIndex((prev) => (prev - 1 + imageSources.length) % imageSources.length);
    } else {
      setSelectedImageIndex((prev) => (prev + 1) % imageSources.length);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.imagePressable,
          {
            transform: [{ scale: Animated.multiply(imageScale, switchScale) }],
            opacity: imageOpacity,
          },
        ]}
      >
        <View style={styles.imageRow}>
          <Pressable onPress={() => switchImage('prev')} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-left" size={26} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, styles.imageTapArea]}>
            <Image source={selectedImage} style={styles.image} />
          </Pressable>
          <Pressable onPress={() => switchImage('next')} style={styles.arrowBtn}>
            <MaterialIcons name="chevron-right" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Dots indicator */}
      <View style={styles.dotsRow}>
        {imageSources.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === selectedImageIndex ? colors.textPrimary : colors.border,
                width: i === selectedImageIndex ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View style={{ transform: [{ translateY: textSlideY }], opacity: textOpacity }}>
        <Pressable onLongPress={onLongPressRegistration} delayLongPress={250}>
          <Text style={[styles.registration, { color: colors.textPrimary }]}>{registrationText}</Text>
        </Pressable>
        <Text style={[styles.subMeta, { color: colors.textSecondary }]}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  imagePressable: {
    height: 246,
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
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -4,
    marginBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
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
