import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';
import type { AppUser } from '@/types/models';

import carAyan from '../../assets/images/car_Ayan.png';
import carSourav from '../../assets/images/car_Sourav.png';

type CarHeroImage = {
  accent: string;
  source: ImageSourcePropType;
  userId: string;
  userName: string;
};

const imageSources: readonly CarHeroImage[] = [
  { userId: 'sourav', userName: 'Sourav', source: carSourav, accent: '#8B5CF6' },
  { userId: 'ayan', userName: 'Ayan', source: carAyan, accent: '#0EA5E9' },
];

function getImageIndexForUser(user?: Pick<AppUser, 'id' | 'name'> | null) {
  const normalizedId = user?.id.trim().toLowerCase();
  const normalizedName = user?.name.trim().toLowerCase();
  const matchingIndex = imageSources.findIndex(
    (image) => image.userId === normalizedId || image.userName.toLowerCase() === normalizedName,
  );

  return matchingIndex >= 0 ? matchingIndex : 0;
}

type CarDisplayCardProps = {
  currentUser?: Pick<AppUser, 'id' | 'name'> | null;
  registrationText: string;
  subtitle: string;
  onPress: () => void;
  onLongPressRegistration?: () => void;
};

export function CarDisplayCard({
  currentUser,
  registrationText,
  subtitle,
  onPress,
  onLongPressRegistration,
}: CarDisplayCardProps) {
  const { colors } = useAppTheme();
  const [selectedImageIndex, setSelectedImageIndex] = useState(() => getImageIndexForUser(currentUser));
  const selectedImage = imageSources[selectedImageIndex];
  const welcomeName = currentUser?.name ?? selectedImage.userName;

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

  useEffect(() => {
    setSelectedImageIndex(getImageIndexForUser(currentUser));
  }, [currentUser?.id, currentUser?.name]);

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
          styles.heroFrame,
          { backgroundColor: colors.backgroundSecondary },
          {
            transform: [{ scale: Animated.multiply(imageScale, switchScale) }],
            opacity: imageOpacity,
          },
        ]}
      >
        <Pressable onPress={onPress} style={({ pressed }) => [styles.imageTapArea, { opacity: pressed ? 0.94 : 1 }]}>
          <Image source={selectedImage.source} style={styles.image} />
        </Pressable>

        <Svg pointerEvents="none" style={styles.topFade} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="carHeroTopFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.72" />
              <Stop offset="48%" stopColor="#000000" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#carHeroTopFade)" />
        </Svg>

        <Svg pointerEvents="none" style={styles.bottomFade} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="carHeroBottomFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.background} stopOpacity="0" />
              <Stop offset="44%" stopColor={colors.background} stopOpacity="0.28" />
              <Stop offset="76%" stopColor={colors.background} stopOpacity="0.82" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#carHeroBottomFade)" />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.welcomeOverlay,
            {
              opacity: textOpacity,
              transform: [{ translateY: textSlideY }],
            },
          ]}
        >
          <Text style={styles.welcomeText}>
            <Text style={styles.welcomePrefix}>Welcome </Text>
            {welcomeName}
          </Text>
          <View style={[styles.accentRule, { backgroundColor: 'white' }]} />
        </Animated.View>

        <View pointerEvents="none" style={styles.dissolveLines}>
          <View style={[styles.dissolveLine, styles.dissolveLineWide, { backgroundColor: 'white' }]} />
          <View style={[styles.dissolveLine, styles.dissolveLineShort, { backgroundColor: 'white' }]} />
        </View>

        <Pressable hitSlop={20} onPress={() => switchImage('prev')} style={[styles.arrowBtn, styles.leftArrow]}>
          <MaterialIcons name="chevron-left" size={18} color="#FFFFFF" />
        </Pressable>
        <Pressable hitSlop={20} onPress={() => switchImage('next')} style={[styles.arrowBtn, styles.rightArrow]}>
          <MaterialIcons name="chevron-right" size={18} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

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
    gap: 4,
  },
  heroFrame: {
    height: 286,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 26,
    // shadowColor: '#000000',
    // shadowOpacity: 0.16,
    // shadowRadius: 18,
    // shadowOffset: { width: 0, height: 10 },
    // elevation: 6,
  },
  imageTapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    height: '100%',
    resizeMode: 'cover',
    transform: [{ scale: 1.045 }],
    width: '100%',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 124,
  },
  bottomFade: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 142,
  },
  welcomeOverlay: {
    position: 'absolute',
    top: 18,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 6,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.65,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  kickerText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  welcomePrefix: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 18,
    fontWeight: '500',
  },
  accentRule: {
    width: 74,
    height: 2,
    borderRadius: 2,
    marginTop: 9,
    opacity: 0.9,
  },
  dissolveLines: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 20,
    alignItems: 'center',
    gap: 8,
    opacity: 0.34,
  },
  dissolveLine: {
    height: 1,
    borderRadius: 1,
  },
  dissolveLineWide: {
    width: '78%',
  },
  dissolveLineShort: {
    width: '38%',
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    width: 25,
    height: 25,
    marginTop: -12.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12.5,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -8,
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
