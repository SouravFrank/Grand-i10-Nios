import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/useAppTheme';
import type { AppUser } from '@/types/models';

import carAyan from '../../assets/images/car_Ayan.png';
import carSourav from '../../assets/images/car_Sourav.png';

// Photo height measured from the status-bar inset down to the page background.
const HERO_BODY = 296;

type CarHeroImage = {
  source: ImageSourcePropType;
  userId: string;
  userName: string;
};

const imageSources: readonly CarHeroImage[] = [
  { userId: 'sourav', userName: 'Sourav', source: carSourav },
  { userId: 'ayan', userName: 'Ayan', source: carAyan },
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
  topInset: number;
  showBellDot: boolean;
  onPress: () => void;
  onLongPressRegistration?: () => void;
  onPressBell: () => void;
  onPressSettings: () => void;
};

export function CarDisplayCard({
  currentUser,
  registrationText,
  subtitle,
  topInset,
  showBellDot,
  onPress,
  onLongPressRegistration,
  onPressBell,
  onPressSettings,
}: CarDisplayCardProps) {
  const { colors } = useAppTheme();
  const [selectedImageIndex, setSelectedImageIndex] = useState(() => getImageIndexForUser(currentUser));
  const selectedImage = imageSources[selectedImageIndex];
  const welcomeName = currentUser?.name ?? selectedImage.userName;

  // Entrance animations
  const imageScale = useRef(new Animated.Value(0.9)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const textSlideY = useRef(new Animated.Value(18)).current;
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
      <View style={[styles.heroFrame, { height: topInset + HERO_BODY }]}>
        <Animated.View
          style={[
            styles.imageWrap,
            {
              transform: [{ scale: Animated.multiply(imageScale, switchScale) }, { translateY: -20 }],
              opacity: imageOpacity,
            },
          ]}
        >
          <Image source={selectedImage.source} style={styles.image} />
        </Animated.View>

        {/* White scrim so the dark status bar text and welcome copy stay legible over any photo */}
        <Svg pointerEvents="none" style={styles.topFade} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="homeHeroTopFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
              <Stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#homeHeroTopFade)" />
        </Svg>

        <Svg pointerEvents="none" style={styles.bottomFade} viewBox="0 0 100 110" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="homeHeroBottomFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.background} stopOpacity="0" />
              <Stop offset="42%" stopColor={colors.background} stopOpacity="0.26" />
              <Stop offset="74%" stopColor={colors.background} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#homeHeroBottomFade)" />
        </Svg>



        <Animated.View
          pointerEvents="none"
          style={[
            styles.welcomeBlock,
            { top: topInset + 24 },
            {
              opacity: textOpacity,
              transform: [{ translateY: textSlideY }],
            },
          ]}
        >
          <Text style={styles.welcomeKicker}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{welcomeName}</Text>
          <Text style={styles.welcomeTagline}>{"Let's track another\ngreat journey!"}</Text>
        </Animated.View>

        <Pressable hitSlop={20} onPress={() => switchImage('prev')} style={[styles.arrowBtn, styles.leftArrow]}>
          <MaterialIcons name="chevron-left" size={16} color="#FFFFFF" />
        </Pressable>
        <Pressable hitSlop={20} onPress={() => switchImage('next')} style={[styles.arrowBtn, styles.rightArrow]}>
          <MaterialIcons name="chevron-right" size={16} color="#FFFFFF" />
        </Pressable>

        {/* Frosted registration card straddling the hero's lower edge */}
        <View style={styles.plateCard}>
          <Pressable delayLongPress={250} onLongPress={onLongPressRegistration} onPress={onPress} style={styles.plateLeft}>
            <Text style={styles.plateNumber}>{registrationText}</Text>
            <View style={styles.plateSubRow}>
              <Text style={styles.plateSubtitle}>{subtitle}</Text>
            </View>
          </Pressable>
          <Pressable onPress={onPress} style={({ pressed }) => [styles.detailsPill, { opacity: pressed ? 0.85 : 1 }]}>
            <MaterialIcons name="directions-car" size={16} color="#0F1F3A" />
            <Text style={styles.detailsPillLabel}>View Details</Text>
            <MaterialIcons name="chevron-right" size={16} color="#0F1F3A" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  heroFrame: {
    width: '100%',
  },
  imageWrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  bottomFade: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 150,
  },
  headerRow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#0F1F3A',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  welcomeBlock: {
    position: 'absolute',
    left: 22,
    width: '72%',
  },
  welcomeKicker: {
    color: 'rgba(15,31,58,0.85)',
    fontSize: 21,
    fontWeight: '500',
  },
  welcomeName: {
    color: '#0F1F3A',
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: -4,
  },
  welcomeTagline: {
    color: 'rgba(15,31,58,0.68)',
    fontSize: 15,
    fontWeight: '500',
    // lineHeight: 21,
    marginTop: 8,
  },
  arrowBtn: {
    position: 'absolute',
    top: 208,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(15,31,58,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  leftArrow: {
    left: 12,
  },
  rightArrow: {
    right: 12,
  },
  plateCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F1F3A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  plateLeft: {
    flexShrink: 1,
  },
  plateNumber: {
    color: '#101828',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  plateSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  plateSubtitle: {
    color: 'rgba(15,31,58,0.65)',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 13,
    marginLeft: 10,
    shadowColor: '#0F1F3A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailsPillLabel: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '800',
  },
});
