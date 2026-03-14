import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

const SPLASH_DURATION_MS = 1050;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(220)} style={styles.overlay}>
      <Animated.View entering={ZoomIn.duration(340)} style={styles.brandPanel}>
        <View style={styles.iconFrame}>
          <Image contentFit="contain" source={require('@/assets/images/g-i10-App-icon.png')} style={styles.image} />
        </View>
        <Text style={styles.brandEyebrow}>HYUNDAI DRIVE LOG</Text>
        <Text style={styles.brandTitle}>Grand i10 Nios</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconFrame}>
      <Image contentFit="contain" source={require('@/assets/images/g-i10-App-icon.png')} style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPanel: {
    alignItems: 'center',
    gap: 14,
  },
  iconFrame: {
    width: 152,
    height: 152,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  image: {
    width: 112,
    height: 112,
  },
  brandEyebrow: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: '#777777',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#000000',
  },
});
